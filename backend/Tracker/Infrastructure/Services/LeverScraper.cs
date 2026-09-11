using System.Globalization;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using Tracker.Features.Jobs.Dtos;

namespace Tracker.Infrastructure.Services;

/// <summary>Reads a Lever job board. One request returns every posting with its description.</summary>
public sealed class LeverScraper(
    IHttpClientFactory factory, IOptions<ScraperOptions> options, ILogger<LeverScraper> logger)
    : AtsBoardScraper(factory, options, logger)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public override string Board => "Lever";

    protected override async Task<IReadOnlyList<ImportJobRequest>> ReadBoardAsync(
        HttpClient http, string company, CancellationToken ct)
    {
        var postings = await http.GetFromJsonAsync<List<Posting>>(
            $"https://api.lever.co/v0/postings/{company}?mode=json", Json, ct);

        // Lever names the employer nowhere in the payload, so the slug stands in for it.
        var name = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(company);

        return postings?
            .Where(posting => !string.IsNullOrWhiteSpace(posting.HostedUrl))
            .Select(posting => new ImportJobRequest
            {
                JobTitle = posting.Text?.Trim() ?? string.Empty,
                Company = name,
                Location = posting.Categories?.Location,
                JobUrl = posting.HostedUrl!.Trim(),
                Date = posting.CreatedAt is { } ms
                    ? DateTimeOffset.FromUnixTimeMilliseconds(ms).ToString("yyyy-MM-dd")
                    : null,
                JobDescription = Describe(posting)
            })
            .ToList() ?? [];
    }

    /// <summary>
    /// The requirements sit in "lists", apart from the opening blurb, and they are the part worth scoring
    /// against, so the description is stitched back together from every piece.
    /// </summary>
    private static string Describe(Posting posting)
    {
        string?[] parts =
        [
            posting.DescriptionPlain,
            .. (posting.Lists ?? []).Select(list => $"{list.Text}\n{HtmlText.ToPlain(list.Content)}"),
            posting.AdditionalPlain
        ];

        return string.Join("\n\n", parts.Where(part => !string.IsNullOrWhiteSpace(part)));
    }

    private sealed record Posting(
        string? Text,
        string? HostedUrl,
        string? DescriptionPlain,
        string? AdditionalPlain,
        long? CreatedAt,
        Categories? Categories,
        List<Section>? Lists);

    private sealed record Categories(string? Location, string? Department, string? Team);

    private sealed record Section(string? Text, string? Content);
}
