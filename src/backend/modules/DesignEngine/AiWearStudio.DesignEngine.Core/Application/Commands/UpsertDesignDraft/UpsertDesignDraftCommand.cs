using AiWearStudio.DesignEngine.Core.Domain.Entities;
using AiWearStudio.DesignEngine.Core.Domain.Repositories;
using AiWearStudio.SharedKernel.Domain;
using MediatR;

namespace AiWearStudio.DesignEngine.Core.Application.Commands.UpsertDesignDraft;

public record UpsertDesignDraftCommand(
    Guid DesignId,
    Guid TenantId,
    Guid UserId,
    string SnapshotJson,
    string IfMatchETag) : IRequest<string>;

public class UpsertDesignDraftCommandHandler(IDesignDraftRepository repo)
    : IRequestHandler<UpsertDesignDraftCommand, string>
{
    public async Task<string> Handle(UpsertDesignDraftCommand request, CancellationToken ct)
    {
        var existing = await repo.GetByIdAsync(request.DesignId, ct);

        if (existing is null)
        {
            if (request.IfMatchETag != "*")
                throw new DomainException($"ETAG_MISMATCH: draft {request.DesignId} does not exist; use If-Match: * to create");

            var draft = DesignDraft.Create(request.DesignId, request.TenantId, request.UserId, request.SnapshotJson);
            await repo.AddAsync(draft, ct);
            await repo.SaveChangesAsync(ct);
            return draft.ETag;
        }

        if (existing.TenantId != request.TenantId)
            throw new DomainException($"ETAG_MISMATCH: draft {request.DesignId} not found");

        if (request.IfMatchETag != existing.ETag)
            throw new DomainException($"ETAG_MISMATCH: expected '{existing.ETag}', received '{request.IfMatchETag}'");

        existing.Update(request.SnapshotJson);
        await repo.SaveChangesAsync(ct);
        return existing.ETag;
    }
}
