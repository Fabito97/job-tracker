namespace Tracker.Domain.Models;

public class Resume
{
    public long Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string DiskPath { get; set; } = string.Empty;
    public string ExtractedText { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
