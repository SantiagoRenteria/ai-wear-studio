using AiWearStudio.DesignEngine.Core.Domain.Entities;

namespace AiWearStudio.DesignEngine.Core.Domain.Repositories;

public interface IDesignDraftRepository
{
    Task<DesignDraft?> GetByIdAsync(Guid designId, CancellationToken ct = default);
    Task AddAsync(DesignDraft draft, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
