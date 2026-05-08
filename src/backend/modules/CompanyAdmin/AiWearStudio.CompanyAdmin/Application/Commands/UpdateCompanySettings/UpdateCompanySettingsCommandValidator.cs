using FluentValidation;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AiWearStudio.CompanyAdmin.Application.Commands.UpdateCompanySettings;

public class UpdateCompanySettingsCommandValidator : AbstractValidator<UpdateCompanySettingsCommand>
{
    private static readonly Regex HexColorRegex = new(@"^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);

    public UpdateCompanySettingsCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEqual(Guid.Empty).WithMessage("CompanyId no puede ser vacío.");

        RuleFor(x => x.NewName)
            .NotEmpty().MaximumLength(200)
            .When(x => x.NewName is not null)
            .WithMessage("El nombre debe tener entre 1 y 200 caracteres.");

        RuleFor(x => x.BrandColors)
            .Must(colors => colors!.Values.All(v => HexColorRegex.IsMatch(v)))
            .When(x => x.BrandColors is not null && x.BrandColors.Count > 0)
            .WithMessage("Cada color de marca debe ser un valor hex válido (#RRGGBB).");

        RuleFor(x => x.NotificationConfigJson)
            .Must(json =>
            {
                try { JsonDocument.Parse(json!); return true; }
                catch { return false; }
            })
            .When(x => x.NotificationConfigJson is not null)
            .WithMessage("NotificationConfig debe ser JSON válido.");
    }
}
