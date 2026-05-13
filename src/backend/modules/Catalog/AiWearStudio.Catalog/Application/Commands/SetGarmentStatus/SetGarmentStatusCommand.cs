using MediatR;

namespace AiWearStudio.Catalog.Application.Commands.SetGarmentStatus;

public record SetGarmentStatusCommand(Guid TenantId, Guid GarmentId, bool IsActive, Guid AdminId)
    : IRequest;
