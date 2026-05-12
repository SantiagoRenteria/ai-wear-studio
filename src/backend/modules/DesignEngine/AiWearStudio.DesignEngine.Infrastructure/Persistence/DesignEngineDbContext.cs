using AiWearStudio.DesignEngine.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.DesignEngine.Infrastructure.Persistence;

public class DesignEngineDbContext(DbContextOptions<DesignEngineDbContext> options) : DbContext(options)
{
    public DbSet<DesignDraft> DesignDrafts => Set<DesignDraft>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DesignDraft>(e =>
        {
            e.ToTable("design_drafts");
            e.HasKey(d => d.Id);
            e.Property(d => d.Id).HasColumnName("id");
            e.Property(d => d.TenantId).HasColumnName("tenant_id").IsRequired();
            e.Property(d => d.UserId).HasColumnName("user_id").IsRequired();
            e.Property(d => d.SnapshotJson).HasColumnName("snapshot_json").IsRequired();
            e.Property(d => d.ETag).HasColumnName("etag").HasMaxLength(32).IsRequired();
            e.Property(d => d.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(d => d.UpdatedAt).HasColumnName("updated_at").IsRequired();

            e.HasIndex(d => new { d.TenantId, d.Id }).HasDatabaseName("ix_design_drafts_tenant_id");
        });
    }
}
