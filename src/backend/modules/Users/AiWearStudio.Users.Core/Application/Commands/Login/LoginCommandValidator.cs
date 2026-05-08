using FluentValidation;

namespace AiWearStudio.Users.Core.Application.Commands.Login;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("Email es requerido.");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Password es requerido.");
    }
}
