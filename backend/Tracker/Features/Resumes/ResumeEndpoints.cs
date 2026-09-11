using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Tracker.Infrastructure.Services;

namespace Tracker.Features.Resumes;

public static class ResumeEndpoints
{
    public static IEndpointRouteBuilder MapResumeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/resumes");

        group.MapGet("/", GetAllResumesAsync);
        group.MapPost("/upload", UploadResumeAsync).DisableAntiforgery();
        group.MapDelete("/{id:long}", DeleteResumeAsync);
        group.MapPost("/{id:long}/default", SetDefaultResumeAsync);

        return app;
    }

    private static async Task<Ok<IReadOnlyList<ResumeDto>>> GetAllResumesAsync(
        [FromServices] IResumeService resumeService,
        CancellationToken ct)
    {
        var resumes = await resumeService.GetAllAsync(ct);
        return TypedResults.Ok(resumes);
    }

    private static async Task<Results<Ok<ResumeDto>, BadRequest<string>>> UploadResumeAsync(
        [FromForm] string role,
        [FromForm] IFormFile? file,
        [FromForm] bool isDefault,
        [FromServices] IResumeService resumeService,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return TypedResults.BadRequest("File is required.");

        if (string.IsNullOrWhiteSpace(role))
            return TypedResults.BadRequest("Role is required.");

        try
        {
            var result = await resumeService.UploadAsync(role, file, isDefault, ct);
            return TypedResults.Ok(result);
        }
        catch (ArgumentException ex)
        {
            return TypedResults.BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return TypedResults.BadRequest(ex.Message);
        }
    }

    private static async Task<Results<NoContent, NotFound>> DeleteResumeAsync(
        long id,
        [FromServices] IResumeService resumeService,
        CancellationToken ct)
    {
        var deleted = await resumeService.DeleteAsync(id, ct);
        return deleted ? TypedResults.NoContent() : TypedResults.NotFound();
    }

    private static async Task<Results<NoContent, NotFound>> SetDefaultResumeAsync(
        long id,
        [FromServices] IResumeService resumeService,
        CancellationToken ct)
    {
        var updated = await resumeService.SetDefaultAsync(id, ct);
        return updated ? TypedResults.NoContent() : TypedResults.NotFound();
    }
}
