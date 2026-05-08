using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.DTOs;
using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;
using RT = AiWearStudio.Users.Core.Domain.Entities.RefreshToken;

namespace AiWearStudio.Users.Core.Application.Commands.Login;

public class LoginCommandHandler(
    IUserRepository userRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IJwtTokenService jwtTokenService,
    IPasswordHasherService passwordHasher)
    : IRequestHandler<LoginCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken ct)
    {
        var email = request.Email.ToLowerInvariant().Trim();

        var user = await userRepository.FindByEmailAsync(email, ct);
        if (user is null || !passwordHasher.VerifyPassword(user.PasswordHash, request.Password))
            throw new DomainException("INVALID_CREDENTIALS: Credenciales inválidas.");

        var rawToken = jwtTokenService.GenerateRefreshToken();
        var refreshToken = RT.Create(user.Id, rawToken, jwtTokenService.RefreshTokenTtlDays);

        await refreshTokenRepository.AddAsync(refreshToken, ct);
        await refreshTokenRepository.SaveChangesAsync(ct);

        return new AuthResponse(jwtTokenService.GenerateAccessToken(user), rawToken);
    }
}
