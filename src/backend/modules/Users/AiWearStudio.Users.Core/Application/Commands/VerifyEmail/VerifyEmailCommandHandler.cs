using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.Services;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.VerifyEmail;

public class VerifyEmailCommandHandler(
    IEmailVerificationTokenService tokenService,
    IUserRepository userRepository)
    : IRequestHandler<VerifyEmailCommand, Unit>
{
    public async Task<Unit> Handle(VerifyEmailCommand request, CancellationToken ct)
    {
        var userId = await tokenService.ConsumeTokenAsync(request.Token, ct);
        if (userId is null)
            throw new DomainException("EMAIL_VERIFICATION_TOKEN_INVALID");

        var user = await userRepository.FindByIdAsync(userId.Value, ct);
        if (user is null)
            throw new DomainException("EMAIL_VERIFICATION_TOKEN_INVALID");

        user.VerifyEmail();
        await userRepository.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
