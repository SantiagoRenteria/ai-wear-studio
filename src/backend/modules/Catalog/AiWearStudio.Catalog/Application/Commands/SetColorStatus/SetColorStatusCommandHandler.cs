using AiWearStudio.Catalog.Domain.Repositories;
using AiWearStudio.SharedKernel.Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AiWearStudio.Catalog.Application.Commands.SetColorStatus;

public class SetColorStatusCommandHandler(
    IAdminCatalogRepository repo,
    ILogger<SetColorStatusCommandHandler> logger)
    : IRequestHandler<SetColorStatusCommand>
{
    public async Task Handle(SetColorStatusCommand request, CancellationToken ct)
    {
        if (!await repo.ColorBelongsToGarmentAsync(request.GarmentId, request.ColorVariantId, ct))
            throw new DomainException($"COLOR_NOT_FOUND: El color '{request.ColorVariantId}' no pertenece a la prenda '{request.GarmentId}'.");

        if (!request.IsActive)
        {
            var activeCount = await repo.CountActiveColorsForGarmentAsync(request.TenantId, request.GarmentId, ct);
            if (activeCount <= 1)
                throw new DomainException($"LAST_COLOR_ACTIVE: La prenda '{request.GarmentId}' debe tener al menos un color disponible para permanecer activa.");
        }

        await repo.UpsertColorStatusAsync(request.TenantId, request.ColorVariantId, request.IsActive, ct);

        logger.LogInformation(
            "catalog.admin.set_color_status tenant_id={TenantId} admin_id={AdminId} entity_type=color entity_id={ColorVariantId} garment_id={GarmentId} is_active={IsActive}",
            request.TenantId, request.AdminId, request.ColorVariantId, request.GarmentId, request.IsActive);
    }
}
