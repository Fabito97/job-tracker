using Microsoft.Extensions.Options;
using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;

namespace Tracker.Infrastructure.Services;

/// <summary>
/// Reads an applicant tracking system through its public job board API. One request returns everything a
/// company has posted, so there is no browser, no paging and nothing to parse out of markup.
/// </summary>
public abstract class AtsBoardScraper(
    IHttpClientFactory factory, IOptions<ScraperOptions> options, ILogger logger) : IJobBoardScraper
{
    private const int MaxJobsPerRun = 500;
    private const int HttpTimeoutSeconds = 30;

    public abstract string Board { get; }

    public bool SearchesByCompany => true;

    /// <summary>Everything one company has posted. Throwing is fine; the caller skips that company.</summary>
    protected abstract Task<IReadOnlyList<ImportJobRequest>> ReadBoardAsync(
        HttpClient http, string company, CancellationToken ct);

    public async Task<IReadOnlyList<ImportJobRequest>> ScrapeAsync(ScrapeRequest request, CancellationToken ct)
    {
        var settings = options.Value;
        var board = settings.For(Board);
        var companies = Companies(request.Companies, board.Companies);
        var terms = Terms(request.Keywords ?? board.Keywords);
        var wanted = Math.Clamp(request.MaxJobs ?? board.MaxJobs, 1, MaxJobsPerRun);
        var delayMs = board.DelayMs ?? settings.DelayMs;

        var rawLocations = string.IsNullOrWhiteSpace(request.Location) ? board.Location : request.Location;
        var locations = rawLocations
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(loc => loc.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var remoteOnly = request.RemoteOnly ?? string.Equals(board.JobType, "Remote", StringComparison.OrdinalIgnoreCase);
        var datePosted = request.DatePosted;
        var experienceLevel = request.ExperienceLevel;
        var exclusions = (request.ExcludeKeywords ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(s => s.Length > 0)
            .ToList();

        var http = factory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(HttpTimeoutSeconds);
        http.DefaultRequestHeaders.UserAgent.ParseAdd(settings.UserAgent);

        var jobs = new List<ImportJobRequest>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < companies.Count && jobs.Count < wanted; i++)
        {
            ct.ThrowIfCancellationRequested();

            // Spaced out so a long company list does not arrive as one burst.
            if (i > 0) await Task.Delay(delayMs, ct);

            foreach (var job in await ReadCompanyAsync(http, companies[i], ct))
            {
                if (MatchesCriteria(job, terms, locations, remoteOnly, datePosted, experienceLevel, exclusions) && seen.Add(job.JobUrl))
                {
                    jobs.Add(job);
                    if (jobs.Count >= wanted) break;
                }
            }
        }

        logger.LogInformation("{Board}: kept {Count} postings from {Companies} companies", Board, jobs.Count, companies.Count);

        return jobs.Take(wanted).ToList();
    }

    private async Task<IReadOnlyList<ImportJobRequest>> ReadCompanyAsync(HttpClient http, string company, CancellationToken ct)
    {
        try
        {
            return await ReadBoardAsync(http, company, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // A token that has been renamed or closed answers 404. One bad entry must not end the run.
            logger.LogWarning("{Board}: skipped {Company}: {Reason}", Board, company, ex.Message);

            return [];
        }
    }

    private static bool MatchesCriteria(
        ImportJobRequest job,
        string[] terms,
        List<string> locations,
        bool remoteOnly,
        string? datePosted,
        string? experienceLevel,
        List<string> exclusions)
    {
        // 1. Excluded negative keywords
        if (exclusions.Any(ex =>
            job.JobTitle.Contains(ex, StringComparison.OrdinalIgnoreCase) ||
            job.Text().Contains(ex, StringComparison.OrdinalIgnoreCase)))
            return false;

        // 2. Keyword terms
        if (terms.Length > 0 && !terms.Any(term =>
            job.JobTitle.Contains(term, StringComparison.OrdinalIgnoreCase) ||
            job.Text().Contains(term, StringComparison.OrdinalIgnoreCase)))
            return false;

        // 3. Remote Only
        var isRemote = IsRemote(job);
        if (remoteOnly && !isRemote)
            return false;

        // 4. Location matching (any location in list)
        if (locations.Count > 0 && !locations.Any(loc => MatchesLocation(job, loc, isRemote)))
            return false;

        // 5. Date freshness
        if (!MatchesDate(job, datePosted))
            return false;

        // 6. Experience level
        if (!MatchesExperience(job, experienceLevel))
            return false;

        return true;
    }

    private static bool IsRemote(ImportJobRequest job)
    {
        var loc = job.Location ?? string.Empty;
        var title = job.JobTitle ?? string.Empty;
        return loc.Contains("remote", StringComparison.OrdinalIgnoreCase) ||
               loc.Contains("distributed", StringComparison.OrdinalIgnoreCase) ||
               loc.Contains("anywhere", StringComparison.OrdinalIgnoreCase) ||
               loc.Contains("virtual", StringComparison.OrdinalIgnoreCase) ||
               title.Contains("remote", StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesLocation(ImportJobRequest job, string targetLocation, bool isRemote)
    {
        if (string.IsNullOrWhiteSpace(targetLocation) || string.Equals(targetLocation, "Any", StringComparison.OrdinalIgnoreCase))
            return true;

        var loc = job.Location ?? string.Empty;
        var title = job.JobTitle ?? string.Empty;

        // Direct match
        if (loc.Contains(targetLocation, StringComparison.OrdinalIgnoreCase) ||
            title.Contains(targetLocation, StringComparison.OrdinalIgnoreCase))
            return true;

        // Smart EMEA / African regional matching
        var isEmeaTarget = targetLocation.Contains("Nigeria", StringComparison.OrdinalIgnoreCase) ||
                           targetLocation.Contains("EMEA", StringComparison.OrdinalIgnoreCase) ||
                           targetLocation.Contains("Africa", StringComparison.OrdinalIgnoreCase);

        if (isEmeaTarget)
        {
            if (loc.Contains("EMEA", StringComparison.OrdinalIgnoreCase) ||
                loc.Contains("Europe, Middle East", StringComparison.OrdinalIgnoreCase) ||
                loc.Contains("Africa", StringComparison.OrdinalIgnoreCase) ||
                loc.Contains("Worldwide", StringComparison.OrdinalIgnoreCase) ||
                loc.Contains("Global", StringComparison.OrdinalIgnoreCase) ||
                loc.Contains("Anywhere", StringComparison.OrdinalIgnoreCase))
                return true;
        }

        // Global / Worldwide matching
        if (targetLocation.Contains("Worldwide", StringComparison.OrdinalIgnoreCase) ||
            targetLocation.Contains("Global", StringComparison.OrdinalIgnoreCase) ||
            targetLocation.Contains("Anywhere", StringComparison.OrdinalIgnoreCase))
        {
            return loc.Contains("Worldwide", StringComparison.OrdinalIgnoreCase) ||
                   loc.Contains("Global", StringComparison.OrdinalIgnoreCase) ||
                   loc.Contains("Anywhere", StringComparison.OrdinalIgnoreCase) ||
                   isRemote;
        }

        return false;
    }

    private static bool MatchesDate(ImportJobRequest job, string? datePosted)
    {
        if (string.IsNullOrWhiteSpace(datePosted) || string.Equals(datePosted, "any", StringComparison.OrdinalIgnoreCase))
            return true;

        if (string.IsNullOrWhiteSpace(job.Date) || !DateTime.TryParse(job.Date, out var date))
            return true;

        var age = DateTime.UtcNow - date;
        return datePosted.ToLowerInvariant() switch
        {
            "24h" or "day" => age <= TimeSpan.FromHours(36),
            "week" or "7d" => age <= TimeSpan.FromDays(8),
            "month" or "30d" => age <= TimeSpan.FromDays(32),
            _ => true
        };
    }

    private static bool MatchesExperience(ImportJobRequest job, string? experienceLevel)
    {
        if (string.IsNullOrWhiteSpace(experienceLevel) || string.Equals(experienceLevel, "all", StringComparison.OrdinalIgnoreCase))
            return true;

        var title = job.JobTitle ?? string.Empty;
        return experienceLevel.ToLowerInvariant() switch
        {
            "entry" or "junior" => !title.Contains("Senior", StringComparison.OrdinalIgnoreCase) &&
                                   !title.Contains("Lead", StringComparison.OrdinalIgnoreCase) &&
                                   !title.Contains("Staff", StringComparison.OrdinalIgnoreCase) &&
                                   !title.Contains("Principal", StringComparison.OrdinalIgnoreCase) &&
                                   !title.Contains("Director", StringComparison.OrdinalIgnoreCase),
            "senior" or "lead" => !title.Contains("Junior", StringComparison.OrdinalIgnoreCase) &&
                                  !title.Contains("Intern", StringComparison.OrdinalIgnoreCase) &&
                                  !title.Contains("Graduate", StringComparison.OrdinalIgnoreCase),
            "director" or "exec" => title.Contains("Director", StringComparison.OrdinalIgnoreCase) ||
                                    title.Contains("Head", StringComparison.OrdinalIgnoreCase) ||
                                    title.Contains("VP", StringComparison.OrdinalIgnoreCase) ||
                                    title.Contains("Manager", StringComparison.OrdinalIgnoreCase),
            _ => true
        };
    }

    private static string[] Terms(string? keywords) => (keywords ?? string.Empty)
        .Split([' ', ',', '"'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static List<string> Companies(string[]? requested, List<string> configured) =>
        (requested is { Length: > 0 } ? requested : [.. configured])
        .Select(Token)
        .Where(token => token.Length > 0)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

    /// <summary>Takes a bare token, or the first path segment of a board URL pasted from the browser.</summary>
    private static string Token(string entry) => Uri.TryCreate(entry.Trim(), UriKind.Absolute, out var uri)
        ? uri.Segments.Select(segment => segment.Trim('/')).FirstOrDefault(segment => segment.Length > 0) ?? string.Empty
        : entry.Trim().Trim('/');
}
