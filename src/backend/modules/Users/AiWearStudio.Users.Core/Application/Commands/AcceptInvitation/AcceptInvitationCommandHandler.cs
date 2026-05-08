using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.DTOs;
using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;
using RT = AiWearStudio.Users.Core.Domain.Entities.RefreshToken;

namespace AiWearStudio.Users.Core.Application.Commands.AcceptInvitation;

public class AcceptInvitationCommandHandler(
    IUserInvitationRepository invitationRepository,
    IUserRepository userRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IJwtTokenService jwtTokenService,
    IPasswordHasherService passwordHasher)
    : IRequestHandler<AcceptInvitationCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(AcceptInvitationCommand request, CancellationToken ct)
    {
        var invitation = await invitationRepository.FindByTokenAsync(request.Token, ct)
            ?? throw new DomainException("INVITATION_NOT_FOUND: La invitación no existe.");

        if (invitation.IsExpired)
            throw new DomainException("INVITATION_EXPIRED: La invitación ha expirado.");

        if (invitation.IsConsumed)
            throw new DomainException("INVITATION_ALREADY_CONSUMED: La invitación ya fue utilizada.");

        var emailNormalized = invitation.Email;
        var alreadyRegistered = await userRepository.ExistsWithEmailAndRoleGroupAsync(emailNormalized, isCustomer: false, ct);
        if (alreadyRegistered)
            throw new DomainException($"DUPLICATE_EMAIL: El email '{emailNormalized}' ya está registrado como usuario interno.");

        var passwordHash = passwordHasher.HashPassword(request.Password);
        var user = User.CreateInternalUser(emailNormalized, passwordHash, invitation.Role, invitation.TenantId);

        var rawToken = jwtTokenService.GenerateRefreshToken();
        var refreshToken = RT.Create(user.Id, rawToken, jwtTokenService.RefreshTokenTtlDays);

        invitation.Consume();

        await userRepository.AddAsync(user, ct);
        await refreshTokenRepository.AddAsync(refreshToken, ct);
        await userRepository.SaveChangesAsync(ct);

        return new AuthResponse(jwtTokenService.GenerateAccessToken(user), rawToken);
    }
}
