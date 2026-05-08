using FluentValidation;

namespace AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;

public class CreateCompanyCommandValidator : AbstractValidator<CreateCompanyCommand>
{
    public CreateCompanyCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("El nombre de la compañía es requerido.");
        RuleFor(x => x.Slug).NotEmpty().WithMessage("El slug es requerido.");
        RuleFor(x => x.Plan).IsInEnum().WithMessage("El plan especificado no es válido.");
        RuleFor(x => x.AdminId).NotEqual(Guid.Empty).WithMessage("AdminId no puede ser un GUID vacío.");
    }
}
