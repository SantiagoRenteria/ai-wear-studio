using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.Users.Infrastructure.Persistence.Repositories;

public class RefreshTokenRepository(UsersDbContext db) : IRefreshTokenRepository
{
    public async Task AddAsync(RefreshToken token, CancellationToken ct = default)
        => await db.RefreshTokens.AddAsync(token, ct);

    public async Task<RefreshToken?> FindByTokenHashAsync(string tokenHash, CancellationToken ct = default)
        => await db.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var tokens = await db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var t in tokens) t.Revoke();
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await db.SaveChangesAsync(ct);
}
