using Microsoft.AspNetCore.Http.HttpResults;
using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;
using Tracker.Infrastructure.Data;

namespace Tracker.Features.Jobs;

public static class JobEndpoints
{
    private const int HighMatchScore = 80;

    public static IEndpointRouteBuilder MapJobEndpoints(this IEndpointRouteBuilder app)
    {
        var jobs = app.MapGroup("/api/jobs");

        jobs.MapPost("/import", ImportAsync);
        jobs.MapGet("/", GetJobsAsync);
        jobs.MapGet("/metrics", GetMetricsAsync);
        jobs.MapGet("/boards", GetBoardsAsync);
        jobs.MapGet("/{id:long}", GetJobAsync);
        jobs.MapPatch("/{id:long}/status", UpdateStatusAsync);
        jobs.MapPost("/{id:long}/cover-letter", GenerateCoverLetterAsync);
        jobs.MapPost("/{id:long}/resume", GenerateResumeAsync);

        return app;
    }

    private static Task<ImportResult> ImportAsync(
        List<ImportJobRequest> jobs,
        [FromServices] IJobImportService importer,
        CancellationToken ct) => importer.ImportAsync(jobs, ct);

    private static async Task<PagedResult<JobListItem>> GetJobsAsync(
        [AsParameters] JobFilter filter,
        [FromServices] TrackerDbContext db,
        CancellationToken ct)
    {
        var page = Math.Max(filter.Page, 1);
        var size = Math.Clamp(filter.PageSize, 1, 100);

        var query = db.Jobs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Company))
        {
            var company = filter.Company.Trim();
            query = query.Where(j => EF.Functions.Like(j.Company, $"%{company}%"));
        }

        if (filter.Status is { } status) query = query.Where(j => j.Status == status);
        if (filter.MinScore is { } minScore) query = query.Where(j => j.MatchScore >= minScore);
        if (filter.From is { } from) query = query.Where(j => j.PostedDate >= from);
        if (filter.To is { } to) query = query.Where(j => j.PostedDate <= to);

        if (!string.IsNullOrWhiteSpace(filter.Board))
        {
            var board = filter.Board.Trim();
            query = query.Where(j => j.JobBoard == board);
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(j => j.PostedDate)
            .ThenByDescending(j => j.Id)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(j => new JobListItem(j.Id, j.JobTitle, j.Company, j.Location, j.JobBoard, j.JobUrl,
                j.MatchScore, j.ResumeVersion, j.Status, j.PostedDate, j.AppliedAt, j.InterviewAt))
            .ToListAsync(ct);

        return new PagedResult<JobListItem>(items, total, page, size);
    }

    private static async Task<JobMetrics> GetMetricsAsync([FromServices] TrackerDbContext db, CancellationToken ct)
    {
        // One user tracks a few thousand rows at most, so a single small read beats seven count queries.
        var jobs = await db.Jobs.AsNoTracking().Select(j => new { j.Status, j.MatchScore }).ToListAsync(ct);

        return new JobMetrics(
            Total: jobs.Count,
            Pending: jobs.Count(j => j.Status == JobStatus.Pending),
            Applied: jobs.Count(j => j.Status == JobStatus.Applied),
            Interviewing: jobs.Count(j => j.Status == JobStatus.Interviewing),
            HighMatch: jobs.Count(j => j.MatchScore >= HighMatchScore),
            ActionNeeded: jobs.Count(j => j.MatchScore >= HighMatchScore && j.Status == JobStatus.Pending),
            AverageScore: jobs.Count == 0 ? 0 : (int)Math.Round(jobs.Average(j => j.MatchScore)));
    }

    private static Task<List<string>> GetBoardsAsync([FromServices] TrackerDbContext db, CancellationToken ct) =>
        db.Jobs.AsNoTracking().Select(j => j.JobBoard).Distinct().OrderBy(board => board).ToListAsync(ct);

    private static async Task<Results<Ok<JobDetail>, NotFound>> GetJobAsync(
        long id,
        [FromServices] TrackerDbContext db,
        CancellationToken ct)
    {
        var job = await db.Jobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id, ct);

        return job is null ? TypedResults.NotFound() : TypedResults.Ok(ToDetail(job));
    }

    private static async Task<Results<Ok<JobDetail>, NotFound>> UpdateStatusAsync(
        long id,
        UpdateTrackingRequest request,
        [FromServices] TrackerDbContext db,
        CancellationToken ct)
    {
        var job = await db.Jobs.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (job is null) return TypedResults.NotFound();

        job.Status = request.Status;
        job.AppliedAt = ToTimestamp(request.AppliedOn);
        job.InterviewAt = ToTimestamp(request.InterviewOn);

        // Applying happens now, so that date can be filled in. An interview is booked for a day
        // only the user knows, so it is never guessed.
        if (job.Status is JobStatus.Applied && job.AppliedAt is null) job.AppliedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

        return TypedResults.Ok(ToDetail(job));
    }

    private static Task<Results<Ok<JobDetail>, NotFound>> GenerateCoverLetterAsync(
        long id,
        bool? regenerate,
        [FromServices] TrackerDbContext db,
        [FromServices] IJobAiService ai,
        CancellationToken ct) =>
        GenerateAsync(id, db, ct,
            job => string.IsNullOrWhiteSpace(job.CoverLetter) || regenerate is true,
            async job => job.CoverLetter = await ai.WriteCoverLetterAsync(job, ct));

    private static Task<Results<Ok<JobDetail>, NotFound>> GenerateResumeAsync(
        long id,
        bool? regenerate,
        [FromServices] TrackerDbContext db,
        [FromServices] IJobAiService ai,
        CancellationToken ct) =>
        GenerateAsync(id, db, ct,
            job => job.Tailored is null || regenerate is true,
            async job => job.Tailored = await ai.WriteTailoredResumeAsync(job, ct));

    /// <summary>Writes generated content onto a job once, then serves it from the database until asked to redo it.</summary>
    private static async Task<Results<Ok<JobDetail>, NotFound>> GenerateAsync(
        long id,
        TrackerDbContext db,
        CancellationToken ct,
        Func<Job, bool> isMissing,
        Func<Job, Task> generate)
    {
        var job = await db.Jobs.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (job is null) return TypedResults.NotFound();

        if (isMissing(job))
        {
            await generate(job);
            await db.SaveChangesAsync(ct);
        }

        return TypedResults.Ok(ToDetail(job));
    }

    private static DateTimeOffset? ToTimestamp(DateOnly? date) =>
        date is { } value ? new DateTimeOffset(value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero) : null;

    private static JobDetail ToDetail(Job job) => new(
        job.Id, job.JobTitle, job.Company, job.Location, job.JobBoard, job.JobUrl, job.Description,
        job.MatchScore, job.ResumeVersion, job.Status, job.PostedDate, job.CreatedAt, job.AppliedAt,
        job.InterviewAt, job.Analysis, job.CoverLetter, job.Tailored);
}
