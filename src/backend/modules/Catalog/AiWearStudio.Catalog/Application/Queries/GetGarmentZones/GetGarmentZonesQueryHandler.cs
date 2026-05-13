using AiWearStudio.Catalog.Domain.Repositories;
using AiWearStudio.SharedKernel.Domain;
using MediatR;

namespace AiWearStudio.Catalog.Application.Queries.GetGarmentZones;

public class GetGarmentZonesQueryHandler(IGarmentRepository repo)
    : IRequestHandler<GetGarmentZonesQuery, List<PrintZoneDto>>
{
    public async Task<List<PrintZoneDto>> Handle(GetGarmentZonesQuery request, CancellationToken ct)
    {
        var zones = await repo.GetViewZonesAsync(request.GarmentId, request.ViewId, ct);
        if (zones.Count == 0)
            throw new DomainException($"GARMENT_VIEW_NOT_FOUND: La vista '{request.ViewId}' no existe para la prenda '{request.GarmentId}'.");
        return zones;
    }
}
