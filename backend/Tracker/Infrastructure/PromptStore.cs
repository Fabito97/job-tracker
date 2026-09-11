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
}

public static class PromptExtensions
{
    public static string Render(this string template, params (string Key, string Value)[] values) =>
        values.Aggregate(template, (result, v) => result.Replace($"{{{{{v.Key}}}}}", v.Value));
}
