namespace AiWearStudio.SharedKernel.Common;

public interface IRateLimitPolicy
{
    Task<bool> TryConsumeAsync(Guid tenantId, Guid userId, string plan, string feature, CancellationToken ct = default);
    Task<int> GetRemainingAsync(Guid tenantId, Guid userId, string plan, string feature, CancellationToken ct = default);
    Task RefundAsync(Guid tenantId, Guid userId, string plan, string feature, CancellationToken ct = default);
}
