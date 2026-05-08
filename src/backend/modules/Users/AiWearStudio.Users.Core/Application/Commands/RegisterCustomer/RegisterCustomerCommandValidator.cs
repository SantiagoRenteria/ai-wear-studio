using FluentValidation;

namespace AiWearStudio.Users.Core.Application.Commands.RegisterCustomer;

public class RegisterCustomerCommandValidator : AbstractValidator<RegisterCustomerCommand>
{
    public RegisterCustomerCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email es requerido.")
            .EmailAddress().WithMessage("Formato de email inválido.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password es requerido.")
            .MinimumLength(8).WithMessage("El password debe tener al menos 8 caracteres.");
    }
}
