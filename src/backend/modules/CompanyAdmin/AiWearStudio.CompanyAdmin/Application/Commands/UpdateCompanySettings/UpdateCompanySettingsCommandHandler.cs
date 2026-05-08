using AiWearStudio.CompanyAdmin.Domain.Repositories;
using AiWearStudio.SharedKernel.Domain;
using MediatR;
using System.Text.Json;

namespace AiWearStudio.CompanyAdmin.Application.Commands.UpdateCompanySettings;

public class UpdateCompanySettingsCommandHandler(ICompanyRepository companyRepository)
    : IRequestHandler<UpdateCompanySettingsCommand, Unit>
{
    public async Task<Unit> Handle(UpdateCompanySettingsCommand request, CancellationToken ct)
    {
        var company = await companyRepository.FindByIdAsync(request.CompanyId, ct)
            ?? throw new DomainException($"COMPANY_NOT_FOUND: La compañía '{request.CompanyId}' no existe.");

        var dict = company.Settings is null
            ? new Dictionary<string, JsonElement>()
            : JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(company.Settings)!;

        if (request.BrandColors is not null)
            dict["brand_colors"] = JsonSerializer.SerializeToElement(request.BrandColors);

        if (request.NotificationConfigJson is not null)
        {
            using var notifDoc = JsonDocument.Parse(request.NotificationConfigJson);
            dict["notification_config"] = notifDoc.RootElement.Clone();
        }

        if (!dict.ContainsKey("domain_config"))
            dict["domain_config"] = JsonSerializer.SerializeToElement(new { });

        var settingsJson = JsonSerializer.Serialize(dict);
        company.UpdateSettings(request.NewName, settingsJson);

        await companyRepository.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
