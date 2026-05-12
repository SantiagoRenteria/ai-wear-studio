using AiWearStudio.DesignEngine.Core.Domain.Repositories;
using MediatR;

namespace AiWearStudio.DesignEngine.Core.Application.Queries.GetDesignDraft;

public record GetDesignDraftQuery(Guid DesignId, Guid TenantId) : IRequest<DesignDraftDto?>;

public record DesignDraftDto(Guid Id, string SnapshotJson, string ETag);

public class GetDesignDraftQueryHandler(IDesignDraftRepository repo)
    : IRequestHandler<GetDesignDraftQuery, DesignDraftDto?>
{
    public async Task<DesignDraftDto?> Handle(GetDesignDraftQuery request, CancellationToken ct)
    {
        var draft = await repo.GetByIdAsync(request.DesignId, ct);
        if (draft is null || draft.TenantId != request.TenantId)
            return null;

        return new DesignDraftDto(draft.Id, draft.SnapshotJson, draft.ETag);
    }
}
