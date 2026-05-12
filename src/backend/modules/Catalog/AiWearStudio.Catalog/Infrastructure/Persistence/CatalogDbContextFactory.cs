using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AiWearStudio.Catalog.Infrastructure.Persistence;

public class CatalogDbContextFactory : IDesignTimeDbContextFactory<CatalogDbContext>
{
    public CatalogDbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseNpgsql("Host=localhost;Port=5434;Database=aiwearstudio;Username=aiwear;Password=changeme_dev")
            .Options;
        return new CatalogDbContext(opts, new NullCatalogCache());
    }

    private sealed class NullCatalogCache : Caching.ICatalogCache
    {
        public Task<List<Application.Queries.GetCatalogGarments.GarmentDto>?> GetGarmentsAsync(Guid tenantId, CancellationToken ct = default) => Task.FromResult<List<Application.Queries.GetCatalogGarments.GarmentDto>?>(null);
        public Task SetGarmentsAsync(Guid tenantId, List<Application.Queries.GetCatalogGarments.GarmentDto> garments, CancellationToken ct = default) => Task.CompletedTask;
        public Task InvalidateGarmentsAsync(Guid tenantId, CancellationToken ct = default) => Task.CompletedTask;
    }
}
