using AiWearStudio.SharedKernel.Application;
using MediatR;

namespace AiWearStudio.CompanyAdmin.Application.Commands.SuspendCompany;

public record SuspendCompanyCommand(Guid CompanyId, Guid AdminId, string? Reason) : ICommand<Unit>;
