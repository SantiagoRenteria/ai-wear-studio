namespace AiWearStudio.CompanyAdmin.Domain.Entities;

public class CompanyFeatureFlag
{
    public Guid CompanyId { get; private set; }
    public string FeatureKey { get; private set; } = default!;
    public bool Enabled { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public Guid? UpdatedBy { get; private set; }

    private CompanyFeatureFlag() { }

    public static CompanyFeatureFlag Create(Guid companyId, string featureKey, bool enabled, Guid seededBy)
    {
        var now = DateTime.UtcNow;
        return new CompanyFeatureFlag
        {
            CompanyId = companyId,
            FeatureKey = featureKey,
            Enabled = enabled,
            UpdatedAt = now,
            UpdatedBy = seededBy
        };
    }

    public void SetEnabled(bool enabled, Guid updatedBy)
    {
        Enabled = enabled;
        UpdatedAt = DateTime.UtcNow;
        UpdatedBy = updatedBy;
    }
}
