using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Microsoft.Playwright;
using Tracker.Features.Jobs.Dtos;

namespace Tracker.Infrastructure.Services;

/// <summary>Reads the public Indeed job search. The base class owns the browser and the pacing.</summary>
public sealed partial class IndeedScraper(IOptions<ScraperOptions> options, ILogger<IndeedScraper> logger)
    : JobBoardScraper(options, logger)
{
    /// <summary>Indeed serves two layouts. The older one carries the id, the newer one the class.</summary>
    private const string DescriptionSelector = "#jobDescriptionText, .simple-job-description-html";

    /// <summary>
    /// The posted age is only ever in the page's own JSON, never rendered into the document. Both layouts
    /// are covered: one writes it as "age":"1 day ago" and the other as age: "1 day ago". The word
    /// boundary is what stops it matching the tail of keys like localStorage.
    /// </summary>
    [GeneratedRegex("\\bage\"?\\s*:\\s*\"([^\"]+)\"")]
    private static partial Regex PostedAge();

    public override string Board => "Indeed";

    protected override int CardsPerPage => 10;

    /// <summary>Measured: reusing one session returns 1 description in 4, a fresh one per posting 4 in 4.</summary>
    protected override bool IsolatePostings => true;

    /// <summary>
    /// The job key gives the canonical viewjob URL, which stays stable across runs so the importer can
    /// keep recognising a job it already has. The card's own href carries per-run tracking parameters.
    /// </summary>
    protected override string CardScript => """
        () => [...document.querySelectorAll('div.job_seen_beacon')].map(card => {
          const text = s => card.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() ?? '';
          const jk = card.querySelector('a[data-jk]')?.getAttribute('data-jk');
          return {
            jobTitle: text('h3.jobTitle'),
            company: text('[data-testid="company-name"]'),
            location: text('[data-testid="text-location"]'),
            date: '',
            jobUrl: jk ? `https://www.indeed.com/viewjob?jk=${jk}` : ''
          };
        })
        """;

    protected override string SearchUrl(BoardOptions board, string keywords, int start) =>
        $"https://www.indeed.com/jobs?q={Uri.EscapeDataString(keywords)}" +
        $"&l={Uri.EscapeDataString(board.Location)}&start={start}";

    protected override async Task ReadPostingAsync(IPage page, ImportJobRequest job)
    {
        job.JobDescription = (await page.Locator(DescriptionSelector).First.InnerTextAsync()).Trim();

        // Unlike LinkedIn, the card carries no date, so it is taken from the posting instead. Leaving it
        // blank would date every stale posting to today and break filtering by how recent a job is.
        var age = PostedAge().Match(await page.ContentAsync());
        if (age.Success) job.Date = age.Groups[1].Value;
    }
}
