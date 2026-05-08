using AiWearStudio.SharedKernel.Common;
using AiWearStudio.Users.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.Users.Infrastructure.Services;

public class TenantAccessRevocationService(UsersDbContext db) : ITenantAccessRevocationService
{
    public async Task RevokeAllTokensForTenantAsync(Guid tenantId, CancellationToken ct = default)
    {
        var userIds = await db.Users
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId)
            .Select(u => u.Id)
            .ToListAsync(ct);

        if (userIds.Count == 0) return;

        var tokens = await db.RefreshTokens
            .Where(rt => userIds.Contains(rt.UserId) && rt.RevokedAt == null)
            .ToListAsync(ct);

        foreach (var token in tokens)
            token.Revoke();

        await db.SaveChangesAsync(ct);
    }
}
