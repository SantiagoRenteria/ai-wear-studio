namespace AiWearStudio.SharedKernel.Common;

public interface IAiRateLimiter
{
    Task<int> CheckAndIncrementAsync(Guid userId, CancellationToken ct = default);
}
