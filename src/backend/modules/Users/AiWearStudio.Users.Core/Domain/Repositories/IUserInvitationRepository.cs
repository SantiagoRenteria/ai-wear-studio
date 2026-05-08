using AiWearStudio.Users.Core.Domain.Entities;

namespace AiWearStudio.Users.Core.Domain.Repositories;

public interface IUserInvitationRepository
{
    Task<UserInvitation?> FindByTokenAsync(Guid token, CancellationToken ct = default);
    Task<UserInvitation?> FindPendingAsync(string email, Guid tenantId, CancellationToken ct = default);
    Task AddAsync(UserInvitation invitation, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
