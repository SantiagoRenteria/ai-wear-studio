namespace AiWearStudio.Catalog.Domain.Entities;

public class TenantGarmentStatus
{
    public Guid Id { get; private set; }
    public Guid TenantId { get; private set; }
    public Guid GarmentId { get; private set; }
    public bool IsActive { get; private set; }

    private TenantGarmentStatus() { }

    public static TenantGarmentStatus Create(Guid tenantId, Guid garmentId, bool isActive) =>
        new() { Id = Guid.NewGuid(), TenantId = tenantId, GarmentId = garmentId, IsActive = isActive };

    public void SetActive(bool isActive) => IsActive = isActive;
}
