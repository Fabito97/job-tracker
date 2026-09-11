using Microsoft.AspNetCore.Http.HttpResults;
using Tracker.Infrastructure.Services;

namespace Tracker.Features.Settings;

public static class SettingsEndpoints
{
    public static IEndpointRouteBuilder MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var settings = app.MapGroup("/api/settings");

        settings.MapGet("/", GetSettings);
        settings.MapPut("/", UpdateSettingsAsync);

        return app;
    }

    private static Ok<AppSettingsDto> GetSettings([FromServices] ISettingsService settingsService) =>
        TypedResults.Ok(settingsService.GetSettingsDto());

    private static async Task<Ok<AppSettingsDto>> UpdateSettingsAsync(
        UpdateSettingsRequest request,
        [FromServices] ISettingsService settingsService,
        CancellationToken ct)
    {
        var updated = await settingsService.UpdateSettingsAsync(request, ct);
        return TypedResults.Ok(updated);
    }
}

