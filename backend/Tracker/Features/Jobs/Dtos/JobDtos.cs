namespace Tracker.Features.Jobs.Dtos;

/// <summary>One entry of the imported jobs.json file.</summary>
public class ImportJobRequest
{
    public string JobTitle { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? Date { get; set; }
    public string? Status { get; set; }
    public string JobUrl { get; set; } = string.Empty;
    public string? JobBoard { get; set; }
    public string? JobDescription { get; set; }

    /// <summary>Alias so exports that name the field "description" import unchanged.</summary>
    public string? Description { get; set; }

    public string Text() => (JobDescription ?? Description ?? string.Empty).Trim();
}

public record ImportResult(int Total, int Saved, int Duplicates, int Blacklisted, int Rejected, int Failed);

/// <summary>Shape the model is asked to return for a single job.</summary>
public class JobAnalysisResult
{
    public bool ShouldApply { get; set; }
    public int Score { get; set; }
    public string? ResumeVersion { get; set; }
    public string? Reason { get; set; }
    public string? TailoredSummary { get; set; }
    public string? SponsorshipNote { get; set; }
    public List<string>? MatchingStrengths { get; set; }
    public List<string>? MissingKeywords { get; set; }
}

/// <summary>Query string of the jobs grid. Tabs are presets the client writes into these fields.</summary>
public record JobFilter(
    string? Company,
    JobStatus? Status,
    int? MinScore,
    string? Board,
    DateOnly? From,
    DateOnly? To,
    int Page = 1,
    int PageSize = 20);

public record JobListItem(
    long Id,
    string JobTitle,
    string Company,
    string Location,
    string JobBoard,
    string JobUrl,
    int MatchScore,
    string ResumeVersion,
    JobStatus Status,
    DateOnly PostedDate,
    DateTimeOffset? AppliedAt,
    DateTimeOffset? InterviewAt);

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public record JobDetail(
    long Id,
    string JobTitle,
    string Company,
    string Location,
    string JobBoard,
    string JobUrl,
    string Description,
    int MatchScore,
    string ResumeVersion,
    JobStatus Status,
    DateOnly PostedDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset? AppliedAt,
    DateTimeOffset? InterviewAt,
    JobAnalysis Analysis,
    string? CoverLetter,
    TailoredResume? Tailored);

/// <summary>
/// The whole tracking state of a job. The dates are sent on every call, so clearing one in the UI clears it here.
/// </summary>
public record UpdateTrackingRequest(JobStatus Status, DateOnly? AppliedOn, DateOnly? InterviewOn);

public record JobMetrics(int Total, int Pending, int Applied, int Interviewing, int HighMatch, int ActionNeeded, int AverageScore);
