using Tracker.Features.Jobs.Dtos;

namespace Tracker.Features.Jobs.Services;

public interface IJobImportService
{
    Task<ImportResult> ImportAsync(IReadOnlyList<ImportJobRequest> jobs, CancellationToken ct);
}
