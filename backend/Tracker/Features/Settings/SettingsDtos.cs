namespace Tracker.Features.Settings;

public record ProviderStatusDto(
    string Model,
    string MaskedApiKey,
    bool HasApiKey,
    string? BaseUrl);

public record AiSettingsDto(
    string Provider,
    string Model,
    string MaskedApiKey,
    bool HasApiKey,
    string? BaseUrl,
    IReadOnlyDictionary<string, ProviderStatusDto> Providers);

public record CriteriaSettingsDto(
    int MinScore,
    bool RequiresSponsorship,
    bool RequireClearanceCheck,
    string? TargetLocation,
    bool KeepRejectedJobs,
    string? ProfessionalHeadline = null,
    string? TargetSeniority = null,
    string? CurrentLocation = null,
    IReadOnlyList<string>? TargetLocations = null,
    bool? OpenToRelocation = null,
    string? WorkAuthorization = null,
    bool? HasSecurityClearance = null,
    IReadOnlyList<string>? CustomDealbreakers = null);

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
    bool? KeepRejectedJobs = null,
    string? ProfessionalHeadline = null,
    string? TargetSeniority = null,
    string? CurrentLocation = null,
    IReadOnlyList<string>? TargetLocations = null,
    bool? OpenToRelocation = null,
    string? WorkAuthorization = null,
    bool? HasSecurityClearance = null,
    IReadOnlyList<string>? CustomDealbreakers = null);

public record UpdateBlacklistRequest(
    bool? Enabled = null,
    IReadOnlyList<string>? Companies = null);

public record UpdateSettingsRequest(
    UpdateAiSettingsRequest? Ai = null,
    UpdateCriteriaRequest? Criteria = null,
    UpdateBlacklistRequest? Blacklist = null);

