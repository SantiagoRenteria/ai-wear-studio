using AiWearStudio.SharedKernel.Application;
using MediatR;

namespace AiWearStudio.CompanyAdmin.Application.Commands.UpdateCompanySettings;

public record UpdateCompanySettingsCommand(
    Guid CompanyId,
    string? NewName,
    Dictionary<string, string>? BrandColors,
    string? NotificationConfigJson
) : ICommand<Unit>;
