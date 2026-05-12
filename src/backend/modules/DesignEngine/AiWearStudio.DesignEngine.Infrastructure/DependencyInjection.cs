using AiWearStudio.DesignEngine.Core.Domain.Repositories;
using AiWearStudio.DesignEngine.Infrastructure.Persistence;
using AiWearStudio.DesignEngine.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AiWearStudio.DesignEngine.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddDesignEngineModule(this IServiceCollection services, IConfiguration config)
    {
        var connStr = config.GetConnectionString("DesignEngine");
        if (string.IsNullOrWhiteSpace(connStr))
            throw new InvalidOperationException("ConnectionStrings:DesignEngine not configured");

        services.AddDbContext<DesignEngineDbContext>(opts =>
            opts.UseNpgsql(connStr));

        services.AddScoped<IDesignDraftRepository, DesignDraftRepository>();

        return services;
    }
}
