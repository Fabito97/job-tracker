using Microsoft.Extensions.Options;
using Microsoft.Playwright;
using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;

namespace Tracker.Infrastructure.Services;

/// <summary>
/// The parts of scraping a job board that do not vary: one browser for the run, a paced and retried
/// visit to every page, and a paginated sweep of the result cards. A board supplies only what is its own.
/// </summary>
public abstract class JobBoardScraper(IOptions<ScraperOptions> options, ILogger logger) : IJobBoardScraper
{
    private const int PageTimeoutMs = 15_000;
    private const int MaxAttempts = 3;
    private const int MaxJobsPerRun = 250;

    /// <summary>
    /// A throttled board answers with a sign-in or challenge page, where the posting simply is not
    /// present. LinkedIn uses 429 for this and Indeed 401, so both are treated as "come back later".
    /// </summary>
    private static readonly int[] ThrottleCodes = [401, 403, 429];

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public abstract string Board { get; }

    public bool SearchesByCompany => false;

    /// <summary>How far the board's paging parameter moves for one page of results.</summary>
    protected abstract int CardsPerPage { get; }

    /// <summary>
    /// Returns one object per card, each with jobTitle, company, location, date and jobUrl. Reading every
    /// card in a single round trip beats walking them with locators, which costs a call per field.
    /// </summary>
    protected abstract string CardScript { get; }

    protected abstract string SearchUrl(BoardOptions board, string keywords, int start);

    /// <summary>
    /// Whether each posting is visited in its own browser context. Indeed clamps down on a session once
    /// it has served one posting, which costs every description after the first; LinkedIn does not.
    /// </summary>
    protected virtual bool IsolatePostings => false;

    /// <summary>Fills in whatever only the posting's own page carries. Called with that page loaded.</summary>
    protected abstract Task ReadPostingAsync(IPage page, ImportJobRequest job);

    public async Task<IReadOnlyList<ImportJobRequest>> ScrapeAsync(ScrapeRequest request, CancellationToken ct)
    {
        var settings = options.Value;
        var board = settings.For(Board);
        var keywords = string.IsNullOrWhiteSpace(request.Keywords) ? board.Keywords : request.Keywords.Trim();
        var wanted = Math.Clamp(request.MaxJobs ?? board.MaxJobs, 1, MaxJobsPerRun);
        var delayMs = board.DelayMs ?? settings.DelayMs;

        using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync(new() { Headless = settings.Headless });
        await using var context = await browser.NewContextAsync(new() { UserAgent = settings.UserAgent });

        var page = await context.NewPageAsync();
        page.SetDefaultTimeout(PageTimeoutMs);

        var jobs = await CollectCardsAsync(page, board, keywords, wanted, delayMs, ct);

        // Sequential and paced. Running these in parallel is what earns a throttle, and a throttled
        // request loses the description entirely, so going slower returns more.
        foreach (var job in jobs) await VisitPostingAsync(browser, page, job, settings, delayMs, ct);

        return jobs;
    }

    private async Task<List<ImportJobRequest>> CollectCardsAsync(
        IPage page, BoardOptions board, string keywords, int wanted, int delayMs, CancellationToken ct)
    {
        var jobs = new List<ImportJobRequest>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var start = 0; jobs.Count < wanted; start += CardsPerPage)
        {
            ct.ThrowIfCancellationRequested();
            if (start > 0) await Task.Delay(Pause(delayMs, 1), ct);

            var response = await page.GotoAsync(SearchUrl(board, keywords, start), new() { WaitUntil = WaitUntilState.DOMContentLoaded });

            // Told apart from a genuine end of results, which would otherwise truncate the run in silence.
            if (IsThrottled(response))
            {
                logger.LogWarning("{Board}: stopped at {Count} postings, the search is being throttled", Board, jobs.Count);
                break;
            }

            var cards = (await page.EvaluateAsync(CardScript))?.Deserialize<List<ImportJobRequest>>(Json) ?? [];

            // Boards repeat cards across pages, and past the last page they repeat the previous one wholesale.
            var fresh = cards.Where(card => card.JobUrl.Length > 0 && seen.Add(card.JobUrl)).ToList();
            if (fresh.Count == 0) break;

            jobs.AddRange(fresh);
        }

        logger.LogInformation("{Board}: found {Count} postings for {Keywords}", Board, jobs.Count, keywords);

        return jobs.Take(wanted).ToList();
    }

    private async Task VisitPostingAsync(   
        IBrowser browser, IPage sharedPage, ImportJobRequest job, ScraperOptions settings, int delayMs, CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            await Task.Delay(Pause(delayMs, attempt), ct);

            // Per attempt, not per posting: a throttled session stays throttled, so a retry that reused
            // it would be spent before it started.
            await using var isolated = IsolatePostings
                ? await browser.NewContextAsync(new() { UserAgent = settings.UserAgent })
                : null;

            var page = isolated is null ? sharedPage : await isolated.NewPageAsync();
            page.SetDefaultTimeout(PageTimeoutMs);

            try
            {
                var response = await page.GotoAsync(job.JobUrl, new() { WaitUntil = WaitUntilState.DOMContentLoaded });

                if (IsThrottled(response))
                {
                    if (attempt < MaxAttempts) continue;

                    logger.LogWarning("{Board}: gave up on {JobUrl}, still throttled after {Attempts} tries",
                        Board, job.JobUrl, MaxAttempts);
                    return;
                }

                await ReadPostingAsync(page, job);
                return;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                if (attempt < MaxAttempts) continue;

                // A posting that has been pulled has no description. The importer counts that as a failed row.
                logger.LogWarning("{Board}: could not read {JobUrl}: {Reason}", Board, job.JobUrl, ex.Message);
                return;
            }
        }
    }

    private static bool IsThrottled(IResponse? response) => response is not null && ThrottleCodes.Contains(response.Status);

    /// <summary>Backs off on each retry, and jitters so the requests are never evenly spaced.</summary>
    private static int Pause(int delayMs, int attempt) => (delayMs * attempt) + Random.Shared.Next(250, 1_000);
}
