using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;

namespace Tracker.Infrastructure.Services;

public sealed partial class ProviderAgnosticJobService(
    IChatClient aiClient,
    PromptStore prompts,
    PromptComposer composer,
    ISettingsService settings,
    IResumeService resumes,
    ILogger<ProviderAgnosticJobService> logger) : IJobAiService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
        TypeInfoResolver = new System.Text.Json.Serialization.Metadata.DefaultJsonTypeInfoResolver()
    };

    [GeneratedRegex(@"<think>[\s\S]*?</think>", RegexOptions.IgnoreCase)]
    private static partial Regex ThinkingBlock();

    public async Task<JobAnalysisResult?> AnalyzeAsync(ImportJobRequest job, CancellationToken ct)
    {
        var criteria = settings.GetCriteria();
        var activeResumes = await resumes.GetActiveResumesAsync(ct);
        var prompt = composer.ComposeAnalysisPrompt(job.JobTitle, job.Company, job.Location, job.Text(), criteria, activeResumes);

        logger.LogInformation("Sending '{JobTitle}' at '{Company}' to AI for analysis...", job.JobTitle, job.Company);

        var response = await aiClient.GetResponseAsync<JobAnalysisResult>(
            prompt,
            serializerOptions: JsonOptions,
            cancellationToken: ct);

        var rawText = response.Text;
        logger.LogInformation("AI raw response for '{JobTitle}' at '{Company}':\n{RawText}", job.JobTitle, job.Company, rawText);

        var result = response.Result;

        // If structured output was null or could not be deserialized by MEAI directly, try fallback extraction
        if (result is null && !string.IsNullOrWhiteSpace(rawText))
        {
            result = TryExtractJson<JobAnalysisResult>(rawText, job.JobTitle);
        }

        if (result is not null)
        {
            logger.LogInformation(
                "AI evaluated '{JobTitle}' at '{Company}': ShouldApply={ShouldApply}, Score={Score}/100, Version={Version}, Reason={Reason}",
                job.JobTitle, job.Company, result.ShouldApply, result.Score, result.ResumeVersion, result.Reason);
        }
        else
        {
            logger.LogWarning("Failed to extract or deserialize JobAnalysisResult for '{JobTitle}'. Raw response was empty or unparseable.", job.JobTitle);
        }

        return result;
    }

    public async Task<string> WriteCoverLetterAsync(Job job, CancellationToken ct)
    {
        var resumeText = await resumes.GetResumeTextAsync(job.ResumeVersion, ct);
        var confirmedSkillsText = job.ConfirmedSkills.Count > 0
            ? string.Join(", ", job.ConfirmedSkills)
            : "None specified.";
        var notesText = !string.IsNullOrWhiteSpace(job.TailoringNotes)
            ? job.TailoringNotes
            : "None provided.";

        var prompt = prompts.Get("CoverLetterPrompt").Render(
            ("CV", resumeText),
            ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description)),
            ("CONFIRMED_SKILLS", confirmedSkillsText),
            ("USER_NOTES", notesText)
        );

        logger.LogInformation("Generating cover letter for job #{Id} ('{JobTitle}' at '{Company}')...", job.Id, job.JobTitle, job.Company);

        var response = await aiClient.GetResponseAsync(prompt, cancellationToken: ct);
        var text = response.Text ?? string.Empty;

        logger.LogInformation("Cover letter generated for job #{Id} ({Length} chars):\n{CoverLetter}", job.Id, text.Length, text);
        return text;
    }

    public async Task<TailoredResume?> WriteTailoredResumeAsync(Job job, string? mode = null, CancellationToken ct = default)
    {
        var resumeText = await resumes.GetResumeTextAsync(job.ResumeVersion, ct);
        var confirmedSkillsText = job.ConfirmedSkills.Count > 0
            ? string.Join(", ", job.ConfirmedSkills)
            : "None specified.";
        var notesText = !string.IsNullOrWhiteSpace(job.TailoringNotes)
            ? job.TailoringNotes
            : "None provided.";

        var isRefining = job.Tailored is not null && !string.Equals(mode, "fresh", StringComparison.OrdinalIgnoreCase);

        string prompt;
        var existingSummary = job.Tailored?.Summary ?? job.Analysis.TailoredSummary ?? string.Empty;

        if (isRefining)
        {
            var currentDraftJson = JsonSerializer.Serialize(job.Tailored, JsonOptions);
            prompt = prompts.Get("RefineTailoredResumePrompt").Render(
                ("CV", resumeText),
                ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description)),
                ("CURRENT_DRAFT", currentDraftJson),
                ("MISSING_KEYWORDS", string.Join(", ", job.Analysis.MissingKeywords)),
                ("CONFIRMED_SKILLS", confirmedSkillsText),
                ("USER_NOTES", notesText)
            );
            logger.LogInformation("Refining existing tailored resume draft for job #{Id} ('{JobTitle}' at '{Company}')...", job.Id, job.JobTitle, job.Company);
        }
        else
        {
            prompt = prompts.Get("TailoredResumePrompt").Render(
                ("CV", resumeText),
                ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description)),
                ("MISSING_KEYWORDS", string.Join(", ", job.Analysis.MissingKeywords)),
                ("CONFIRMED_SKILLS", confirmedSkillsText),
                ("USER_NOTES", notesText),
                ("INITIAL_SUMMARY", existingSummary)
            );
            logger.LogInformation("Generating fresh tailored resume for job #{Id} ('{JobTitle}' at '{Company}')...", job.Id, job.JobTitle, job.Company);
        }

        var response = await aiClient.GetResponseAsync<TailoredResume>(
            prompt,
            serializerOptions: JsonOptions,
            cancellationToken: ct);

        var rawText = response.Text;
        logger.LogInformation("AI raw tailored resume response for job #{Id}:\n{RawText}", job.Id, rawText);

        var result = response.Result;
        if (result is null && !string.IsNullOrWhiteSpace(rawText))
        {
            result = TryExtractJson<TailoredResume>(rawText, $"Resume for job #{job.Id}");
        }

        if (result is not null && string.IsNullOrWhiteSpace(result.Summary))
        {
            // Fall back to existing summary if model didn't return one
            result.Summary = existingSummary;
        }

        return result;
    }

    private T? TryExtractJson<T>(string raw, string context) where T : class
    {
        try
        {
            // Remove <think>...</think> reasoning tags if emitted by reasoning models
            var cleaned = ThinkingBlock().Replace(raw, string.Empty).Trim();

            // Find JSON start and end
            var start = cleaned.IndexOf('{');
            var end = cleaned.LastIndexOf('}');
            if (start >= 0 && end > start)
            {
                cleaned = cleaned[start..(end + 1)];
            }

            var parsed = JsonSerializer.Deserialize<T>(cleaned, JsonOptions);
            if (parsed is not null)
            {
                logger.LogInformation("Successfully recovered JSON using fallback parser for {Context}.", context);
                return parsed;
            }
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Fallback JSON parsing failed for {Context}. Raw text was:\n{Raw}", context, raw);
        }

        return null;
    }

    private string ResumeFor(Job job) => prompts.GetResume(job.ResumeVersion);

    private static string Describe(string title, string company, string? location, string description) =>
        $"""
         Job title: {title}
         Company: {company}
         Location: {location}

         {description}
         """;
}

