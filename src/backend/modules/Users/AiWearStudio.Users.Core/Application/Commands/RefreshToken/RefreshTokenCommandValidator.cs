using FluentValidation;

namespace AiWearStudio.Users.Core.Application.Commands.RefreshToken;

public class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty().WithMessage("Token de refresco es requerido.");
    }
}
