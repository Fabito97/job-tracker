namespace Tracker.Features.Jobs.Dtos;

/// <summary>
/// Overrides for one scrape run. Anything left out falls back to the "Scraper" configuration section.
/// Companies apply to the boards searched one employer at a time, and are ignored by the rest.
/// </summary>
public record ScrapeRequest(
    string? Keywords,
    int? MaxJobs,
    string[]? Companies = null,
    string? Location = null,
    bool? RemoteOnly = null,
    string? DatePosted = null,
    string? ExperienceLevel = null,
    string? ExcludeKeywords = null);

/// <summary>What one board's search falls back to, so the UI can prefill its form from configuration.</summary>
public record ScrapeDefaults(
    string Board,
    string Keywords,
    string Location,
    int MaxJobs,
    IReadOnlyList<string> Companies,
    bool SearchesByCompany,
    bool RemoteOnly = false,
    string DatePosted = "any",
    string ExperienceLevel = "all",
    string ExcludeKeywords = "");

/// <summary>
/// A scraped posting plus what the importer would already do with it. Flagged rather than filtered,
/// because seeing a duplicate before selecting it is what keeps the analysis from being paid for twice.
/// </summary>
public record ScrapedJob(ImportJobRequest Job, bool IsDuplicate, bool IsBlacklisted);

/// <summary>The jobs a run found, plus the name of the file they were written to.</summary>
public record ScrapeResult(string File, int Count, IReadOnlyList<ScrapedJob> Jobs);
