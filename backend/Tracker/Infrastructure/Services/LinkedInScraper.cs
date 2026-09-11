using Microsoft.Extensions.Options;
using Microsoft.Playwright;
using Tracker.Features.Jobs.Dtos;

namespace Tracker.Infrastructure.Services;

/// <summary>Reads the public LinkedIn job search. The base class owns the browser and the pacing.</summary>
public sealed class LinkedInScraper(IOptions<ScraperOptions> options, ILogger<LinkedInScraper> logger)
    : JobBoardScraper(options, logger)
{
    public override string Board => "LinkedIn";

    protected override int CardsPerPage => 25;

    /// <summary>
    /// The posting id gives the canonical URL, which stays stable across runs so the importer can keep
    /// recognising a job it already has. The card's own href carries per-run tracking parameters.
    /// </summary>
    protected override string CardScript => """
        () => [...document.querySelectorAll('div.job-search-card')].map(card => {
          const text = s => card.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() ?? '';
          const id = card.getAttribute('data-entity-urn')?.split(':').pop();
          return {
            jobTitle: text('.base-search-card__title'),
            company: text('.base-search-card__subtitle'),
            location: text('.job-search-card__location'),
            date: card.querySelector('time[datetime]')?.getAttribute('datetime') ?? '',
            jobUrl: id ? `https://www.linkedin.com/jobs/view/${id}/` : ''
          };
        })
        """;

    protected override string SearchUrl(BoardOptions board, string keywords, int start) =>
        $"https://www.linkedin.com/jobs/search?keywords={Uri.EscapeDataString(keywords)}" +
        $"&location={Uri.EscapeDataString(board.Location)}&geoId={board.GeoId}&start={start}";

    protected override async Task ReadPostingAsync(IPage page, ImportJobRequest job) =>
        job.JobDescription = (await page.Locator(".decorated-job-posting__details").First.InnerTextAsync()).Trim();
}
