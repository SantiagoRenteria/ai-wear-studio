using AiWearStudio.CompanyAdmin.Domain.Entities;

namespace AiWearStudio.CompanyAdmin.Domain.Repositories;

public interface ICompanyRepository
{
    Task<Company?> FindByIdAsync(Guid id, CancellationToken ct = default);
    Task<Company?> FindBySlugAsync(string slug, CancellationToken ct = default);
    Task<List<Company>> ListAsync(CancellationToken ct = default);
    Task AddAsync(Company company, CancellationToken ct = default);
    Task AddAuditLogAsync(PlanAuditLog log, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
