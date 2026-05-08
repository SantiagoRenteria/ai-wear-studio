using AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;
using AiWearStudio.Catalog.Application.Queries.GetGarmentZones;
using AiWearStudio.Catalog.Domain.Entities;
using AiWearStudio.Catalog.Infrastructure.Caching;
using AiWearStudio.Catalog.Infrastructure.Persistence;
using AiWearStudio.Catalog.Infrastructure.Persistence.Repositories;
using AiWearStudio.SharedKernel.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Catalog.Tests.Integration;

public class CatalogQueryTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private CatalogDbContext _db = default!;
    private GarmentRepository _garmentRepo = default!;
    private readonly PassThroughCatalogCache _cache = new();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var opts = new DbContextOptionsBuilder<CatalogDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
            .Options;
        _db = new CatalogDbContext(opts, _cache);
        await _db.Database.MigrateAsync();

        _garmentRepo = new GarmentRepository(_db);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-CAT-SEEDS: Seeds producen exactamente 10 prendas, 23 zonas y 5 técnicas")]
    [Trait("Category", "Integration")]
    public async Task Seeds_ProduceCorrectCounts()
    {
        var garmentCount = await _db.Garments.CountAsync();
        var zoneCount = await _db.PrintZones.CountAsync();
        var techniqueCount = await _db.PrintTechniques.CountAsync();

        Assert.Equal(10, garmentCount);
        Assert.Equal(23, zoneCount);
        Assert.Equal(5, techniqueCount);
    }

    [Fact(DisplayName = "AC-CAT-GARMENTS: Tenant sin overrides recibe las 10 prendas activas con sus colores")]
    [Trait("Category", "Integration")]
    public async Task GetActiveGarments_NoOverrides_ReturnsAll10WithColors()
    {
        var tenantId = Guid.NewGuid();
        var handler = new GetCatalogGarmentsQueryHandler(_garmentRepo, _cache, NullLogger<GetCatalogGarmentsQueryHandler>.Instance);

        var garments = await handler.Handle(new GetCatalogGarmentsQuery(tenantId), CancellationToken.None);

        Assert.Equal(10, garments.Count);
        Assert.All(garments, g => Assert.NotEmpty(g.Colors));
    }

    [Fact(DisplayName = "AC-CAT-GARMENTS-FILTERED: Tenant con 2 prendas desactivadas recibe 8 prendas")]
    [Trait("Category", "Integration")]
    public async Task GetActiveGarments_WithTwoDeactivated_Returns8()
    {
        var tenantId = Guid.NewGuid();

        _db.TenantGarmentStatuses.Add(TenantGarmentStatus.Create(tenantId, CatalogSeedData.GarmTshirt, false));
        _db.TenantGarmentStatuses.Add(TenantGarmentStatus.Create(tenantId, CatalogSeedData.GarmHoodie, false));
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();

        var handler = new GetCatalogGarmentsQueryHandler(_garmentRepo, _cache, NullLogger<GetCatalogGarmentsQueryHandler>.Instance);
        var garments = await handler.Handle(new GetCatalogGarmentsQuery(tenantId), CancellationToken.None);

        Assert.Equal(8, garments.Count);
        Assert.DoesNotContain(garments, g => g.Id == CatalogSeedData.GarmTshirt);
        Assert.DoesNotContain(garments, g => g.Id == CatalogSeedData.GarmHoodie);
    }

    [Fact(DisplayName = "AC-CAT-ZONES: Vista válida retorna zonas con dimensiones y técnica recomendada")]
    [Trait("Category", "Integration")]
    public async Task GetGarmentZones_ValidView_ReturnsZonesWithDimensionsAndTechnique()
    {
        var tenantId = Guid.NewGuid();
        var handler = new GetGarmentZonesQueryHandler(_garmentRepo);

        var zones = await handler.Handle(
            new GetGarmentZonesQuery(CatalogSeedData.GarmTshirt, CatalogSeedData.ViewTshirtFront, tenantId),
            CancellationToken.None);

        Assert.NotEmpty(zones);
        Assert.All(zones, z =>
        {
            Assert.True(z.WidthCm > 0);
            Assert.True(z.HeightCm > 0);
            Assert.NotNull(z.RecommendedTechnique);
        });
    }

    [Fact(DisplayName = "AC-CAT-ZONES-NOT-FOUND: View inexistente lanza GARMENT_VIEW_NOT_FOUND")]
    [Trait("Category", "Integration")]
    public async Task GetGarmentZones_InvalidView_ThrowsDomainException()
    {
        var handler = new GetGarmentZonesQueryHandler(_garmentRepo);

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            handler.Handle(
                new GetGarmentZonesQuery(CatalogSeedData.GarmTshirt, Guid.NewGuid(), Guid.NewGuid()),
                CancellationToken.None));

        Assert.StartsWith("GARMENT_VIEW_NOT_FOUND", ex.Message);
    }

    // stub de cache que siempre va a la DB (pass-through)
    private sealed class PassThroughCatalogCache : ICatalogCache
    {
        public Task<List<GarmentDto>?> GetGarmentsAsync(Guid tenantId, CancellationToken ct = default) =>
            Task.FromResult<List<GarmentDto>?>(null);
        public Task SetGarmentsAsync(Guid tenantId, List<GarmentDto> garments, CancellationToken ct = default) =>
            Task.CompletedTask;
        public Task InvalidateGarmentsAsync(Guid tenantId, CancellationToken ct = default) =>
            Task.CompletedTask;
    }
}
