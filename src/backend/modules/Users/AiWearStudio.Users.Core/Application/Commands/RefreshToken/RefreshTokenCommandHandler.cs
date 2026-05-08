using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.DTOs;
using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;
using RT = AiWearStudio.Users.Core.Domain.Entities.RefreshToken;

namespace AiWearStudio.Users.Core.Application.Commands.RefreshToken;

public class RefreshTokenCommandHandler(
    IRefreshTokenRepository refreshTokenRepository,
    IUserRepository userRepository,
    IJwtTokenService jwtTokenService)
    : IRequestHandler<RefreshTokenCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        var hash = RT.ComputeHash(request.Token);
        var token = await refreshTokenRepository.FindByTokenHashAsync(hash, ct);

        if (token is null || token.IsExpired() || token.IsRevoked())
            throw new DomainException("TOKEN_EXPIRED: El token de refresco no es válido o ha expirado.");

        var user = await userRepository.FindByIdAsync(token.UserId, ct);
        if (user is null)
            throw new DomainException("TOKEN_EXPIRED: El token de refresco no es válido o ha expirado.");

        token.Revoke();

        var rawNewToken = jwtTokenService.GenerateRefreshToken();
        var newRefreshToken = RT.Create(user.Id, rawNewToken, jwtTokenService.RefreshTokenTtlDays);

        await refreshTokenRepository.AddAsync(newRefreshToken, ct);
        await refreshTokenRepository.SaveChangesAsync(ct);

        return new AuthResponse(jwtTokenService.GenerateAccessToken(user), rawNewToken);
    }
}
