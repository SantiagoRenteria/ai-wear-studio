using FluentValidation;

namespace AiWearStudio.Users.Core.Application.Commands.ResendVerificationEmail;

public class ResendVerificationEmailCommandValidator : AbstractValidator<ResendVerificationEmailCommand>
{
    public ResendVerificationEmailCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
