using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Domain.Enums;

namespace AiWearStudio.Users.Core.Domain.Entities;

public class User : AggregateRoot
{
    public string Email { get; private set; } = default!;
    public string PasswordHash { get; private set; } = default!;
    public UserRole Role { get; private set; }
    public Guid? TenantId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime? DeletedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    private User() { }

    public static User CreateCustomer(string email, string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash);
        return new User
        {
            Email = email.ToLowerInvariant().Trim(),
            PasswordHash = passwordHash,
            Role = UserRole.Customer,
            TenantId = null
        };
    }

    public static User CreateInternalUser(string email, string passwordHash, UserRole role, Guid tenantId)
    {
        if (role == UserRole.Customer)
            throw new DomainException("Use CreateCustomer for customer accounts.");
        return new User
        {
            Email = email.ToLowerInvariant().Trim(),
            PasswordHash = passwordHash,
            Role = role,
            TenantId = tenantId
        };
    }

    public static User CreatePlatformAdmin(string email, string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash);
        return new User
        {
            Email = email.ToLowerInvariant().Trim(),
            PasswordHash = passwordHash,
            Role = UserRole.PlatformAdmin,
            TenantId = null
        };
    }

    public void Deactivate()
    {
        IsActive = false;
        DeletedAt = DateTime.UtcNow;
    }
}
