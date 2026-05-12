using AiWearStudio.CompanyAdmin.Domain.Entities;
using AiWearStudio.CompanyAdmin.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.CompanyAdmin.Infrastructure.Persistence;

public class CompanyAdminDbContext(DbContextOptions<CompanyAdminDbContext> options) : DbContext(options)
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<PlanAuditLog> PlanAuditLogs => Set<PlanAuditLog>();
    public DbSet<CompanyFeatureFlag> CompanyFeatureFlags => Set<CompanyFeatureFlag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("company_admin");

        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("companies");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("id");
            entity.Property(c => c.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(c => c.Slug).HasColumnName("slug").HasMaxLength(100).IsRequired();
            entity.Property(c => c.Plan).HasColumnName("plan").HasConversion<string>().HasMaxLength(50);
            entity.Property(c => c.PlanStatus).HasColumnName("plan_status").HasConversion<string>().HasMaxLength(50);
            entity.Property(c => c.TrialEndsAt).HasColumnName("trial_ends_at");
            entity.Property(c => c.ActivatedBy).HasColumnName("activated_by");
            entity.Property(c => c.ActivatedAt).HasColumnName("activated_at");
            entity.Property(c => c.CreatedAt).HasColumnName("created_at");
            entity.Property(c => c.Settings).HasColumnName("settings").HasColumnType("jsonb");
            entity.Property(c => c.DeletedAt).HasColumnName("deleted_at");

            entity.HasQueryFilter(c => c.DeletedAt == null);
            entity.HasIndex(c => c.Slug, "uix_company_slug").IsUnique();
        });

        modelBuilder.Entity<PlanAuditLog>(entity =>
        {
            entity.ToTable("plan_audit_log");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("id");
            entity.Property(p => p.CompanyId).HasColumnName("company_id");
            entity.Property(p => p.AdminId).HasColumnName("admin_id");
            entity.Property(p => p.PreviousPlan).HasColumnName("previous_plan").HasConversion<string>().HasMaxLength(50);
            entity.Property(p => p.NewPlan).HasColumnName("new_plan").HasConversion<string>().HasMaxLength(50);
            entity.Property(p => p.Reason).HasColumnName("reason").HasMaxLength(500);
            entity.Property(p => p.ChangedAt).HasColumnName("changed_at");

            entity.HasOne<Company>()
                .WithMany()
                .HasForeignKey(p => p.CompanyId)
                .HasConstraintName("fk_plan_audit_log_company")
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(p => p.CompanyId, "ix_plan_audit_log_company_id");
        });

        modelBuilder.Entity<CompanyFeatureFlag>(entity =>
        {
            entity.ToTable("company_feature_flags");
            entity.HasKey(f => new { f.CompanyId, f.FeatureKey });
            entity.Property(f => f.CompanyId).HasColumnName("company_id");
            entity.Property(f => f.FeatureKey).HasColumnName("feature_key").HasMaxLength(100);
            entity.Property(f => f.Enabled).HasColumnName("enabled");
            entity.Property(f => f.UpdatedAt).HasColumnName("updated_at");
            entity.Property(f => f.UpdatedBy).HasColumnName("updated_by");

            entity.HasOne<Company>()
                .WithMany()
                .HasForeignKey(f => f.CompanyId)
                .HasConstraintName("fk_company_feature_flags_company")
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(f => f.CompanyId, "ix_company_feature_flags_company_id");
        });
    }
}
