using AiWearStudio.Catalog.Domain.Repositories;
using AiWearStudio.Catalog.Infrastructure.Caching;
using AiWearStudio.Catalog.Infrastructure.Persistence;
using AiWearStudio.Catalog.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace AiWearStudio.Catalog.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddCatalogModule(this IServiceCollection services, IConfiguration config)
    {
        var redisConn = config["Redis:ConnectionString"]
            ?? throw new InvalidOperationException("Redis:ConnectionString not configured");

        services.AddSingleton<IConnectionMultiplexer>(_ =>
            ConnectionMultiplexer.Connect(redisConn));

        var catalogConn = config.GetConnectionString("Catalog");
        if (string.IsNullOrWhiteSpace(catalogConn))
            throw new InvalidOperationException("ConnectionStrings:Catalog not configured");

        services.AddDbContext<CatalogDbContext>(opts =>
            opts.UseNpgsql(catalogConn));

        services.AddScoped<ICatalogCache, RedisCatalogCache>();
        services.AddScoped<IGarmentRepository, GarmentRepository>();

        return services;
    }
}
