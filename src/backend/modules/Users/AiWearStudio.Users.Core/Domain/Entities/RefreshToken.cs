using AiWearStudio.SharedKernel.Domain;
using System.Security.Cryptography;
using System.Text;

namespace AiWearStudio.Users.Core.Domain.Entities;

public class RefreshToken : Entity
{
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = default!;
    public DateTime ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }

    private RefreshToken() { }

    public static RefreshToken Create(Guid userId, string rawToken, int ttlDays)
    {
        var now = DateTime.UtcNow;
        return new RefreshToken
        {
            UserId = userId,
            TokenHash = ComputeHash(rawToken),
            ExpiresAt = now.AddDays(ttlDays),
            CreatedAt = now
        };
    }

    public static string ComputeHash(string token) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public bool IsExpired() => DateTime.UtcNow > ExpiresAt;
    public bool IsRevoked() => RevokedAt.HasValue;
    public void Revoke() => RevokedAt = DateTime.UtcNow;
}
