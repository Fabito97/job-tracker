namespace Tracker.Domain.Models;

/// <summary>
/// The chosen resume rewritten for one posting. Generated on demand and owned by <see cref="Job"/>
/// as a JSON column, so it is written once and read back whenever the panel is opened.
/// </summary>
public class TailoredResume
{
    public string Summary { get; set; } = string.Empty;

    public List<string> CoreCompetencies { get; set; } = [];

    /// <summary>One entry per line of the resume's technical skills block, such as "Languages: C#, Python".</summary>
    public List<string> TechnicalSkills { get; set; } = [];

    public List<TailoredRole> Experience { get; set; } = [];
}

public class TailoredRole
{
    public string Company { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<string> Bullets { get; set; } = [];
}
