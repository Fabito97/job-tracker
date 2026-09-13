namespace Tracker.Domain.Models;

public class Job
{
    public long Id { get; set; }

    // Imported from jobs.json
    public string JobTitle { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string JobUrl { get; set; } = string.Empty;
    public string JobBoard { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Date the job was posted, taken from the imported file. "Today" is resolved on import.</summary>
    public DateOnly PostedDate { get; set; }

    // Produced by the AI analysis
    public int MatchScore { get; set; }
    public string ResumeVersion { get; set; } = string.Empty;
    public JobAnalysis Analysis { get; set; } = new();
    public string? CoverLetter { get; set; }

    /// <summary>Null until the resume is generated for this posting.</summary>
    public TailoredResume? Tailored { get; set; }

    // Application tracking
    public JobStatus Status { get; set; } = JobStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? AppliedAt { get; set; }
    public DateTimeOffset? InterviewAt { get; set; }

    // User tailoring directives & confirmed skills
    public List<string> ConfirmedSkills { get; set; } = [];
    public string? TailoringNotes { get; set; }
}
