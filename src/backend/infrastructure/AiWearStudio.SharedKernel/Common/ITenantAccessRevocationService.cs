namespace AiWearStudio.SharedKernel.Common;

public interface ITenantAccessRevocationService
{
    Task RevokeAllTokensForTenantAsync(Guid tenantId, CancellationToken ct = default);
}
