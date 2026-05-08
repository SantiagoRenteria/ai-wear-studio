using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.SharedKernel.Domain;

namespace AiWearStudio.CompanyAdmin.Domain.Entities;

public class Company : AggregateRoot
{
    public string Name { get; private set; } = default!;
    public string Slug { get; private set; } = default!;
    public Plan Plan { get; private set; }
    public PlanStatus PlanStatus { get; private set; }
    public DateTime? TrialEndsAt { get; private set; }
    public Guid? ActivatedBy { get; private set; }
    public DateTime? ActivatedAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public string? Settings { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    private Company() { }

    public static Company Create(string name, string slug, Plan plan, Guid adminId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(slug);

        var now = DateTime.UtcNow;
        return new Company
        {
            Name = name.Trim(),
            Slug = slug.Trim().ToLowerInvariant(),
            Plan = plan,
            PlanStatus = PlanStatus.Active,
            ActivatedBy = adminId,
            ActivatedAt = now,
            CreatedAt = now
        };
    }

    public void AssignPlan(Plan newPlan, Guid adminId)
    {
        Plan = newPlan;
        PlanStatus = PlanStatus.Active;
        ActivatedBy = adminId;
        ActivatedAt = DateTime.UtcNow;
    }
}
