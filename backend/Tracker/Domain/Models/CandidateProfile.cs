namespace Tracker.Domain.Models;

public record CandidateProfile
{
    public string ProfessionalHeadline { get; init; } = "Software Engineer";
    public string TargetSeniority { get; init; } = "Senior";
    public string CurrentLocation { get; init; } = "Nigeria";
    public IReadOnlyList<string> TargetLocations { get; init; } = ["Remote", "Worldwide", "United States", "United Kingdom", "Europe"];
    public bool OpenToRelocation { get; init; } = true;
    public string WorkAuthorization { get; init; } = "Needs Visa Sponsorship";
    public bool HasSecurityClearance { get; init; } = false;
    public int MinScore { get; init; } = 60;
    public bool KeepRejectedJobs { get; init; } = true;
    public IReadOnlyList<string> CustomDealbreakers { get; init; } = [];
}

