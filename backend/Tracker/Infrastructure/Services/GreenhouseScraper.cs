using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using Tracker.Features.Jobs.Dtos;

namespace Tracker.Infrastructure.Services;

/// <summary>Reads a Greenhouse job board. One request returns every posting with its description.</summary>
public sealed class GreenhouseScraper(
    IHttpClientFactory factory, IOptions<ScraperOptions> options, ILogger<GreenhouseScraper> logger)
    : AtsBoardScraper(factory, options, logger)
{
    /// <summary>Greenhouse names its fields in snake case, unlike the camel case of the other boards.</summary>
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    public override string Board => "Greenhouse";

    protected override async Task<IReadOnlyList<ImportJobRequest>> ReadBoardAsync(
        HttpClient http, string company, CancellationToken ct)
    {
        var board = await http.GetFromJsonAsync<BoardResponse>(
            $"https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true", Json, ct);

        return board?.Jobs?
            .Where(job => !string.IsNullOrWhiteSpace(job.AbsoluteUrl))
            .Select(job => new ImportJobRequest
            {
                JobTitle = job.Title?.Trim() ?? string.Empty,
                Company = job.CompanyName?.Trim() is { Length: > 0 } name ? name : company,
                Location = job.Location?.Name,
                JobUrl = job.AbsoluteUrl!.Trim(),
                // When it first went live, not when it was last edited, which is the date being tracked.
                Date = (job.FirstPublished ?? job.UpdatedAt)?.ToString("yyyy-MM-dd"),
                JobDescription = HtmlText.ToPlain(job.Content)
            })
            .ToList() ?? [];
    }

    private sealed record BoardResponse(List<Posting>? Jobs);

    private sealed record Posting(
        string? Title,
        string? CompanyName,
        string? AbsoluteUrl,
        string? Content,
        DateTimeOffset? FirstPublished,
        DateTimeOffset? UpdatedAt,
        Office? Location);

    private sealed record Office(string? Name);
}
