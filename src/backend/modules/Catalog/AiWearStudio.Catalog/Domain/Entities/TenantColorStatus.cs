namespace AiWearStudio.Catalog.Domain.Entities;

public class TenantColorStatus
{
    public Guid Id { get; private set; }
    public Guid TenantId { get; private set; }
    public Guid ColorVariantId { get; private set; }
    public bool IsActive { get; private set; }

    private TenantColorStatus() { }

    public static TenantColorStatus Create(Guid tenantId, Guid colorVariantId, bool isActive) =>
        new() { Id = Guid.NewGuid(), TenantId = tenantId, ColorVariantId = colorVariantId, IsActive = isActive };

    public void SetActive(bool isActive) => IsActive = isActive;
}
