using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;

namespace Tracker.Infrastructure;

/// <summary>
/// Manages prompt templates shipped in the Prompts folder.
/// Automatically detects file modifications on disk and reloads templates without needing server restarts.
/// </summary>
public sealed class PromptStore
{
    private static readonly string PromptDirectory = Path.Combine(AppContext.BaseDirectory, "Prompts");
    private readonly ConcurrentDictionary<string, (DateTime LastModifiedUtc, string Content)> _cache = new(StringComparer.OrdinalIgnoreCase);

    public string Get(string name)
    {
        var filePath = Path.Combine(PromptDirectory, $"{name}.txt");
        if (!File.Exists(filePath))
            throw new FileNotFoundException($"Prompt file '{name}.txt' was not found in {PromptDirectory}.");

        var lastWrite = File.GetLastWriteTimeUtc(filePath);
        if (_cache.TryGetValue(name, out var cached) && cached.LastModifiedUtc == lastWrite)
        {
            return cached.Content;
        }

        var content = File.ReadAllText(filePath);
        _cache[name] = (lastWrite, content);
        return content;
    }

    public bool TryGet(string name, [NotNullWhen(true)] out string? text)
    {
        try
        {
            text = Get(name);
            return true;
        }
        catch
        {
            text = null;
            return false;
        }
    }

    /// <summary>
    /// Scans the Prompts directory for seed CV templates following the predictable pattern 'cv_<role>.txt'.
    /// Used only during cold-start initial database seeding.
    /// </summary>
    public IReadOnlyDictionary<string, string> DiscoverSeedResumes()
    {
        var seedResumes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (!Directory.Exists(PromptDirectory)) return seedResumes;

        foreach (var file in Directory.EnumerateFiles(PromptDirectory, "*.txt"))
        {
            var fileNameWithoutExt = Path.GetFileNameWithoutExtension(file);

            if (fileNameWithoutExt.StartsWith("cv_", StringComparison.OrdinalIgnoreCase))
            {
                var rawRole = fileNameWithoutExt[3..]; // after 'cv_'
                var role = FormatRoleName(rawRole);
                seedResumes[role] = File.ReadAllText(file);
            }
            else if (fileNameWithoutExt.Equals("cv", StringComparison.OrdinalIgnoreCase))
            {
                seedResumes["Backend"] = File.ReadAllText(file);
            }
            else if (fileNameWithoutExt.Equals("cv_f", StringComparison.OrdinalIgnoreCase))
            {
                seedResumes["Full Stack"] = File.ReadAllText(file);
            }
        }

        return seedResumes;
    }

    private static string FormatRoleName(string raw)
    {
        if (raw.Equals("f", StringComparison.OrdinalIgnoreCase)) return "Full Stack";
        var parts = raw.Split(['_', '-'], StringSplitOptions.RemoveEmptyEntries);
        return string.Join(" ", parts.Select(p => char.ToUpperInvariant(p[0]) + p[1..].ToLowerInvariant()));
    }
}

public static class PromptExtensions
{
    public static string Render(this string template, params (string Key, string Value)[] values) =>
        values.Aggregate(template, (result, v) => result.Replace($"{{{{{v.Key}}}}}", v.Value));
}

