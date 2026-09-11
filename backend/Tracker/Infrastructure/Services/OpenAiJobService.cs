using OpenAI.Chat;
using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;

namespace Tracker.Infrastructure.Services;

public sealed class OpenAiJobService(ChatClient chatgpt, PromptStore prompts, ILogger<OpenAiJobService> logger) : IJobAiService
{
    private const string FullStack = "Full Stack";

    public Task<JobAnalysisResult?> AnalyzeAsync(ImportJobRequest job, CancellationToken ct) =>
        chatgpt.CompleteJsonAsync<JobAnalysisResult>(
            prompts.Get("AnalysisPrompt").Render(
                ("CV_BACKEND", prompts.Get("cv")),
                ("CV_FULLSTACK", prompts.Get("cv_f")),
                ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Text()))),
            logger, ct);

    public Task<string> WriteCoverLetterAsync(Job job, CancellationToken ct) =>
        chatgpt.CompleteTextAsync(
            prompts.Get("CoverLetterPrompt").Render(
                ("CV", ResumeFor(job)),
                ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description))),
            ct);

    public Task<TailoredResume?> WriteTailoredResumeAsync(Job job, CancellationToken ct) =>
        chatgpt.CompleteJsonAsync<TailoredResume>(
            prompts.Get("TailoredResumePrompt").Render(
                ("CV", ResumeFor(job)),
                ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description)),
                ("MISSING_KEYWORDS", string.Join(", ", job.Analysis.MissingKeywords))),
            logger, ct);

    /// <summary>The analysis already picked which of the two resume versions fits this posting.</summary>
    private string ResumeFor(Job job) => prompts.Get(job.ResumeVersion == FullStack ? "cv_f" : "cv");

    private static string Describe(string title, string company, string? location, string description) =>
        $"""
         Job title: {title}
         Company: {company}
         Location: {location}

         {description}
         """;
}
