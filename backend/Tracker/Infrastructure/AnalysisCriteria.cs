namespace Tracker.Infrastructure;

public record CandidateCriteria
{
    public int MinScore { get; init; } = 60;
    public bool RequiresSponsorship { get; init; } = false;
    public bool RequireClearanceCheck { get; init; } = false;
    public string? TargetLocation { get; init; }
    public bool KeepRejectedJobs { get; init; } = true;
}

