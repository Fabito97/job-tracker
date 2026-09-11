using Tracker.Features.Jobs.Dtos;

namespace Tracker.Features.Jobs.Services;

public interface IJobBoardScraper
{
    /// <summary>The name this board is addressed by, in configuration and on the route.</summary>
    string Board { get; }

    /// <summary>
    /// An applicant tracking system lists one employer at a time, so it is given company tokens and the
    /// keywords narrow the result. A job board is searched by keywords directly.
    /// </summary>
    bool SearchesByCompany { get; }

    /// <summary>Reads the board's public search and returns the postings in the shape the importer accepts.</summary>
    Task<IReadOnlyList<ImportJobRequest>> ScrapeAsync(ScrapeRequest request, CancellationToken ct);
}
