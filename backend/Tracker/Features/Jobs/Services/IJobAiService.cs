using Tracker.Features.Jobs.Dtos;

namespace Tracker.Features.Jobs.Services;

public interface IJobAiService
{
    /// <summary>Scores the posting against both resume versions. Returns null when the model gives no usable answer.</summary>
    Task<JobAnalysisResult?> AnalyzeAsync(ImportJobRequest job, CancellationToken ct);

    Task<string> WriteCoverLetterAsync(Job job, CancellationToken ct);

    /// <summary>Rewrites the resume version that matched this posting so it speaks to this posting.</summary>
    Task<TailoredResume?> WriteTailoredResumeAsync(Job job, CancellationToken ct);
}
