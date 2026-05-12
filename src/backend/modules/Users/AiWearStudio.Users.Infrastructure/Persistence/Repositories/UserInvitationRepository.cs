using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.Users.Infrastructure.Persistence.Repositories;

public class UserInvitationRepository(UsersDbContext db) : IUserInvitationRepository
{
    public async Task<UserInvitation?> FindByTokenAsync(Guid token, CancellationToken ct = default)
        => await db.UserInvitations.FirstOrDefaultAsync(i => i.Token == token, ct);

    public async Task<UserInvitation?> FindPendingAsync(string email, Guid tenantId, CancellationToken ct = default)
        => await db.UserInvitations.FirstOrDefaultAsync(
            i => i.Email == email && i.TenantId == tenantId && i.ConsumedAt == null && i.ExpiresAt > DateTime.UtcNow,
            ct);

    public async Task AddAsync(UserInvitation invitation, CancellationToken ct = default)
        => await db.UserInvitations.AddAsync(invitation, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await db.SaveChangesAsync(ct);
}
