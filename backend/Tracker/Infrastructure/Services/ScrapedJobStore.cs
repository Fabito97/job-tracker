using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Tracker.Features.Jobs.Dtos;

namespace Tracker.Infrastructure.Services;

/// <summary>What one job board searches for. Boards throttle differently, so the pause is overridable.</summary>
public sealed class BoardOptions
{
    public string Keywords { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;

    /// <summary>LinkedIn pairs this with the location. Boards that do not use it leave it blank.</summary>
    public string GeoId { get; set; } = string.Empty;
    public string JobType { get; set; } = "Remote";

    public int MaxJobs { get; set; } = 25;

    /// <summary>Null falls back to the shared delay.</summary>
    public int? DelayMs { get; set; }

    /// <summary>
    /// The employers to read, for a board searched one at a time. A board token, or the URL it sits at.
    /// </summary>
    public List<string> Companies { get; set; } = [];
}

/// <summary>The scraper settings, read from the "Scraper" configuration section.</summary>
public sealed class ScraperOptions
{
    public bool Headless { get; set; } = true;

    /// <summary>
    /// Base pause before each page visit. Boards answer a burst of rapid guest requests with a sign-in
    /// wall rather than the posting, so without this most descriptions come back empty.
    /// </summary>
    public int DelayMs { get; set; } = 2500;

    /// <summary>The stock headless agent gets served the login wall instead of results.</summary>
    public string UserAgent { get; set; } =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    /// <summary>Relative to the content root, so a run from the project folder writes into the source tree.</summary>
    public string OutputPath { get; set; } = "Infrastructure/Data/Jobs";

    public Dictionary<string, BoardOptions> Boards { get; set; } = [];

    /// <summary>Matched case-insensitively, so the route value does not have to match the config casing.</summary>
    public BoardOptions For(string board) => Boards
        .FirstOrDefault(entry => string.Equals(entry.Key, board, StringComparison.OrdinalIgnoreCase))
        .Value ?? new BoardOptions();
}

/// <summary>
/// Keeps every scrape as a jobs file on disk. The shape is the one /api/jobs/import already accepts,
/// so a saved file can be reviewed, hand-edited, and imported unchanged.
/// </summary>
public sealed class ScrapedJobStore
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly string _directory;

    public ScrapedJobStore(IOptions<ScraperOptions> options, IHostEnvironment environment)
    {
        _directory = Path.Combine(environment.ContentRootPath, options.Value.OutputPath);
        Directory.CreateDirectory(_directory);
    }

    public async Task<string> SaveAsync(string board, IReadOnlyList<ImportJobRequest> jobs, CancellationToken ct)
    {
        var name = $"{board.ToLowerInvariant()}-{DateTime.Now:yyyyMMdd-HHmmss}.json";

        await using var file = File.Create(Path.Combine(_directory, name));
        await JsonSerializer.SerializeAsync(file, jobs, Json, ct);

        return name;
    }

    /// <summary>Newest first, which the timestamped names give for free.</summary>
    public IEnumerable<string> Files() => Directory
        .EnumerateFiles(_directory, "*.json")
        .Select(Path.GetFileName)
        .OfType<string>()
        .OrderByDescending(name => name, StringComparer.Ordinal);

    /// <summary>Null when the file is not there.</summary>
    public async Task<List<ImportJobRequest>?> ReadAsync(string file, CancellationToken ct)
    {
        // GetFileName keeps a crafted name from reaching outside the folder.
        var path = Path.Combine(_directory, Path.GetFileName(file));
        if (!File.Exists(path)) return null;

        await using var stream = File.OpenRead(path);

        return await JsonSerializer.DeserializeAsync<List<ImportJobRequest>>(stream, Json, ct);
    }
}
