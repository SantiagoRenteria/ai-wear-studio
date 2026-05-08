using AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;

namespace AiWearStudio.Catalog.Infrastructure.Caching;

public interface ICatalogCache
{
    Task<List<GarmentDto>?> GetGarmentsAsync(Guid tenantId, CancellationToken ct = default);
    Task SetGarmentsAsync(Guid tenantId, List<GarmentDto> garments, CancellationToken ct = default);
    Task InvalidateGarmentsAsync(Guid tenantId, CancellationToken ct = default);
}
