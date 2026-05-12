using AiWearStudio.SharedKernel.Application;

namespace AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;

public record GetCatalogGarmentsQuery(Guid TenantId) : IQuery<List<GarmentDto>>;
