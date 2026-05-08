using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;
using RT = AiWearStudio.Users.Core.Domain.Entities.RefreshToken;

namespace AiWearStudio.Users.Core.Application.Commands.Logout;

public class LogoutCommandHandler(IRefreshTokenRepository refreshTokenRepository)
    : IRequestHandler<LogoutCommand, Unit>
{
    public async Task<Unit> Handle(LogoutCommand request, CancellationToken ct)
    {
        var hash = RT.ComputeHash(request.Token);
        var token = await refreshTokenRepository.FindByTokenHashAsync(hash, ct);

        if (token is not null && !token.IsRevoked())
        {
            token.Revoke();
            await refreshTokenRepository.SaveChangesAsync(ct);
        }

        return Unit.Value;
    }
}
