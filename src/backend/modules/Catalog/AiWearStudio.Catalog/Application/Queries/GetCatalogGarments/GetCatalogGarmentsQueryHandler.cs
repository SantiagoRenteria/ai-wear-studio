using AiWearStudio.Catalog.Domain.Repositories;
using AiWearStudio.Catalog.Infrastructure.Caching;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;

public class GetCatalogGarmentsQueryHandler(
    IGarmentRepository repo,
    ICatalogCache cache,
    ILogger<GetCatalogGarmentsQueryHandler> logger)
    : IRequestHandler<GetCatalogGarmentsQuery, List<GarmentDto>>
{
    public async Task<List<GarmentDto>> Handle(GetCatalogGarmentsQuery request, CancellationToken ct)
    {
        var cached = await cache.GetGarmentsAsync(request.TenantId, ct);
        if (cached is not null)
        {
            logger.LogInformation("catalog.cache.hit tenant_id={TenantId}", request.TenantId);
            return cached;
        }

        logger.LogInformation("catalog.cache.miss tenant_id={TenantId}", request.TenantId);
        var garments = await repo.GetActiveGarmentsAsync(request.TenantId, ct);
        await cache.SetGarmentsAsync(request.TenantId, garments, ct);
        return garments;
    }
}
