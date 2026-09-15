using System.Text.Json;
using System.Text.Json.Serialization;
using Tracker.Features.Settings;

namespace Tracker.Infrastructure.Services;

public record BlacklistSettings(
    bool Enabled,
    IReadOnlyList<string> Companies,
    IReadOnlyList<string> NormalizedKeys);

public interface ISettingsService
{
    AppSettingsDto GetSettingsDto();
    CandidateCriteria GetCriteria();
    AiClientOptions GetAiOptions();
    BlacklistSettings GetBlacklistSettings();
    Task<AppSettingsDto> UpdateSettingsAsync(UpdateSettingsRequest request, CancellationToken ct);
}

public sealed class SettingsService : ISettingsService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly string[] SupportedProviders = ["gemini", "groq", "openai", "custom"];

    private readonly string _settingsFilePath;
    private readonly Lock _lock = new();
    private PersistedSettings _state;
    private BlacklistSettings _cachedBlacklist = new(true, [], []);

    public SettingsService(IConfiguration config, IHostEnvironment env, PromptStore prompts)
    {
        var dataDir = Path.Combine(env.ContentRootPath, "Infrastructure", "Data");
        Directory.CreateDirectory(dataDir);
        _settingsFilePath = Path.Combine(dataDir, "settings.json");

        var defaultProvider = config["AI:Provider"] ?? "gemini";
        var defaultModel = config["AI:Model"] ?? config[$"{defaultProvider}:Model"] ?? "gemini-2.5-flash";

        var seedBlacklist = prompts.TryGet("blacklisted", out var blacklistedText) && !string.IsNullOrWhiteSpace(blacklistedText)
            ? blacklistedText
                .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(s => s.Length >= 3 && !s.StartsWith('#'))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList()
            : [];

        _state = new PersistedSettings
        {
            ActiveProvider = defaultProvider,
            ActiveModel = defaultModel,
            Providers = new Dictionary<string, ProviderCredentials>(StringComparer.OrdinalIgnoreCase)
            {
                ["gemini"] = new(
                    config["Gemini:Model"] ?? "gemini-2.5-flash",
                    config["Gemini:ApiKey"] ?? string.Empty,
                    null),
                ["groq"] = new(
                    config["Groq:Model"] ?? "llama-3.3-70b-versatile",
                    config["Groq:ApiKey"] ?? string.Empty,
                    config["Groq:BaseUrl"] ?? "https://api.groq.com/openai/v1"),
                ["openai"] = new(
                    config["OpenAI:Model"] ?? "gpt-4o-mini",
                    config["OpenAI:ApiKey"] ?? string.Empty,
                    config["OpenAI:BaseUrl"]),
                ["custom"] = new(
                    config["CustomAI:Model"] ?? "default",
                    config["CustomAI:ApiKey"] ?? string.Empty,
                    config["CustomAI:BaseUrl"] ?? "http://localhost:11434/v1")
            },
            Criteria = new CandidateCriteria
            {
                MinScore = int.TryParse(config["AnalysisCriteria:MinScore"], out var score) ? score : 60,
                RequiresSponsorship = bool.TryParse(config["AnalysisCriteria:RequiresSponsorship"], out var sponsor) && sponsor,
                RequireClearanceCheck = bool.TryParse(config["AnalysisCriteria:RequireClearanceCheck"], out var clearance) && clearance,
                TargetLocation = config["AnalysisCriteria:TargetLocation"],
                KeepRejectedJobs = !bool.TryParse(config["AnalysisCriteria:KeepRejectedJobs"], out var keep) || keep
            },
            Blacklist = new PersistedBlacklist
            {
                Enabled = true,
                Companies = seedBlacklist
            }
        };

        LoadFromDisk();
        RebuildBlacklistCache();
    }

    private void RebuildBlacklistCache()
    {
        var normalized = _state.Blacklist.Companies
            .Select(CompanyBlacklist.NormalizeKey)
            .Where(k => k.Length >= 3)
            .Distinct()
            .ToArray();

        _cachedBlacklist = new BlacklistSettings(
            Enabled: _state.Blacklist.Enabled,
            Companies: _state.Blacklist.Companies.ToArray(),
            NormalizedKeys: normalized);
    }

    private void LoadFromDisk()
    {
        if (!File.Exists(_settingsFilePath)) return;

        try
        {
            var json = File.ReadAllText(_settingsFilePath);
            var loaded = JsonSerializer.Deserialize<PersistedSettings>(json, JsonOptions);
            if (loaded is not null)
            {
                if (!string.IsNullOrWhiteSpace(loaded.ActiveProvider)) _state.ActiveProvider = loaded.ActiveProvider;
                if (!string.IsNullOrWhiteSpace(loaded.ActiveModel)) _state.ActiveModel = loaded.ActiveModel;
                if (loaded.Criteria is not null) _state.Criteria = loaded.Criteria;

                if (loaded.Providers is not null)
                {
                    foreach (var (k, v) in loaded.Providers)
                    {
                        if (_state.Providers.TryGetValue(k, out var existing))
                        {
                            var resolvedKey = !string.IsNullOrWhiteSpace(v.ApiKey) ? v.ApiKey : existing.ApiKey;
                            _state.Providers[k] = new(
                                !string.IsNullOrWhiteSpace(v.Model) ? v.Model : existing.Model,
                                resolvedKey,
                                v.BaseUrl ?? existing.BaseUrl);
                        }
                        else
                        {
                            _state.Providers[k] = v;
                        }
                    }
                }

                if (loaded.Blacklist is not null)
                {
                    _state.Blacklist.Enabled = loaded.Blacklist.Enabled;
                    if (loaded.Blacklist.Companies is { Count: > 0 } loadedCompanies)
                    {
                        _state.Blacklist.Companies = loadedCompanies;
                    }
                }
            }
        }
        catch
        {
            // Fall back gracefully to configuration defaults if file is corrupted
        }
    }

    public AppSettingsDto GetSettingsDto()
    {
        lock (_lock)
        {
            var provider = _state.ActiveProvider.ToLowerInvariant();
            _state.Providers.TryGetValue(provider, out var provCreds);

            var key = provCreds?.ApiKey ?? string.Empty;
            var maskedKey = MaskKey(key);

            var providerStatuses = new Dictionary<string, ProviderStatusDto>(StringComparer.OrdinalIgnoreCase);
            foreach (var p in SupportedProviders)
            {
                if (_state.Providers.TryGetValue(p, out var creds))
                {
                    var pKey = creds.ApiKey ?? string.Empty;
                    providerStatuses[p] = new ProviderStatusDto(
                        Model: creds.Model,
                        MaskedApiKey: MaskKey(pKey),
                        HasApiKey: !string.IsNullOrWhiteSpace(pKey),
                        BaseUrl: creds.BaseUrl);
                }
                else
                {
                    providerStatuses[p] = new ProviderStatusDto(
                        Model: string.Empty,
                        MaskedApiKey: string.Empty,
                        HasApiKey: false,
                        BaseUrl: null);
                }
            }

            return new AppSettingsDto(
                Ai: new AiSettingsDto(
                    Provider: provider,
                    Model: _state.ActiveModel,
                    MaskedApiKey: maskedKey,
                    HasApiKey: !string.IsNullOrWhiteSpace(key),
                    BaseUrl: provCreds?.BaseUrl,
                    Providers: providerStatuses),
                Criteria: new CriteriaSettingsDto(
                    MinScore: _state.Criteria.MinScore,
                    RequiresSponsorship: _state.Criteria.RequiresSponsorship,
                    RequireClearanceCheck: _state.Criteria.RequireClearanceCheck,
                    TargetLocation: _state.Criteria.TargetLocation,
                    KeepRejectedJobs: _state.Criteria.KeepRejectedJobs,
                    ProfessionalHeadline: _state.Criteria.ProfessionalHeadline,
                    TargetSeniority: _state.Criteria.TargetSeniority,
                    CurrentLocation: _state.Criteria.CurrentLocation,
                    TargetLocations: _state.Criteria.TargetLocations,
                    OpenToRelocation: _state.Criteria.OpenToRelocation,
                    WorkAuthorization: _state.Criteria.WorkAuthorization,
                    HasSecurityClearance: _state.Criteria.HasSecurityClearance,
                    CustomDealbreakers: _state.Criteria.CustomDealbreakers),
                Blacklist: new BlacklistSettingsDto(
                    Enabled: _cachedBlacklist.Enabled,
                    Companies: _cachedBlacklist.Companies),
                AvailableProviders: SupportedProviders);
        }
    }

    public CandidateCriteria GetCriteria()
    {
        lock (_lock) return _state.Criteria with { };
    }

    public AiClientOptions GetAiOptions()
    {
        lock (_lock)
        {
            var provider = _state.ActiveProvider.ToLowerInvariant();
            _state.Providers.TryGetValue(provider, out var creds);

            return new AiClientOptions(
                Provider: provider,
                Model: !string.IsNullOrWhiteSpace(_state.ActiveModel) ? _state.ActiveModel : creds?.Model,
                ApiKey: creds?.ApiKey,
                BaseUrl: creds?.BaseUrl);
        }
    }

    public BlacklistSettings GetBlacklistSettings()
    {
        lock (_lock) return _cachedBlacklist;
    }

    public async Task<AppSettingsDto> UpdateSettingsAsync(UpdateSettingsRequest request, CancellationToken ct)
    {
        PersistedSettings snapshot;

        lock (_lock)
        {
            if (request.Ai is { } ai)
            {
                if (!string.IsNullOrWhiteSpace(ai.Provider))
                    _state.ActiveProvider = ai.Provider.Trim().ToLowerInvariant();

                if (!string.IsNullOrWhiteSpace(ai.Model))
                    _state.ActiveModel = ai.Model.Trim();

                var targetProvider = _state.ActiveProvider.ToLowerInvariant();
                if (!_state.Providers.TryGetValue(targetProvider, out var currentCreds))
                {
                    currentCreds = new ProviderCredentials(_state.ActiveModel, string.Empty, null);
                }

                var updatedModel = !string.IsNullOrWhiteSpace(ai.Model) ? ai.Model.Trim() : currentCreds.Model;
                var updatedKey = !string.IsNullOrWhiteSpace(ai.ApiKey) ? ai.ApiKey.Trim() : currentCreds.ApiKey;
                var updatedBaseUrl = ai.BaseUrl is not null ? ai.BaseUrl.Trim() : currentCreds.BaseUrl;

                _state.Providers[targetProvider] = new ProviderCredentials(updatedModel, updatedKey, updatedBaseUrl);
            }

            if (request.Criteria is { } cr)
            {
                _state.Criteria = new CandidateCriteria
                {
                    MinScore = cr.MinScore ?? _state.Criteria.MinScore,
                    RequiresSponsorship = cr.RequiresSponsorship ?? _state.Criteria.RequiresSponsorship,
                    RequireClearanceCheck = cr.RequireClearanceCheck ?? _state.Criteria.RequireClearanceCheck,
                    TargetLocation = cr.TargetLocation ?? _state.Criteria.TargetLocation,
                    KeepRejectedJobs = cr.KeepRejectedJobs ?? _state.Criteria.KeepRejectedJobs,
                    ProfessionalHeadline = !string.IsNullOrWhiteSpace(cr.ProfessionalHeadline) ? cr.ProfessionalHeadline.Trim() : _state.Criteria.ProfessionalHeadline,
                    TargetSeniority = !string.IsNullOrWhiteSpace(cr.TargetSeniority) ? cr.TargetSeniority.Trim() : _state.Criteria.TargetSeniority,
                    CurrentLocation = !string.IsNullOrWhiteSpace(cr.CurrentLocation) ? cr.CurrentLocation.Trim() : _state.Criteria.CurrentLocation,
                    TargetLocations = cr.TargetLocations is { Count: > 0 } ? cr.TargetLocations : _state.Criteria.TargetLocations,
                    OpenToRelocation = cr.OpenToRelocation ?? _state.Criteria.OpenToRelocation,
                    WorkAuthorization = !string.IsNullOrWhiteSpace(cr.WorkAuthorization) ? cr.WorkAuthorization.Trim() : _state.Criteria.WorkAuthorization,
                    HasSecurityClearance = cr.HasSecurityClearance ?? _state.Criteria.HasSecurityClearance,
                    CustomDealbreakers = cr.CustomDealbreakers ?? _state.Criteria.CustomDealbreakers
                };
            }

            if (request.Blacklist is { } bl)
            {
                if (bl.Enabled.HasValue)
                    _state.Blacklist.Enabled = bl.Enabled.Value;

                if (bl.Companies is not null)
                {
                    _state.Blacklist.Companies = bl.Companies
                        .Where(c => !string.IsNullOrWhiteSpace(c))
                        .Select(c => c.Trim())
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();
                }

                RebuildBlacklistCache();
            }

            snapshot = new PersistedSettings
            {
                ActiveProvider = _state.ActiveProvider,
                ActiveModel = _state.ActiveModel,
                Providers = new Dictionary<string, ProviderCredentials>(_state.Providers, StringComparer.OrdinalIgnoreCase),
                Criteria = _state.Criteria with { },
                Blacklist = new PersistedBlacklist
                {
                    Enabled = _state.Blacklist.Enabled,
                    Companies = [.. _state.Blacklist.Companies]
                }
            };
        }

        await using var stream = File.Create(_settingsFilePath);
        await JsonSerializer.SerializeAsync(stream, snapshot, JsonOptions, ct);

        return GetSettingsDto();
    }

    private static string MaskKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return string.Empty;
        if (key.Length <= 8) return "••••••••";
        return $"{key[..4]}...{key[^4..]}";
    }

    private sealed class PersistedSettings
    {
        public string ActiveProvider { get; set; } = "gemini";
        public string ActiveModel { get; set; } = "gemini-2.5-flash";
        public Dictionary<string, ProviderCredentials> Providers { get; set; } = [];
        public CandidateCriteria Criteria { get; set; } = new();
        public PersistedBlacklist Blacklist { get; set; } = new();
    }

    private sealed class PersistedBlacklist
    {
        public bool Enabled { get; set; } = true;
        public List<string> Companies { get; set; } = [];
    }

    private sealed record ProviderCredentials(string Model, string ApiKey, string? BaseUrl);
}


