using AiWearStudio.Users.Core.Domain.Entities;

namespace AiWearStudio.Users.Core.Domain.Repositories;

public interface IRefreshTokenRepository
{
    Task AddAsync(RefreshToken token, CancellationToken ct = default);
    Task<RefreshToken?> FindByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
