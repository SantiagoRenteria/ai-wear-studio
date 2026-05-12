using AiWearStudio.CompanyAdmin.Domain.Entities;
using AiWearStudio.CompanyAdmin.Domain.Repositories;
using AiWearStudio.SharedKernel.Domain;
using MediatR;

namespace AiWearStudio.CompanyAdmin.Application.Commands.AssignPlan;

public class AssignPlanCommandHandler(ICompanyRepository companyRepository)
    : IRequestHandler<AssignPlanCommand, Unit>
{
    public async Task<Unit> Handle(AssignPlanCommand request, CancellationToken ct)
    {
        var company = await companyRepository.FindByIdAsync(request.CompanyId, ct);
        if (company is null)
            throw new DomainException("COMPANY_NOT_FOUND: La compañía solicitada no existe.");

        var auditLog = PlanAuditLog.Record(
            company.Id, request.AdminId,
            company.Plan, request.NewPlan,
            request.Reason);

        company.AssignPlan(request.NewPlan, request.AdminId);

        await companyRepository.AddAuditLogAsync(auditLog, ct);
        await companyRepository.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
