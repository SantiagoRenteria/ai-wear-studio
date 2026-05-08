using AiWearStudio.Users.Core.Domain.Entities;

namespace AiWearStudio.Users.Core.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    int RefreshTokenTtlDays { get; }
}
