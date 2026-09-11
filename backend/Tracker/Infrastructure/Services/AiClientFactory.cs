using System.ClientModel;
using Google.GenAI;
using Microsoft.Extensions.AI;
using OpenAI;
using OpenAI.Chat;

namespace Tracker.Infrastructure.Services;

public record AiClientOptions(
    string? Provider = null,
    string? Model = null,
    string? ApiKey = null,
    string? BaseUrl = null);

public interface IAiClientFactory
{
    IChatClient GetClient();
    IChatClient CreateClient(AiClientOptions? options = null);
}

public sealed class AiClientFactory(IConfiguration config) : IAiClientFactory
{
    public IChatClient GetClient() => CreateClient();

    public IChatClient CreateClient(AiClientOptions? overrides = null)
    {
        var provider = (overrides?.Provider ?? config["AI:Provider"] ?? "gemini").Trim().ToLowerInvariant();

        return provider switch
        {
            "gemini" => CreateGeminiClient(overrides),
            "openai" => CreateOpenAiClient(overrides),
            "groq" or "grok" => CreateGroqClient(overrides),
            "custom" or "ollama" => CreateCustomOpenAiCompatibleClient(overrides),
            _ => throw new NotSupportedException($"AI Provider '{provider}' is not supported. Supported providers are: gemini, openai, groq, grok, custom.")
        };
    }

    private IChatClient CreateGeminiClient(AiClientOptions? overrides)
    {
        var apiKey = overrides?.ApiKey ?? config["Gemini:ApiKey"] ?? config["AI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Gemini API key is missing in configuration (Gemini:ApiKey).");

        var model = overrides?.Model ?? config["Gemini:Model"] ?? config["AI:Model"] ?? "gemini-2.5-flash";

        return new Client(apiKey: apiKey).AsIChatClient(model);
    }

    private IChatClient CreateOpenAiClient(AiClientOptions? overrides)
    {
        var apiKey = overrides?.ApiKey ?? config["OpenAI:ApiKey"] ?? config["AI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("OpenAI API key is missing in configuration (OpenAI:ApiKey).");

        var model = overrides?.Model ?? config["OpenAI:Model"] ?? "gpt-4o-mini";
        var baseUrl = overrides?.BaseUrl ?? config["OpenAI:BaseUrl"];

        if (!string.IsNullOrWhiteSpace(baseUrl))
        {
            var clientOptions = new OpenAIClientOptions { Endpoint = new Uri(baseUrl) };
            var openAiClient = new OpenAIClient(new ApiKeyCredential(apiKey), clientOptions);
            return openAiClient.GetChatClient(model).AsIChatClient();
        }

        return new ChatClient(model, apiKey).AsIChatClient();
    }

    private IChatClient CreateGroqClient(AiClientOptions? overrides)
    {
        var apiKey = overrides?.ApiKey ?? config["Groq:ApiKey"] ?? config["Grok:ApiKey"] ?? config["AI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Groq/Grok API key is missing in configuration (Groq:ApiKey).");

        var model = overrides?.Model ?? config["Groq:Model"] ?? config["Grok:Model"] ?? "llama-3.3-70b-versatile";
        var baseUrl = overrides?.BaseUrl ?? config["Groq:BaseUrl"] ?? config["Grok:BaseUrl"];

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = apiKey.StartsWith("xai-", StringComparison.OrdinalIgnoreCase)
                ? "https://api.x.ai/v1"
                : "https://api.groq.com/openai/v1";
        }

        var clientOptions = new OpenAIClientOptions { Endpoint = new Uri(baseUrl) };
        var openAiClient = new OpenAIClient(new ApiKeyCredential(apiKey), clientOptions);
        return openAiClient.GetChatClient(model).AsIChatClient();
    }

    private IChatClient CreateCustomOpenAiCompatibleClient(AiClientOptions? overrides)
    {
        var apiKey = overrides?.ApiKey ?? config["CustomAI:ApiKey"] ?? "dummy-key";
        var model = overrides?.Model ?? config["CustomAI:Model"] ?? "default";
        var baseUrl = overrides?.BaseUrl ?? config["CustomAI:BaseUrl"] ?? "http://localhost:11434/v1";

        var clientOptions = new OpenAIClientOptions { Endpoint = new Uri(baseUrl) };
        var openAiClient = new OpenAIClient(new ApiKeyCredential(apiKey), clientOptions);
        return openAiClient.GetChatClient(model).AsIChatClient();
    }
}

