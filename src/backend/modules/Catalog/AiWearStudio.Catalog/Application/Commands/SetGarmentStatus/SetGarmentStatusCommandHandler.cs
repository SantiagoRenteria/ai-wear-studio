using AiWearStudio.Catalog.Domain.Repositories;
using AiWearStudio.SharedKernel.Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AiWearStudio.Catalog.Application.Commands.SetGarmentStatus;

public class SetGarmentStatusCommandHandler(
    IAdminCatalogRepository repo,
    ILogger<SetGarmentStatusCommandHandler> logger)
    : IRequestHandler<SetGarmentStatusCommand>
{
    public async Task Handle(SetGarmentStatusCommand request, CancellationToken ct)
    {
        if (!await repo.GarmentExistsAsync(request.GarmentId, ct))
            throw new DomainException($"GARMENT_NOT_FOUND: La prenda '{request.GarmentId}' no existe.");

        await repo.UpsertGarmentStatusAsync(request.TenantId, request.GarmentId, request.IsActive, ct);

        logger.LogInformation(
            "catalog.admin.set_garment_status tenant_id={TenantId} admin_id={AdminId} entity_type=garment entity_id={GarmentId} is_active={IsActive}",
            request.TenantId, request.AdminId, request.GarmentId, request.IsActive);
    }
}
