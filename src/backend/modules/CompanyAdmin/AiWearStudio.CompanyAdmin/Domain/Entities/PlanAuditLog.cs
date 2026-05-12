using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.SharedKernel.Domain;

namespace AiWearStudio.CompanyAdmin.Domain.Entities;

public class PlanAuditLog : Entity
{
    public Guid CompanyId { get; private set; }
    public Guid AdminId { get; private set; }
    public Plan PreviousPlan { get; private set; }
    public Plan NewPlan { get; private set; }
    public string? Reason { get; private set; }
    public DateTime ChangedAt { get; private set; }

    private PlanAuditLog() { }

    public static PlanAuditLog Record(Guid companyId, Guid adminId, Plan previous, Plan next, string? reason)
        => new()
        {
            CompanyId = companyId,
            AdminId = adminId,
            PreviousPlan = previous,
            NewPlan = next,
            Reason = reason,
            ChangedAt = DateTime.UtcNow
        };
}
