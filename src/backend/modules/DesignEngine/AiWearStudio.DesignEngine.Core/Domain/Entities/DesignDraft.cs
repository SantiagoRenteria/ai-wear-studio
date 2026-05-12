namespace AiWearStudio.DesignEngine.Core.Domain.Entities;

public class DesignDraft
{
    public Guid Id { get; private set; }
    public Guid TenantId { get; private set; }
    public Guid UserId { get; private set; }
    public string SnapshotJson { get; private set; } = string.Empty;
    public string ETag { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private DesignDraft() { }

    public static DesignDraft Create(Guid id, Guid tenantId, Guid userId, string snapshotJson) =>
        new()
        {
            Id = id,
            TenantId = tenantId,
            UserId = userId,
            SnapshotJson = snapshotJson,
            ETag = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

    public void Update(string snapshotJson)
    {
        SnapshotJson = snapshotJson;
        ETag = Guid.NewGuid().ToString("N");
        UpdatedAt = DateTime.UtcNow;
    }
}
