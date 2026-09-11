using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;
using Tracker.Infrastructure.Data;

namespace Tracker.Infrastructure.Services;

public sealed class JobImportService(
    TrackerDbContext db,
    IJobAiService ai,
    CompanyBlacklist blacklist,
    ILogger<JobImportService> logger) : IJobImportService
{
    private const int MaxConcurrentAnalyses = 5;

    public async Task<ImportResult> ImportAsync(IReadOnlyList<ImportJobRequest> jobs, CancellationToken ct)
    {
        var knownUrls = await db.Jobs.Select(j => j.JobUrl).ToHashSetAsync(ct);

        int duplicates = 0, blacklisted = 0, failed = 0;
        var candidates = new List<ImportJobRequest>();

        foreach (var job in jobs)
        {
            if (string.IsNullOrWhiteSpace(job.JobUrl) || string.IsNullOrWhiteSpace(job.Company) || job.Text().Length == 0)
            {
                failed++;
            }
            else if (!knownUrls.Add(job.JobUrl.Trim()))
            {
                duplicates++; // Already tracked, or repeated within this file.
            }
            else if (blacklist.IsBlacklisted(job.Company))
            {
                blacklisted++;
            }
            else
            {
                candidates.Add(job);
            }
        }

        // The AI service never touches the DbContext, so these calls are safe to run in parallel.
        using var gate = new SemaphoreSlim(MaxConcurrentAnalyses);
        var results = await Task.WhenAll(candidates.Select(job => AnalyzeAsync(job, gate, ct)));

        var saved = results.Where(r => r.Job is not null).Select(r => r.Job!).ToList();
        failed += results.Count(r => r.Failed);

        if (saved.Count > 0)
        {
            db.Jobs.AddRange(saved);
            await db.SaveChangesAsync(ct);
        }

        return new ImportResult(
            Total: jobs.Count,
            Saved: saved.Count,
            Duplicates: duplicates,
            Blacklisted: blacklisted,
            Rejected: results.Length - saved.Count - results.Count(r => r.Failed),
            Failed: failed);
    }

    private async Task<(Job? Job, bool Failed)> AnalyzeAsync(ImportJobRequest request, SemaphoreSlim gate, CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try
        {
            var analysis = await ai.AnalyzeAsync(request, ct);
            if (analysis is null)
            {
                logger.LogWarning("AI analysis returned null for '{JobTitle}' ({JobUrl}) - Marked as FAILED.", request.JobTitle, request.JobUrl);
                return (null, true);
            }

            if (!analysis.ShouldApply)
            {
                logger.LogInformation(
                    "AI rejected '{JobTitle}' at '{Company}' (Score: {Score}/100, Reason: {Reason}) - Dropping from import.",
                    request.JobTitle, request.Company, analysis.Score, analysis.Reason);
                return (null, false);
            }

            logger.LogInformation(
                "AI approved '{JobTitle}' at '{Company}' (Score: {Score}/100) - Queued for database save.",
                request.JobTitle, request.Company, analysis.Score);
            return (ToJob(request, analysis), false);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Could not analyze '{JobTitle}' ({JobUrl})", request.JobTitle, request.JobUrl);
            return (null, true);
        }
        finally
        {
            gate.Release();
        }
    }

    private static Job ToJob(ImportJobRequest request, JobAnalysisResult analysis)
    {
        var status = Enum.TryParse<JobStatus>(request.Status, ignoreCase: true, out var parsed) ? parsed : JobStatus.Pending;
        var now = DateTimeOffset.UtcNow;

        return new Job
        {
            JobTitle = request.JobTitle.Trim(),
            Company = request.Company.Trim(),
            Location = request.Location?.Trim() ?? string.Empty,
            JobUrl = request.JobUrl.Trim(),
            JobBoard = string.IsNullOrWhiteSpace(request.JobBoard) ? JobBoards.FromUrl(request.JobUrl) : request.JobBoard.Trim(),
            Description = request.Text(),
            PostedDate = RelativeDate.Parse(request.Date),
            MatchScore = Math.Clamp(analysis.Score, 0, 100),
            ResumeVersion = analysis.ResumeVersion?.Trim() ?? string.Empty,
            Status = status,
            CreatedAt = now,
            AppliedAt = status is JobStatus.Applied ? now : null,
            Analysis = new JobAnalysis
            {
                Reason = analysis.Reason ?? string.Empty,
                TailoredSummary = analysis.TailoredSummary ?? string.Empty,
                SponsorshipNote = analysis.SponsorshipNote ?? string.Empty,
                MatchingStrengths = analysis.MatchingStrengths ?? [],
                MissingKeywords = analysis.MissingKeywords ?? []
            }
        };
    }
}
