using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.SharedKernel.Application;

namespace AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;

public record CreateCompanyCommand(string Name, string Slug, Plan Plan, Guid AdminId) : ICommand<Guid>;
