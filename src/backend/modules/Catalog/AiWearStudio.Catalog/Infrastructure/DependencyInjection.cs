using AiWearStudio.Catalog.Domain.Repositories;
using AiWearStudio.Catalog.Infrastructure.Caching;
using AiWearStudio.Catalog.Infrastructure.Persistence;
using AiWearStudio.Catalog.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AiWearStudio.Catalog.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddCatalogModule(this IServiceCollection services, IConfiguration config)
    {
        // IConnectionMultiplexer is registered at app level in Program.cs

        var catalogConn = config.GetConnectionString("Catalog");
        if (string.IsNullOrWhiteSpace(catalogConn))
            throw new InvalidOperationException("ConnectionStrings:Catalog not configured");

        services.AddDbContext<CatalogDbContext>(opts =>
            opts.UseNpgsql(catalogConn));

        services.AddScoped<ICatalogCache, RedisCatalogCache>();
        services.AddScoped<IGarmentRepository, GarmentRepository>();
        services.AddScoped<IAdminCatalogRepository, AdminCatalogRepository>();

        return services;
    }
}
