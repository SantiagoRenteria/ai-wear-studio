using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.SharedKernel.Application;
using MediatR;

namespace AiWearStudio.CompanyAdmin.Application.Commands.AssignPlan;

public record AssignPlanCommand(Guid CompanyId, Plan NewPlan, Guid AdminId, string? Reason) : ICommand<Unit>;
