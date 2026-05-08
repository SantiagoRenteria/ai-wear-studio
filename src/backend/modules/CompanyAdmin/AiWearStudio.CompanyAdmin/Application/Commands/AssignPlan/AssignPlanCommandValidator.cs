using FluentValidation;

namespace AiWearStudio.CompanyAdmin.Application.Commands.AssignPlan;

public class AssignPlanCommandValidator : AbstractValidator<AssignPlanCommand>
{
    public AssignPlanCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEqual(Guid.Empty).WithMessage("CompanyId no puede ser un GUID vacío.");
        RuleFor(x => x.AdminId).NotEqual(Guid.Empty).WithMessage("AdminId no puede ser un GUID vacío.");
        RuleFor(x => x.NewPlan).IsInEnum().WithMessage("El plan especificado no es válido.");
    }
}
