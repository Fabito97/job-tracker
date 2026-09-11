using System.Text.Json;
using Google.GenAI;

namespace Tracker.Infrastructure.Services;

public static class GeminiClientExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static async Task<string> CompleteTextAsync(this Client gemini, string model, string prompt, CancellationToken ct)
    {
        // The official SDK uses Models.GenerateContentAsync for basic text generation
        var response = await gemini.Models.GenerateContentAsync(
            model: model,
            contents: prompt,
            cancellationToken: ct
        );

        return response.Text ?? string.Empty;
    }

    /// <summary>Completes a prompt natively enforcing JSON output from Gemini and deserializes it.</summary>
    public static async Task<T?> CompleteJsonAsync<T>(this Client gemini, string model, string prompt, ILogger logger, CancellationToken ct)
    {
        try
        {
            var response = await gemini.Models.GenerateContentAsync(
                model: model,
                contents: prompt,
                config: new Google.GenAI.Types.GenerateContentConfig
                {
                    // Forces Gemini to output pure, valid JSON
                    ResponseMimeType = "application/json" 
                },
                cancellationToken: ct
            );

            var text = response.Text;
            if (string.IsNullOrWhiteSpace(text))
            {
                logger.LogError("Gemini returned an empty response for JSON generation.");
                return default;
            }

            return JsonSerializer.Deserialize<T>(text, JsonOptions);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Failed to deserialize Gemini JSON reply.");
            return default;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Gemini API call failed during JSON generation.");
            return default;
        }
    }
}
