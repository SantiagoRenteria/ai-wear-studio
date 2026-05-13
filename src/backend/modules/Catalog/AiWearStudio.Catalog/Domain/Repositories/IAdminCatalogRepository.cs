using AiWearStudio.Catalog.Application.Queries.GetAdminCatalog;

namespace AiWearStudio.Catalog.Domain.Repositories;

public interface IAdminCatalogRepository
{
    Task<List<AdminGarmentDto>> GetAdminCatalogAsync(Guid tenantId, CancellationToken ct = default);
    Task<bool> GarmentExistsAsync(Guid garmentId, CancellationToken ct = default);
    Task<bool> ColorBelongsToGarmentAsync(Guid garmentId, Guid colorVariantId, CancellationToken ct = default);
    Task<int> CountActiveColorsForGarmentAsync(Guid tenantId, Guid garmentId, CancellationToken ct = default);
    Task UpsertGarmentStatusAsync(Guid tenantId, Guid garmentId, bool isActive, CancellationToken ct = default);
    Task UpsertColorStatusAsync(Guid tenantId, Guid colorVariantId, bool isActive, CancellationToken ct = default);
}
