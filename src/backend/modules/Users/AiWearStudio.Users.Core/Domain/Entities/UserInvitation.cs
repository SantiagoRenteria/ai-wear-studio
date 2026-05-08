using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Domain.Enums;

namespace AiWearStudio.Users.Core.Domain.Entities;

public class UserInvitation : AggregateRoot
{
    public string Email { get; private set; } = default!;
    public UserRole Role { get; private set; }
    public Guid TenantId { get; private set; }
    public Guid InvitedBy { get; private set; }
    public Guid Token { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? ConsumedAt { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
    public bool IsConsumed => ConsumedAt.HasValue;

    private UserInvitation() { }

    public static UserInvitation Create(string email, UserRole role, Guid tenantId, Guid invitedBy)
    {
        var now = DateTime.UtcNow;
        return new UserInvitation
        {
            Email = email.ToLowerInvariant().Trim(),
            Role = role,
            TenantId = tenantId,
            InvitedBy = invitedBy,
            Token = Guid.NewGuid(),
            ExpiresAt = now.AddHours(48),
            CreatedAt = now
        };
    }

    public void Consume()
    {
        ConsumedAt = DateTime.UtcNow;
    }
}
