using FluentValidation;

namespace AiWearStudio.Users.Core.Application.Commands.DeactivateUser;

public class DeactivateUserCommandValidator : AbstractValidator<DeactivateUserCommand>
{
    public DeactivateUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEqual(Guid.Empty).WithMessage("UserId no puede ser un GUID vacío.");
    }
}
