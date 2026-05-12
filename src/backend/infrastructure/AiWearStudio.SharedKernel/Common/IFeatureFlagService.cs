namespace AiWearStudio.SharedKernel.Common;

public interface IFeatureFlagService
{
    Task<bool> IsEnabledAsync(Guid companyId, string featureKey, CancellationToken ct = default);
    Task SetFlagAsync(Guid companyId, string featureKey, bool enabled, Guid updatedBy, CancellationToken ct = default);
    Task SeedForPlanAsync(Guid companyId, IEnumerable<(string key, bool enabled)> defaults, Guid seededBy, CancellationToken ct = default);
}
