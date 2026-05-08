namespace AiWearStudio.SharedKernel.Common;

public interface ITenantContext
{
    Guid? TenantId { get; }
    bool RequiresTenantFilter { get; }
    bool IsAuthenticated { get; }
}
