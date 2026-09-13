namespace Tracker.Domain.Models;

/// <summary>
/// Display-only output of the AI analysis. Owned by <see cref="Job"/> and stored as a single JSON column.
/// </summary>
public class JobAnalysis
{
    public string Reason { get; set; } = string.Empty;
    public string TailoredSummary { get; set; } = string.Empty;
    public string SponsorshipNote { get; set; } = string.Empty;
    public string LocationEligibility { get; set; } = "Unknown";
    public string LocationNote { get; set; } = string.Empty;
    public List<string> MatchingStrengths { get; set; } = [];
    public List<string> MissingKeywords { get; set; } = [];
}
