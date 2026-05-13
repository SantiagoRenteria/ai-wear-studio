using AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;
using AiWearStudio.Catalog.Application.Queries.GetGarmentZones;

namespace AiWearStudio.Catalog.Domain.Repositories;

public interface IGarmentRepository
{
    Task<List<GarmentDto>> GetActiveGarmentsAsync(Guid tenantId, CancellationToken ct = default);
    Task<List<PrintZoneDto>> GetViewZonesAsync(Guid garmentId, Guid viewId, CancellationToken ct = default);
}
