using FluentValidation;

namespace AiWearStudio.CompanyAdmin.Application.Commands.SuspendCompany;

public class SuspendCompanyCommandValidator : AbstractValidator<SuspendCompanyCommand>
{
    public SuspendCompanyCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEqual(Guid.Empty).WithMessage("CompanyId no puede ser un GUID vacío.");
        RuleFor(x => x.AdminId).NotEqual(Guid.Empty).WithMessage("AdminId no puede ser un GUID vacío.");
        RuleFor(x => x.Reason).MaximumLength(489).When(x => x.Reason is not null)
            .WithMessage("Reason no puede exceder 489 caracteres.");
    }
}
