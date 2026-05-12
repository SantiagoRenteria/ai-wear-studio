using AiWearStudio.DesignEngine.Core.Domain.Entities;
using AiWearStudio.DesignEngine.Core.Domain.Repositories;
using AiWearStudio.DesignEngine.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.DesignEngine.Infrastructure.Persistence.Repositories;

public class DesignDraftRepository(DesignEngineDbContext db) : IDesignDraftRepository
{
    public Task<DesignDraft?> GetByIdAsync(Guid designId, CancellationToken ct = default) =>
        db.DesignDrafts.FirstOrDefaultAsync(d => d.Id == designId, ct);

    public async Task AddAsync(DesignDraft draft, CancellationToken ct = default) =>
        await db.DesignDrafts.AddAsync(draft, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
