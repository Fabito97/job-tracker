using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;
using Tracker.Features.Jobs.Dtos;
using Tracker.Features.Jobs.Services;
using Tracker.Infrastructure;
using Tracker.Infrastructure.Data;
using Tracker.Infrastructure.Services;

namespace Tracker.Features.Jobs;

/// <summary>
/// Scraping only ever writes a file. Importing one stays on /api/jobs/import, so a run can be
/// reviewed before the analysis is paid for.
/// </summary>
public static class ScrapeEndpoints
{
    public static IEndpointRouteBuilder MapScrapeEndpoints(this IEndpointRouteBuilder app)
    {
        var scrape = app.MapGroup("/api/scrape");

        // "/{board}" still answers the original "/linkedin" route, and now "/indeed" as well.
        scrape.MapPost("/{board}", ScrapeAsync);
        scrape.MapGet("/defaults", GetDefaults);
        scrape.MapGet("/files", GetFiles);
        scrape.MapGet("/files/{file}", GetFileAsync);

        return app;
    }

    private static async Task<Results<Ok<ScrapeResult>, NotFound>> ScrapeAsync(
        string board,
        ScrapeRequest request,
        [FromServices] IEnumerable<IJobBoardScraper> scrapers,
        [FromServices] ScrapedJobStore store,
        [FromServices] TrackerDbContext db,
        [FromServices] CompanyBlacklist blacklist,
        CancellationToken ct)
    {
        var scraper = scrapers.FirstOrDefault(s => string.Equals(s.Board, board, StringComparison.OrdinalIgnoreCase));
        if (scraper is null) return TypedResults.NotFound();

        var jobs = await scraper.ScrapeAsync(request, ct);

        // The file is written before anything is chosen, so a run survives a closed tab or a bad pick.
        var file = await store.SaveAsync(scraper.Board, jobs, ct);

        var known = await db.Jobs.Select(job => job.JobUrl).ToHashSetAsync(ct);
        var annotated = jobs
            .Select(job => new ScrapedJob(job, known.Contains(job.JobUrl), blacklist.IsBlacklisted(job.Company)))
            .ToList();

        return TypedResults.Ok(new ScrapeResult(file, annotated.Count, annotated));
    }

    private static Ok<List<ScrapeDefaults>> GetDefaults(
        [FromServices] IEnumerable<IJobBoardScraper> scrapers,
        [FromServices] IOptions<ScraperOptions> options) =>
        TypedResults.Ok(scrapers.Select(scraper =>
        {
            var board = options.Value.For(scraper.Board);

            return new ScrapeDefaults(scraper.Board, board.Keywords, board.Location, board.MaxJobs,
                board.Companies, scraper.SearchesByCompany,
                RemoteOnly: string.Equals(board.JobType, "Remote", StringComparison.OrdinalIgnoreCase));
        }).ToList());

    private static IEnumerable<string> GetFiles([FromServices] ScrapedJobStore store) => store.Files();

    private static async Task<Results<Ok<List<ImportJobRequest>>, NotFound>> GetFileAsync(
        string file,
        [FromServices] ScrapedJobStore store,
        CancellationToken ct)
    {
        var jobs = await store.ReadAsync(file, ct);

        return jobs is null ? TypedResults.NotFound() : TypedResults.Ok(jobs);
    }
}
