using AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;
using AiWearStudio.Catalog.Application.Queries.GetGarmentZones;
using AiWearStudio.Catalog.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.Catalog.Infrastructure.Persistence.Repositories;

public class GarmentRepository(CatalogDbContext db) : IGarmentRepository
{
    public async Task<List<GarmentDto>> GetActiveGarmentsAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await db.Garments
            .Where(g => !db.TenantGarmentStatuses
                .Any(s => s.TenantId == tenantId && s.GarmentId == g.Id && !s.IsActive))
            .Include(g => g.ColorVariants.OrderBy(c => c.DisplayOrder))
            .OrderBy(g => g.DisplayOrder)
            .Select(g => new GarmentDto(
                g.Id,
                g.Name,
                g.Category,
                g.ColorVariants
                    .OrderBy(c => c.DisplayOrder)
                    .Select(c => new ColorVariantDto(c.Id, c.ColorName, c.HexCode))
                    .ToList()))
            .ToListAsync(ct);
    }

    public async Task<List<PrintZoneDto>> GetViewZonesAsync(Guid garmentId, Guid viewId, CancellationToken ct = default)
    {
        return await db.PrintZones
            .Include(z => z.RecommendedTechnique)
            .Where(z => z.GarmentViewId == viewId &&
                        db.GarmentViews.Any(v => v.Id == viewId && v.GarmentId == garmentId))
            .Select(z => new PrintZoneDto(
                z.Id,
                z.Name,
                z.XCm,
                z.YCm,
                z.WidthCm,
                z.HeightCm,
                z.RecommendedTechnique != null ? z.RecommendedTechnique.Name : null))
            .ToListAsync(ct);
    }
}
