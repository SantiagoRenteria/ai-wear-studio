using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.DeactivateUser;

public class DeactivateUserCommandHandler(
    IUserRepository userRepository,
    IRefreshTokenRepository refreshTokenRepository)
    : IRequestHandler<DeactivateUserCommand, Unit>
{
    public async Task<Unit> Handle(DeactivateUserCommand request, CancellationToken ct)
    {
        var user = await userRepository.FindByIdAsync(request.UserId, ct);
        if (user is null)
            throw new DomainException("USER_NOT_FOUND: El usuario solicitado no existe.");

        user.Deactivate();
        await refreshTokenRepository.RevokeAllForUserAsync(request.UserId, ct);
        await userRepository.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
