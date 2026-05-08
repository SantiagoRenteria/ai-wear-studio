using AiWearStudio.CompanyAdmin.Domain.Entities;
using AiWearStudio.CompanyAdmin.Domain.Repositories;
using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using MediatR;

namespace AiWearStudio.CompanyAdmin.Application.Commands.SuspendCompany;

public class SuspendCompanyCommandHandler(
    ICompanyRepository companyRepository,
    ITenantAccessRevocationService revocationService)
    : IRequestHandler<SuspendCompanyCommand, Unit>
{
    public async Task<Unit> Handle(SuspendCompanyCommand request, CancellationToken ct)
    {
        var company = await companyRepository.FindByIdAsync(request.CompanyId, ct);
        if (company is null)
            throw new DomainException("COMPANY_NOT_FOUND: La compañía solicitada no existe.");

        var auditLog = PlanAuditLog.Record(
            company.Id, request.AdminId,
            company.Plan, company.Plan,
            $"SUSPENDED: {request.Reason}");

        company.Suspend(request.AdminId, request.Reason);

        await companyRepository.AddAuditLogAsync(auditLog, ct);
        await companyRepository.SaveChangesAsync(ct);

        await revocationService.RevokeAllTokensForTenantAsync(company.Id, ct);

        return Unit.Value;
    }
}
