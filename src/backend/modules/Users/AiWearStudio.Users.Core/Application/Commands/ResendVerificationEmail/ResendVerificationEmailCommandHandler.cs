using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.Services;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AiWearStudio.Users.Core.Application.Commands.ResendVerificationEmail;

public class ResendVerificationEmailCommandHandler(
    IEmailVerificationTokenService tokenService,
    IUserRepository userRepository,
    IEmailSender emailSender,
    ILogger<ResendVerificationEmailCommandHandler> logger)
    : IRequestHandler<ResendVerificationEmailCommand, Unit>
{
    public async Task<Unit> Handle(ResendVerificationEmailCommand request, CancellationToken ct)
    {
        var email = request.Email.ToLowerInvariant().Trim();

        // Silencioso si el email no existe — no revelar si el email está registrado
        var user = await userRepository.FindByEmailAsync(email, ct);
        if (user is null)
            return Unit.Value;

        // P9 patch: silencioso si el email ya está verificado
        if (user.EmailVerified)
            return Unit.Value;

        var canResend = await tokenService.CheckAndIncrementResendAsync(email, ct);
        if (!canResend)
            throw new DomainException("RESEND_LIMIT_EXCEEDED");

        var token = await tokenService.CreateTokenAsync(user.Id, ct);

        try
        {
            await emailSender.SendVerificationEmailAsync(email, token, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send verification email to {Email}", email);
        }

        return Unit.Value;
    }
}
