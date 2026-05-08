using AiWearStudio.CompanyAdmin.Domain.Constants;
using AiWearStudio.CompanyAdmin.Domain.Entities;
using AiWearStudio.CompanyAdmin.Domain.Repositories;
using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using MediatR;

namespace AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;

public class CreateCompanyCommandHandler(ICompanyRepository companyRepository, IFeatureFlagService featureFlagService)
    : IRequestHandler<CreateCompanyCommand, Guid>
{
    public async Task<Guid> Handle(CreateCompanyCommand request, CancellationToken ct)
    {
        var existing = await companyRepository.FindBySlugAsync(request.Slug, ct);
        if (existing is not null)
            throw new DomainException($"DUPLICATE_SLUG: El slug '{request.Slug}' ya está en uso.");

        var company = Company.Create(request.Name, request.Slug, request.Plan, request.AdminId);
        await companyRepository.AddAsync(company, ct);
        await companyRepository.SaveChangesAsync(ct);

        var defaults = FeatureFlags.DefaultsForPlan(request.Plan);
        await featureFlagService.SeedForPlanAsync(company.Id, defaults, request.AdminId, ct);

        return company.Id;
    }
}
