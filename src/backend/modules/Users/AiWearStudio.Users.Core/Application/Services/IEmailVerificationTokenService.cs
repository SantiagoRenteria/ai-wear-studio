namespace AiWearStudio.Users.Core.Application.Services;

public interface IEmailVerificationTokenService
{
    Task<string> CreateTokenAsync(Guid userId, CancellationToken ct = default);
    Task<Guid?> ConsumeTokenAsync(string token, CancellationToken ct = default);
    Task<bool> CheckAndIncrementResendAsync(string email, CancellationToken ct = default);
}
