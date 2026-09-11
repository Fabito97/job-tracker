using Microsoft.Extensions.AI;
using System.Text.Json;
using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;

namespace Tracker.Infrastructure.Services;

// 🧠 Change the constructor parameter from Google's Client to .NET's IChatClient interface
public sealed class ProviderAgnosticJobService(IChatClient aiClient, PromptStore prompts) : IJobAiService
{
    private const string FullStack = "Full Stack";
    private static readonly JsonSerializerOptions JsonOptions = new() 
{ 
    PropertyNameCaseInsensitive = true,
    // Add this line to supply standard reflection capabilities to the serializer
    TypeInfoResolver = new System.Text.Json.Serialization.Metadata.DefaultJsonTypeInfoResolver()
};


    public async Task<JobAnalysisResult?> AnalyzeAsync(ImportJobRequest job, CancellationToken ct)
    {
        var prompt = prompts.Get("AnalysisPrompt").Render(
            ("CV_BACKEND", prompts.Get("cv")),
            ("CV_FULLSTACK", prompts.Get("cv_f")),
            ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Text()))
        );

        var response = await aiClient.GetResponseAsync<JobAnalysisResult>(
            prompt, 
            serializerOptions: JsonOptions, 
            cancellationToken: ct);
            
        return response.Result;
    }

    public async Task<string> WriteCoverLetterAsync(Job job, CancellationToken ct)
    {
        var prompt = prompts.Get("CoverLetterPrompt").Render(
            ("CV", ResumeFor(job)),
            ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description))
        );

        var response = await aiClient.GetResponseAsync(prompt, cancellationToken: ct);
        return response.Text ?? string.Empty;
    }

    public async Task<TailoredResume?> WriteTailoredResumeAsync(Job job, CancellationToken ct)
    {
        var prompt = prompts.Get("TailoredResumePrompt").Render(
            ("CV", ResumeFor(job)),
            ("JOB", Describe(job.JobTitle, job.Company, job.Location, job.Description)),
            ("MISSING_KEYWORDS", string.Join(", ", job.Analysis.MissingKeywords))
        );

        var response = await aiClient.GetResponseAsync<TailoredResume>(
            prompt, 
            serializerOptions: JsonOptions, 
            cancellationToken: ct);
            
        return response.Result;
    }

    private string ResumeFor(Job job) => prompts.Get(job.ResumeVersion == FullStack ? "cv_f" : "cv");

    private static string Describe(string title, string company, string? location, string description) =>
        $"""
         Job title: {title}
         Company: {company}
         Location: {location}

         {description}
         """;
}
