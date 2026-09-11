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
                if (Matches(job, terms) && seen.Add(job.JobUrl)) jobs.Add(job);
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

    /// <summary>
    /// A board returns every job its company has open, so the keywords narrow it here rather than in the
    /// request. Any term found in the title or the description keeps a job; no terms keeps all of them.
    /// </summary>
    private static bool Matches(ImportJobRequest job, string[] terms) => terms.Length == 0 || terms.Any(term =>
        job.JobTitle.Contains(term, StringComparison.OrdinalIgnoreCase) ||
        job.Text().Contains(term, StringComparison.OrdinalIgnoreCase));

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
