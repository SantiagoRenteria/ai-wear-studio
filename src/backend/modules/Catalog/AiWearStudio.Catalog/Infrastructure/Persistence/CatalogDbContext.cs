using AiWearStudio.Catalog.Domain.Entities;
using AiWearStudio.Catalog.Infrastructure.Caching;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.Catalog.Infrastructure.Persistence;

public class CatalogDbContext(DbContextOptions<CatalogDbContext> opts, ICatalogCache cache)
    : DbContext(opts)
{
    public DbSet<Garment> Garments => Set<Garment>();
    public DbSet<GarmentColorVariant> GarmentColorVariants => Set<GarmentColorVariant>();
    public DbSet<GarmentView> GarmentViews => Set<GarmentView>();
    public DbSet<PrintTechnique> PrintTechniques => Set<PrintTechnique>();
    public DbSet<PrintZone> PrintZones => Set<PrintZone>();
    public DbSet<TenantGarmentStatus> TenantGarmentStatuses => Set<TenantGarmentStatus>();

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var affectedTenants = ChangeTracker.Entries<TenantGarmentStatus>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Select(e => e.Entity.TenantId)
            .Distinct()
            .ToList();

        var result = await base.SaveChangesAsync(ct);

        foreach (var tenantId in affectedTenants)
            await cache.InvalidateGarmentsAsync(tenantId, ct);

        return result;
    }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.HasDefaultSchema("catalog");

        mb.Entity<Garment>(e =>
        {
            e.ToTable("garments");
            e.HasKey(g => g.Id);
            e.Property(g => g.Name).HasMaxLength(200).IsRequired();
            e.Property(g => g.Category).HasMaxLength(100).IsRequired();
            e.HasMany(g => g.ColorVariants).WithOne().HasForeignKey(c => c.GarmentId);
            e.HasMany(g => g.Views).WithOne().HasForeignKey(v => v.GarmentId);
            e.HasData(CatalogSeedData.Garments);
        });

        mb.Entity<GarmentColorVariant>(e =>
        {
            e.ToTable("garment_color_variants");
            e.HasKey(c => c.Id);
            e.Property(c => c.ColorName).HasMaxLength(100).IsRequired();
            e.Property(c => c.HexCode).HasMaxLength(7).IsRequired();
            e.HasData(CatalogSeedData.ColorVariants);
        });

        mb.Entity<GarmentView>(e =>
        {
            e.ToTable("garment_views");
            e.HasKey(v => v.Id);
            e.Property(v => v.ViewName).HasMaxLength(50).IsRequired();
            e.HasMany(v => v.PrintZones).WithOne().HasForeignKey(z => z.GarmentViewId);
            e.HasData(CatalogSeedData.GarmentViews);
        });

        mb.Entity<PrintTechnique>(e =>
        {
            e.ToTable("print_techniques");
            e.HasKey(t => t.Id);
            e.Property(t => t.Name).HasMaxLength(100).IsRequired();
            e.Property(t => t.Description).HasMaxLength(500);
            e.HasData(CatalogSeedData.PrintTechniques);
        });

        mb.Entity<PrintZone>(e =>
        {
            e.ToTable("print_zones");
            e.HasKey(z => z.Id);
            e.Property(z => z.Name).HasMaxLength(100).IsRequired();
            e.Property(z => z.XCm).HasPrecision(8, 2);
            e.Property(z => z.YCm).HasPrecision(8, 2);
            e.Property(z => z.WidthCm).HasPrecision(8, 2);
            e.Property(z => z.HeightCm).HasPrecision(8, 2);
            e.HasOne(z => z.RecommendedTechnique).WithMany()
                .HasForeignKey(z => z.RecommendedTechniqueId).OnDelete(DeleteBehavior.Restrict);
            e.HasData(CatalogSeedData.PrintZones);
        });

        mb.Entity<TenantGarmentStatus>(e =>
        {
            e.ToTable("tenant_garment_status");
            e.HasKey(s => s.Id);
            e.HasIndex(s => new { s.TenantId, s.GarmentId }).IsUnique()
                .HasDatabaseName("uix_tenant_garment_status");
        });
    }
}
