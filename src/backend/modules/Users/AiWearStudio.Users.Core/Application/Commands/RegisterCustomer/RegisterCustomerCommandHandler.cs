using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.DTOs;
using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Application.Services;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AiWearStudio.Users.Core.Application.Commands.RegisterCustomer;

public class RegisterCustomerCommandHandler(
    IUserRepository userRepository,
    IJwtTokenService jwtTokenService,
    IPasswordHasherService passwordHasher,
    IEmailVerificationTokenService tokenService,
    IEmailSender emailSender,
    ILogger<RegisterCustomerCommandHandler> logger)
    : IRequestHandler<RegisterCustomerCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(RegisterCustomerCommand request, CancellationToken ct)
    {
        var email = request.Email.ToLowerInvariant().Trim();

        var existsAsInternal = await userRepository.ExistsWithEmailAndRoleGroupAsync(email, isCustomer: false, ct);
        if (existsAsInternal)
            throw new DomainException($"ROLE_CONFLICT: El email '{email}' ya está registrado como usuario interno.");

        var existsAsCustomer = await userRepository.ExistsWithEmailAndRoleGroupAsync(email, isCustomer: true, ct);
        if (existsAsCustomer)
            throw new DomainException($"DUPLICATE_EMAIL: El email '{email}' ya está registrado.");

        var hash = passwordHasher.HashPassword(request.Password);
        var user = User.CreateCustomer(email, hash);

        await userRepository.AddAsync(user, ct);
        await userRepository.SaveChangesAsync(ct);

        // P1 patch: token creation is resiliente — Redis failure does not fail registration.
        // User is already saved; they can use /resend-verification when Redis recovers.
        try
        {
            var verificationToken = await tokenService.CreateTokenAsync(user.Id, ct);
            _ = SendVerificationEmailFireAndForget(email, verificationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create verification token for {Email}; user can request resend", email);
        }

        var accessToken = jwtTokenService.GenerateAccessToken(user);
        var refreshToken = jwtTokenService.GenerateRefreshToken();

        return new AuthResponse(accessToken, refreshToken);
    }

    private async Task SendVerificationEmailFireAndForget(string email, string token)
    {
        try
        {
            await emailSender.SendVerificationEmailAsync(email, token);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send verification email to {Email}", email);
        }
    }
}
