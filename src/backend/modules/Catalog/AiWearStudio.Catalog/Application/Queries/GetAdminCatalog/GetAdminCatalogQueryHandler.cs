using AiWearStudio.Catalog.Domain.Repositories;
using MediatR;

namespace AiWearStudio.Catalog.Application.Queries.GetAdminCatalog;

public class GetAdminCatalogQueryHandler(IAdminCatalogRepository repo)
    : IRequestHandler<GetAdminCatalogQuery, List<AdminGarmentDto>>
{
    public Task<List<AdminGarmentDto>> Handle(GetAdminCatalogQuery request, CancellationToken ct) =>
        repo.GetAdminCatalogAsync(request.TenantId, ct);
}
