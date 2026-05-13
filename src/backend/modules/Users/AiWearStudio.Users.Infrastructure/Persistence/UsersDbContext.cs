using AiWearStudio.Users.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.Users.Infrastructure.Persistence;

public class UsersDbContext(DbContextOptions<UsersDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<UserInvitation> UserInvitations => Set<UserInvitation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("users");

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasColumnName("id");
            entity.Property(u => u.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
            entity.Property(u => u.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(u => u.Role).HasColumnName("role").HasConversion<string>().HasMaxLength(50);
            entity.Property(u => u.TenantId).HasColumnName("tenant_id");
            entity.Property(u => u.IsActive).HasColumnName("is_active");
            entity.Property(u => u.DeletedAt).HasColumnName("deleted_at");
            entity.Property(u => u.CreatedAt).HasColumnName("created_at");
            entity.Property(u => u.EmailVerified).HasColumnName("email_verified").HasDefaultValue(false);
            entity.Property(u => u.EmailVerifiedAt).HasColumnName("email_verified_at");

            entity.HasQueryFilter(u => u.DeletedAt == null);

            // Dos índices parciales distintos sobre la misma columna — requieren nombres explícitos
            entity.HasIndex(new[] { nameof(User.Email) }, "uix_email_b2c")
                .HasFilter("role = 'Customer'")
                .IsUnique();

            entity.HasIndex(new[] { nameof(User.Email) }, "uix_email_b2b")
                .HasFilter("role != 'Customer'")
                .IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(rt => rt.Id);
            entity.Property(rt => rt.Id).HasColumnName("id");
            entity.Property(rt => rt.UserId).HasColumnName("user_id");
            entity.Property(rt => rt.TokenHash).HasColumnName("token_hash").IsRequired();
            entity.Property(rt => rt.ExpiresAt).HasColumnName("expires_at");
            entity.Property(rt => rt.CreatedAt).HasColumnName("created_at");
            entity.Property(rt => rt.RevokedAt).HasColumnName("revoked_at");

            entity.HasIndex(rt => rt.TokenHash, "uix_refresh_token_hash").IsUnique();

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(rt => rt.UserId)
                .HasConstraintName("fk_refresh_tokens_users")
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserInvitation>(entity =>
        {
            entity.ToTable("user_invitations");
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Id).HasColumnName("id");
            entity.Property(i => i.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
            entity.Property(i => i.Role).HasColumnName("role").HasConversion<string>().HasMaxLength(50);
            entity.Property(i => i.TenantId).HasColumnName("tenant_id");
            entity.Property(i => i.InvitedBy).HasColumnName("invited_by");
            entity.Property(i => i.Token).HasColumnName("token");
            entity.Property(i => i.ExpiresAt).HasColumnName("expires_at");
            entity.Property(i => i.ConsumedAt).HasColumnName("consumed_at");
            entity.Property(i => i.CreatedAt).HasColumnName("created_at");

            entity.HasIndex(i => i.Token, "uix_user_invitation_token").IsUnique();
        });
    }
}
