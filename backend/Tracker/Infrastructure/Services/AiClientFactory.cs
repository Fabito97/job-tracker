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

public sealed class AiClientFactory(ISettingsService settings, IConfiguration config) : IAiClientFactory
{
    public IChatClient GetClient() => CreateClient(settings.GetAiOptions());

    public IChatClient CreateClient(AiClientOptions? overrides = null)
    {
        var active = settings.GetAiOptions();
        var provider = (overrides?.Provider ?? active.Provider ?? config["AI:Provider"] ?? "gemini").Trim().ToLowerInvariant();

        return provider switch
        {
            "gemini" => CreateGeminiClient(overrides, active),
            "openai" => CreateOpenAiClient(overrides, active),
            "groq" or "grok" => CreateGroqClient(overrides, active),
            "custom" or "ollama" => CreateCustomOpenAiCompatibleClient(overrides, active),
            _ => throw new NotSupportedException($"AI Provider '{provider}' is not supported. Supported providers are: gemini, openai, groq, grok, custom.")
        };
    }

    private IChatClient CreateGeminiClient(AiClientOptions? overrides, AiClientOptions active)
    {
        var apiKey = overrides?.ApiKey ?? (active.Provider == "gemini" ? active.ApiKey : null) ?? config["Gemini:ApiKey"] ?? config["AI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Gemini API key is missing. Set it in the settings or configuration (Gemini:ApiKey).");

        var model = overrides?.Model ?? (active.Provider == "gemini" ? active.Model : null) ?? config["Gemini:Model"] ?? config["AI:Model"] ?? "gemini-2.5-flash";

        return new Client(apiKey: apiKey).AsIChatClient(model);
    }

    private IChatClient CreateOpenAiClient(AiClientOptions? overrides, AiClientOptions active)
    {
        var apiKey = overrides?.ApiKey ?? (active.Provider == "openai" ? active.ApiKey : null) ?? config["OpenAI:ApiKey"] ?? config["AI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("OpenAI API key is missing. Set it in the settings or configuration (OpenAI:ApiKey).");

        var model = overrides?.Model ?? (active.Provider == "openai" ? active.Model : null) ?? config["OpenAI:Model"] ?? "gpt-4o-mini";
        var baseUrl = overrides?.BaseUrl ?? (active.Provider == "openai" ? active.BaseUrl : null) ?? config["OpenAI:BaseUrl"];

        if (!string.IsNullOrWhiteSpace(baseUrl))
        {
            var clientOptions = new OpenAIClientOptions { Endpoint = new Uri(baseUrl) };
            var openAiClient = new OpenAIClient(new ApiKeyCredential(apiKey), clientOptions);
            return openAiClient.GetChatClient(model).AsIChatClient();
        }

        return new ChatClient(model, apiKey).AsIChatClient();
    }

    private IChatClient CreateGroqClient(AiClientOptions? overrides, AiClientOptions active)
    {
        var isGroqOrGrok = active.Provider is "groq" or "grok";
        var apiKey = overrides?.ApiKey ?? (isGroqOrGrok ? active.ApiKey : null) ?? config["Groq:ApiKey"] ?? config["Grok:ApiKey"] ?? config["AI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Groq/Grok API key is missing. Set it in the settings or configuration (Groq:ApiKey).");

        var model = overrides?.Model ?? (isGroqOrGrok ? active.Model : null) ?? config["Groq:Model"] ?? config["Grok:Model"] ?? "llama-3.3-70b-versatile";
        var baseUrl = overrides?.BaseUrl ?? (isGroqOrGrok ? active.BaseUrl : null) ?? config["Groq:BaseUrl"] ?? config["Grok:BaseUrl"];

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

    private IChatClient CreateCustomOpenAiCompatibleClient(AiClientOptions? overrides, AiClientOptions active)
    {
        var isCustom = active.Provider is "custom" or "ollama";
        var apiKey = overrides?.ApiKey ?? (isCustom ? active.ApiKey : null) ?? config["CustomAI:ApiKey"] ?? "dummy-key";
        var model = overrides?.Model ?? (isCustom ? active.Model : null) ?? config["CustomAI:Model"] ?? "default";
        var baseUrl = overrides?.BaseUrl ?? (isCustom ? active.BaseUrl : null) ?? config["CustomAI:BaseUrl"] ?? "http://localhost:11434/v1";

        var clientOptions = new OpenAIClientOptions { Endpoint = new Uri(baseUrl) };
        var openAiClient = new OpenAIClient(new ApiKeyCredential(apiKey), clientOptions);
        return openAiClient.GetChatClient(model).AsIChatClient();
    }
}

