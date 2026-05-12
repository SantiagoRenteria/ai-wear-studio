using AiWearStudio.SharedKernel.Application;

namespace AiWearStudio.Catalog.Application.Queries.GetGarmentZones;

public record GetGarmentZonesQuery(Guid GarmentId, Guid ViewId, Guid TenantId) : IQuery<List<PrintZoneDto>>;
