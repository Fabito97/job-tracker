using System.Net;
using System.Text.RegularExpressions;

namespace Tracker.Infrastructure;

/// <summary>Turns the HTML that job board APIs hand back into the plain text the analysis is given.</summary>
public static partial class HtmlText
{
    [GeneratedRegex(@"<(script|style)[^>]*>.*?</\1>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex Dropped();

    /// <summary>The tags that end a line, so the text keeps the shape of the original list or paragraph.</summary>
    [GeneratedRegex(@"<br\s*/?>|</(p|div|li|tr|h[1-6])\s*>", RegexOptions.IgnoreCase)]
    private static partial Regex LineBreak();

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex Tag();

    [GeneratedRegex(@"[ \t]+")]
    private static partial Regex Spaces();

    [GeneratedRegex(@"\n{3,}")]
    private static partial Regex BlankLines();

    public static string ToPlain(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return string.Empty;

        // Greenhouse escapes the markup itself, so the first decode yields HTML and the second the text.
        var text = WebUtility.HtmlDecode(html);
        text = Dropped().Replace(text, string.Empty);
        text = LineBreak().Replace(text, "\n");
        text = Tag().Replace(text, string.Empty);
        text = WebUtility.HtmlDecode(text);
        text = Spaces().Replace(text, " ");

        return BlankLines().Replace(text, "\n\n").Trim();
    }
}
