using AiWearStudio.CompanyAdmin.Domain.Repositories;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence.Repositories;
using AiWearStudio.CompanyAdmin.Infrastructure.Services;
using AiWearStudio.SharedKernel.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AiWearStudio.CompanyAdmin.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddCompanyAdminModule(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<CompanyAdminDbContext>(opts =>
            opts.UseNpgsql(config.GetConnectionString("CompanyAdmin")));

        services.AddScoped<ICompanyRepository, CompanyRepository>();
        services.AddScoped<IFeatureFlagService, FeatureFlagService>();

        return services;
    }
}
