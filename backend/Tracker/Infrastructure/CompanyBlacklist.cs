using System.Text.RegularExpressions;
using Tracker.Infrastructure.Services;

namespace Tracker.Infrastructure;

/// <summary>
/// Screens out companies listed in blacklist settings before any money is spent on an AI call.
/// The check runs in code rather than in the prompt so it is deterministic and free.
/// </summary>
public sealed partial class CompanyBlacklist(ISettingsService settingsService)
{
    // Entries carry trailing notes such as "Devcare – Columbus, OH" or "Brighter Brain (aka ...)".
    private static readonly string[] NoteSeparators = [" or ", ";", "(", "~", "–", "—", "/"];
    private static readonly string[] LegalSuffixes = ["inc", "llc", "ltd", "corp", "corporation", "limited", "company", "co", "the"];

    // Splits on any run of punctuation or spacing, including the non-breaking spaces the file contains.
    [GeneratedRegex(@"[^\p{L}\p{N}]+")]
    private static partial Regex WordSeparator();

    public bool IsBlacklisted(string? company)
    {
        var blacklist = settingsService.GetBlacklistSettings();
        if (!blacklist.Enabled) return false;

        var key = NormalizeKey(company);
        if (key.Length == 0) return false;

        // Whole words only, so "Meta" is not caught by the entry "Metahorizon".
        return blacklist.NormalizedKeys.Any(e => e == key || e.StartsWith($"{key} ") || key.StartsWith($"{e} "));
    }

    public static string NormalizeKey(string? value)
    {
        var name = (value ?? string.Empty).Split(NoteSeparators, StringSplitOptions.None)[0];

        var words = WordSeparator().Split(name)
            .Select(word => word.ToLowerInvariant())
            .Where(word => word.Length > 0 && !LegalSuffixes.Contains(word));

        return string.Join(' ', words);
    }
}
