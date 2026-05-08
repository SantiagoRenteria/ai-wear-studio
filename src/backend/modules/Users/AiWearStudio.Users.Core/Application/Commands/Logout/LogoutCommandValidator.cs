using FluentValidation;

namespace AiWearStudio.Users.Core.Application.Commands.Logout;

public class LogoutCommandValidator : AbstractValidator<LogoutCommand>
{
    public LogoutCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty().WithMessage("Token de refresco es requerido.");
    }
}
