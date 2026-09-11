using System.Diagnostics.CodeAnalysis;

namespace Tracker.Infrastructure;

/// <summary>
/// Reads the prompt templates and resume text shipped in the Prompts folder once at startup.
/// Keeping them as files means the wording can be tuned without touching C#.
/// </summary>
public sealed class PromptStore
{
    private static readonly string PromptDirectory = Path.Combine(AppContext.BaseDirectory, "Prompts");

    private readonly Dictionary<string, string> _files = Directory
        .EnumerateFiles(PromptDirectory, "*.txt")
        .ToDictionary(file => Path.GetFileNameWithoutExtension(file), File.ReadAllText, StringComparer.OrdinalIgnoreCase);

    public string Get(string name) => _files.TryGetValue(name, out var text)
        ? text
        : throw new FileNotFoundException($"Prompt file '{name}.txt' was not found in {PromptDirectory}.");

    public bool TryGet(string name, [NotNullWhen(true)] out string? text) => _files.TryGetValue(name, out text);

    public IReadOnlyDictionary<string, string> GetResumes()
    {
        var resumes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, content) in _files)
        {
            if (key.Equals("cv", StringComparison.OrdinalIgnoreCase))
                resumes["Backend"] = content;
            else if (key.Equals("cv_f", StringComparison.OrdinalIgnoreCase))
                resumes["Full Stack"] = content;
            else if (key.StartsWith("cv_", StringComparison.OrdinalIgnoreCase) || key.StartsWith("resume", StringComparison.OrdinalIgnoreCase))
                resumes[key] = content;
        }

        return resumes;
    }

    public string GetResume(string? version)
    {
        var resumes = GetResumes();
        if (resumes.Count == 0)
        {
            if (_files.TryGetValue("cv", out var cv)) return cv;
            throw new InvalidOperationException($"No candidate resumes were found in {PromptDirectory}.");
        }

        if (!string.IsNullOrWhiteSpace(version) && resumes.TryGetValue(version, out var matched))
            return matched;

        // Fallback to Backend or the first available resume
        return resumes.TryGetValue("Backend", out var backend) ? backend : resumes.Values.First();
    }
}

public static class PromptExtensions
{
    public static string Render(this string template, params (string Key, string Value)[] values) =>
        values.Aggregate(template, (result, v) => result.Replace($"{{{{{v.Key}}}}}", v.Value));
}

