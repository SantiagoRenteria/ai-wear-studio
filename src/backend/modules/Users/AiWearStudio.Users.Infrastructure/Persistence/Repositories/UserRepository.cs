using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Enums;
using AiWearStudio.Users.Core.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.Users.Infrastructure.Persistence.Repositories;

public class UserRepository(UsersDbContext db) : IUserRepository
{
    public async Task<User?> FindByEmailAsync(string email, CancellationToken ct = default)
        => await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

    public async Task<User?> FindByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task<bool> ExistsWithEmailAndRoleGroupAsync(string email, bool isCustomer, CancellationToken ct = default)
    {
        return isCustomer
            ? await db.Users.IgnoreQueryFilters()
                .AnyAsync(u => u.Email == email && u.Role == UserRole.Customer, ct)
            : await db.Users.IgnoreQueryFilters()
                .AnyAsync(u => u.Email == email && u.Role != UserRole.Customer, ct);
    }

    public async Task AddAsync(User user, CancellationToken ct = default)
        => await db.Users.AddAsync(user, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await db.SaveChangesAsync(ct);
}
