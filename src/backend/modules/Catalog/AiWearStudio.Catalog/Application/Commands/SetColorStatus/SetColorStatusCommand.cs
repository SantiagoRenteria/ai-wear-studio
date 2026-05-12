using MediatR;

namespace AiWearStudio.Catalog.Application.Commands.SetColorStatus;

public record SetColorStatusCommand(Guid TenantId, Guid GarmentId, Guid ColorVariantId, bool IsActive, Guid AdminId)
    : IRequest;
