namespace Tracker.Features.Resumes;

public record ResumeDto(
    long Id,
    string Role,
    string FileName,
    bool IsDefault,
    DateTime CreatedAt,
    string Preview);
