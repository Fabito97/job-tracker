using Google.GenAI;
using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;

namespace Tracker.Infrastructure.Services;

public sealed class GeminiJobService(Client gemini, PromptStore prompts, ILogger<GeminiJobService> logger, IConfiguration config) : IJobAiService
{
    private const string FullStack = "Full Stack";
    private readonly string _model = config["Gemini:Model"] ?? "gemini-2.5-flash";

    public Task<JobAnalysisResult?> AnalyzeAsync(ImportJobRequest job, CancellationToken ct) =>
        gemini.CompleteJsonAsync<JobAnalysisResult>(
            _model,
            prompts.Get("AnalysisPrompt").Render(
                ("CV_BACKEND", prompts.Get("cv")),
                ("CV_FULLSTACK", prompts.Get("cv_f")),
                ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Text()))),
            logger, ct);

    public Task<string> WriteCoverLetterAsync(Job job, CancellationToken ct) =>
        gemini.CompleteTextAsync(
            _model,
            prompts.Get("CoverLetterPrompt").Render(
                ("CV", ResumeFor(job)),
                ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description))),
            ct);

    public Task<TailoredResume?> WriteTailoredResumeAsync(Job job, CancellationToken ct) =>
        gemini.CompleteJsonAsync<TailoredResume>(
            _model,
            prompts.Get("TailoredResumePrompt").Render(
                ("CV", ResumeFor(job)),
                ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description)),
                ("MISSING_KEYWORDS", string.Join(", ", job.Analysis.MissingKeywords))),
            logger, ct);

    private string ResumeFor(Job job) => prompts.Get(job.ResumeVersion == FullStack ? "cv_f" : "cv");

    private static string Describe(string title, string company, string? location, string description) =>
        $"""
         Job title: {title}
         Company: {company}
         Location: {location}

         {description}
         """;
}
