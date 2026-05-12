using MediatR;

namespace AiWearStudio.Catalog.Application.Queries.GetAdminCatalog;

public record GetAdminCatalogQuery(Guid TenantId) : IRequest<List<AdminGarmentDto>>;
