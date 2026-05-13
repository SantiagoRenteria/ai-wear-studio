using AiWearStudio.Catalog.Application.Queries.GetAdminCatalog;
using AiWearStudio.Catalog.Domain.Entities;
using AiWearStudio.Catalog.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.Catalog.Infrastructure.Persistence.Repositories;

public class AdminCatalogRepository(CatalogDbContext db) : IAdminCatalogRepository
{
    public async Task<List<AdminGarmentDto>> GetAdminCatalogAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await db.Garments
            .OrderBy(g => g.DisplayOrder)
            .Include(g => g.ColorVariants.OrderBy(c => c.DisplayOrder))
            .Select(g => new AdminGarmentDto(
                g.Id,
                g.Name,
                g.Category,
                !db.TenantGarmentStatuses
                    .Any(s => s.TenantId == tenantId && s.GarmentId == g.Id && !s.IsActive),
                g.ColorVariants
                    .OrderBy(c => c.DisplayOrder)
                    .Select(c => new AdminColorDto(
                        c.Id,
                        c.ColorName,
                        c.HexCode,
                        !db.TenantColorStatuses
                            .Any(s => s.TenantId == tenantId && s.ColorVariantId == c.Id && !s.IsActive)))
                    .ToList()))
            .ToListAsync(ct);
    }

    public Task<bool> GarmentExistsAsync(Guid garmentId, CancellationToken ct = default) =>
        db.Garments.AnyAsync(g => g.Id == garmentId, ct);

    public Task<bool> ColorBelongsToGarmentAsync(Guid garmentId, Guid colorVariantId, CancellationToken ct = default) =>
        db.GarmentColorVariants.AnyAsync(c => c.GarmentId == garmentId && c.Id == colorVariantId, ct);

    public async Task<int> CountActiveColorsForGarmentAsync(Guid tenantId, Guid garmentId, CancellationToken ct = default)
    {
        var totalColors = await db.GarmentColorVariants
            .Where(c => c.GarmentId == garmentId)
            .Select(c => c.Id)
            .ToListAsync(ct);

        var deactivatedColorIds = await db.TenantColorStatuses
            .Where(s => s.TenantId == tenantId && !s.IsActive && totalColors.Contains(s.ColorVariantId))
            .Select(s => s.ColorVariantId)
            .ToListAsync(ct);

        return totalColors.Count - deactivatedColorIds.Count;
    }

    public async Task UpsertGarmentStatusAsync(Guid tenantId, Guid garmentId, bool isActive, CancellationToken ct = default)
    {
        var existing = await db.TenantGarmentStatuses
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.GarmentId == garmentId, ct);

        if (existing is null)
            db.TenantGarmentStatuses.Add(TenantGarmentStatus.Create(tenantId, garmentId, isActive));
        else
            existing.SetActive(isActive);

        await db.SaveChangesAsync(ct);
    }

    public async Task UpsertColorStatusAsync(Guid tenantId, Guid colorVariantId, bool isActive, CancellationToken ct = default)
    {
        var existing = await db.TenantColorStatuses
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ColorVariantId == colorVariantId, ct);

        if (existing is null)
            db.TenantColorStatuses.Add(TenantColorStatus.Create(tenantId, colorVariantId, isActive));
        else
            existing.SetActive(isActive);

        await db.SaveChangesAsync(ct);
    }
}
