using AiWearStudio.CompanyAdmin.Domain.Constants;
using AiWearStudio.CompanyAdmin.Domain.Entities;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence;
using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.CompanyAdmin.Infrastructure.Services;

public class FeatureFlagService(CompanyAdminDbContext db) : IFeatureFlagService
{
    public async Task<bool> IsEnabledAsync(Guid companyId, string featureKey, CancellationToken ct = default)
    {
        var flag = await db.CompanyFeatureFlags
            .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.FeatureKey == featureKey, ct);

        return flag?.Enabled ?? false;
    }

    public async Task SetFlagAsync(Guid companyId, string featureKey, bool enabled, Guid updatedBy, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(featureKey) || !FeatureFlags.All.Contains(featureKey))
            throw new DomainException($"UNKNOWN_FEATURE_KEY: '{featureKey}' no es una feature key válida.");

        var flag = await db.CompanyFeatureFlags
            .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.FeatureKey == featureKey, ct);

        if (flag is null)
        {
            flag = CompanyFeatureFlag.Create(companyId, featureKey, enabled, updatedBy);
            await db.CompanyFeatureFlags.AddAsync(flag, ct);
        }
        else
        {
            flag.SetEnabled(enabled, updatedBy);
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task SeedForPlanAsync(Guid companyId, IEnumerable<(string key, bool enabled)> defaults, Guid seededBy, CancellationToken ct = default)
    {
        var alreadySeeded = await db.CompanyFeatureFlags
            .AnyAsync(f => f.CompanyId == companyId, ct);

        if (alreadySeeded) return;

        var flags = defaults
            .Select(d => CompanyFeatureFlag.Create(companyId, d.key, d.enabled, seededBy))
            .ToList();

        await db.CompanyFeatureFlags.AddRangeAsync(flags, ct);
        await db.SaveChangesAsync(ct);
    }
}
