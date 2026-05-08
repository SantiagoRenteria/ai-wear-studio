using AiWearStudio.CompanyAdmin.Domain.Entities;
using AiWearStudio.CompanyAdmin.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AiWearStudio.CompanyAdmin.Infrastructure.Persistence.Repositories;

public class CompanyRepository(CompanyAdminDbContext db) : ICompanyRepository
{
    public async Task<Company?> FindByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<Company?> FindBySlugAsync(string slug, CancellationToken ct = default)
        => await db.Companies.FirstOrDefaultAsync(c => c.Slug == slug, ct);

    public async Task<List<Company>> ListAsync(CancellationToken ct = default)
        => await db.Companies.OrderBy(c => c.CreatedAt).ToListAsync(ct);

    public async Task AddAsync(Company company, CancellationToken ct = default)
        => await db.Companies.AddAsync(company, ct);

    public async Task AddAuditLogAsync(PlanAuditLog log, CancellationToken ct = default)
        => await db.PlanAuditLogs.AddAsync(log, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await db.SaveChangesAsync(ct);
}
