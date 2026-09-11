using System.Globalization;
using System.Text.RegularExpressions;

namespace Tracker.Infrastructure;

/// <summary>Turns the loose "date" value of a job board export into a real date.</summary>
public static partial class RelativeDate
{
    [GeneratedRegex(@"^(\d+)\+?\s*(hour|day|week|month)s?\s+ago$")]
    private static partial Regex Relative();

    public static DateOnly Parse(string? value)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        if (string.IsNullOrWhiteSpace(value)) return today;

        var text = value.Trim().ToLowerInvariant();
        if (text is "today" or "just posted" or "new") return today;
        if (text is "yesterday") return today.AddDays(-1);

        var relative = Relative().Match(text);
        if (relative.Success)
        {
            var count = int.Parse(relative.Groups[1].Value);
            return relative.Groups[2].Value switch
            {
                "hour" => today,
                "day" => today.AddDays(-count),
                "week" => today.AddDays(-7 * count),
                _ => today.AddMonths(-count)
            };
        }

        return DateOnly.TryParse(text, CultureInfo.InvariantCulture, out var parsed) ? parsed : today;
    }
}

/// <summary>Derives the job board name from the posting URL so it can be used as a filter.</summary>
public static class JobBoards
{
    public static string FromUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return "Other";

        var labels = uri.Host.Split('.');
        var name = labels.Length >= 2 ? labels[^2] : uri.Host;

        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(name);
    }
}
