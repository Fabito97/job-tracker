namespace Tracker.Features.Settings;

public record AiSettingsDto(
    string Provider,
    string Model,
    string MaskedApiKey,
    bool HasApiKey,
    string? BaseUrl);

public record CriteriaSettingsDto(
    int MinScore,
    bool RequiresSponsorship,
    bool RequireClearanceCheck,
    string? TargetLocation,
    bool KeepRejectedJobs);

public record BlacklistSettingsDto(
    bool Enabled,
    IReadOnlyList<string> Companies);

public record AppSettingsDto(
    AiSettingsDto Ai,
    CriteriaSettingsDto Criteria,
    BlacklistSettingsDto Blacklist,
    IReadOnlyList<string> AvailableProviders);

public record UpdateAiSettingsRequest(
    string? Provider = null,
    string? Model = null,
    string? ApiKey = null,
    string? BaseUrl = null);

public record UpdateCriteriaRequest(
    int? MinScore = null,
    bool? RequiresSponsorship = null,
    bool? RequireClearanceCheck = null,
    string? TargetLocation = null,
    bool? KeepRejectedJobs = null);

public record UpdateBlacklistRequest(
    bool? Enabled = null,
    IReadOnlyList<string>? Companies = null);

public record UpdateSettingsRequest(
    UpdateAiSettingsRequest? Ai = null,
    UpdateCriteriaRequest? Criteria = null,
    UpdateBlacklistRequest? Blacklist = null);

