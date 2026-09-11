using OpenAI.Chat;

namespace Tracker.Infrastructure.Services;

public static class ChatClientExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static async Task<string> CompleteTextAsync(this ChatClient chatgpt, string prompt, CancellationToken ct)
    {
        var completion = await chatgpt.CompleteChatAsync([prompt], cancellationToken: ct);

        return completion.Value.Content.Count == 0 ? string.Empty : completion.Value.Content[0].Text;
    }

    /// <summary>Completes a prompt and reads the JSON object out of the reply, tolerating markdown fences.</summary>
    public static async Task<T?> CompleteJsonAsync<T>(this ChatClient chatgpt, string prompt, ILogger logger, CancellationToken ct)
    {
        var text = await chatgpt.CompleteTextAsync(prompt, ct);

        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start)
        {
            logger.LogError("Model reply contained no JSON object. Reply: {Reply}", text);
            return default;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(text[start..(end + 1)], JsonOptions);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Failed to deserialize model reply. Reply: {Reply}", text);
            return default;
        }
    }
}
