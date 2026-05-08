using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Enums;

namespace AiWearStudio.Users.Core.Domain.Repositories;

public interface IUserRepository
{
    Task<User?> FindByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> FindByIdAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsWithEmailAndRoleGroupAsync(string email, bool isCustomer, CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
