using AiWearStudio.Catalog.Application.Commands.SetColorStatus;
using AiWearStudio.Catalog.Application.Commands.SetGarmentStatus;
using AiWearStudio.Catalog.Application.Queries.GetAdminCatalog;
using AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;
using AiWearStudio.Catalog.Infrastructure.Caching;
using AiWearStudio.Catalog.Infrastructure.Persistence;
using AiWearStudio.Catalog.Infrastructure.Persistence.Repositories;
using AiWearStudio.SharedKernel.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Catalog.Tests.Integration;

public class AdminCatalogTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private CatalogDbContext _db = default!;
    private GarmentRepository _garmentRepo = default!;
    private AdminCatalogRepository _adminRepo = default!;
    private readonly CacheTracker _cache = new();

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
        _adminRepo = new AdminCatalogRepository(_db);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-ADMIN-PANEL: GetAdminCatalog retorna todas las prendas con IsActive por tenant")]
    [Trait("Category", "Integration")]
    public async Task GetAdminCatalog_ReturnsAllGarmentsWithStatus()
    {
        var tenantId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var handler = new GetAdminCatalogQueryHandler(_adminRepo);

        // Desactivar una prenda para el tenant
        var setHandler = new SetGarmentStatusCommandHandler(_adminRepo, NullLogger<SetGarmentStatusCommandHandler>.Instance);
        await setHandler.Handle(new SetGarmentStatusCommand(tenantId, CatalogSeedData.GarmHoodie, false, adminId), CancellationToken.None);

        var result = await handler.Handle(new GetAdminCatalogQuery(tenantId), CancellationToken.None);

        Assert.Equal(10, result.Count);
        var hoodie = result.First(g => g.Id == CatalogSeedData.GarmHoodie);
        Assert.False(hoodie.IsActive);
        var tshirt = result.First(g => g.Id == CatalogSeedData.GarmTshirt);
        Assert.True(tshirt.IsActive);
        Assert.All(result, g => Assert.NotEmpty(g.Colors));
    }

    [Fact(DisplayName = "AC-ADMIN-DEACTIVATE: Desactivar prenda la excluye de GetActiveGarments y el caché se invalida")]
    [Trait("Category", "Integration")]
    public async Task SetGarmentStatus_Deactivate_ExcludesFromClientCatalog()
    {
        var tenantId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var setHandler = new SetGarmentStatusCommandHandler(_adminRepo, NullLogger<SetGarmentStatusCommandHandler>.Instance);
        var getHandler = new GetCatalogGarmentsQueryHandler(_garmentRepo, _cache, NullLogger<GetCatalogGarmentsQueryHandler>.Instance);

        _cache.InvalidationCount = 0;

        await setHandler.Handle(new SetGarmentStatusCommand(tenantId, CatalogSeedData.GarmTshirt, false, adminId), CancellationToken.None);
        _db.ChangeTracker.Clear();

        var garments = await getHandler.Handle(new GetCatalogGarmentsQuery(tenantId), CancellationToken.None);

        Assert.Equal(9, garments.Count);
        Assert.DoesNotContain(garments, g => g.Id == CatalogSeedData.GarmTshirt);
        Assert.True(_cache.InvalidationCount >= 1, "El caché debe haberse invalidado al cambiar TenantGarmentStatus");
    }

    [Fact(DisplayName = "AC-ADMIN-COLOR: Desactivar color lo excluye; activarlo lo restaura")]
    [Trait("Category", "Integration")]
    public async Task SetColorStatus_DeactivateAndReactivate_ColorAppearsCorrectly()
    {
        var tenantId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var setHandler = new SetColorStatusCommandHandler(_adminRepo, NullLogger<SetColorStatusCommandHandler>.Instance);
        var adminHandler = new GetAdminCatalogQueryHandler(_adminRepo);

        // Tshirt tiene varios colores — tomamos el segundo para no violar last-color
        var tshirtColors = await _db.GarmentColorVariants
            .Where(c => c.GarmentId == CatalogSeedData.GarmTshirt)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => c.Id)
            .ToListAsync();

        Assert.True(tshirtColors.Count >= 2, "La prenda debe tener al menos 2 colores para este test");
        var colorToToggle = tshirtColors[1];

        // Desactivar
        await setHandler.Handle(new SetColorStatusCommand(tenantId, CatalogSeedData.GarmTshirt, colorToToggle, false, adminId), CancellationToken.None);
        _db.ChangeTracker.Clear();

        var after = await adminHandler.Handle(new GetAdminCatalogQuery(tenantId), CancellationToken.None);
        var colorAfter = after.First(g => g.Id == CatalogSeedData.GarmTshirt).Colors.First(c => c.Id == colorToToggle);
        Assert.False(colorAfter.IsActive);

        // Reactivar
        await setHandler.Handle(new SetColorStatusCommand(tenantId, CatalogSeedData.GarmTshirt, colorToToggle, true, adminId), CancellationToken.None);
        _db.ChangeTracker.Clear();

        var afterReactivate = await adminHandler.Handle(new GetAdminCatalogQuery(tenantId), CancellationToken.None);
        var colorAfterReactivate = afterReactivate.First(g => g.Id == CatalogSeedData.GarmTshirt).Colors.First(c => c.Id == colorToToggle);
        Assert.True(colorAfterReactivate.IsActive);
    }

    [Fact(DisplayName = "AC-ADMIN-LAST-COLOR: Desactivar el único color activo lanza LAST_COLOR_ACTIVE")]
    [Trait("Category", "Integration")]
    public async Task SetColorStatus_LastActiveColor_ThrowsLastColorActive()
    {
        var tenantId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var setHandler = new SetColorStatusCommandHandler(_adminRepo, NullLogger<SetColorStatusCommandHandler>.Instance);

        // Dejar solo un color activo en Tote Bag (1 view, pocos colores)
        var toteBagColors = await _db.GarmentColorVariants
            .Where(c => c.GarmentId == CatalogSeedData.GarmToteBag)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => c.Id)
            .ToListAsync();

        // Desactivar todos menos el último
        foreach (var colorId in toteBagColors.SkipLast(1))
        {
            await setHandler.Handle(
                new SetColorStatusCommand(tenantId, CatalogSeedData.GarmToteBag, colorId, false, adminId),
                CancellationToken.None);
            _db.ChangeTracker.Clear();
        }

        // Intentar desactivar el último → debe fallar
        var lastColor = toteBagColors.Last();
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            setHandler.Handle(
                new SetColorStatusCommand(tenantId, CatalogSeedData.GarmToteBag, lastColor, false, adminId),
                CancellationToken.None));

        Assert.StartsWith("LAST_COLOR_ACTIVE", ex.Message);
    }

    [Fact(DisplayName = "AC-ADMIN-COLOR-NOT-FOUND: Color que no pertenece al garment lanza COLOR_NOT_FOUND")]
    [Trait("Category", "Integration")]
    public async Task SetColorStatus_ColorNotBelongingToGarment_ThrowsDomainException()
    {
        var tenantId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var setHandler = new SetColorStatusCommandHandler(_adminRepo, NullLogger<SetColorStatusCommandHandler>.Instance);

        // Color de Hoodie intentado en Tshirt
        var hoodieColor = await _db.GarmentColorVariants
            .Where(c => c.GarmentId == CatalogSeedData.GarmHoodie)
            .Select(c => c.Id)
            .FirstAsync();

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            setHandler.Handle(
                new SetColorStatusCommand(tenantId, CatalogSeedData.GarmTshirt, hoodieColor, false, adminId),
                CancellationToken.None));

        Assert.StartsWith("COLOR_NOT_FOUND", ex.Message);
    }

    // ─── Cache tracker ──────────────────────────────────────────────────────────
    private sealed class CacheTracker : ICatalogCache
    {
        public int InvalidationCount { get; set; }

        public Task<List<GarmentDto>?> GetGarmentsAsync(Guid tenantId, CancellationToken ct = default) =>
            Task.FromResult<List<GarmentDto>?>(null);

        public Task SetGarmentsAsync(Guid tenantId, List<GarmentDto> garments, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task InvalidateGarmentsAsync(Guid tenantId, CancellationToken ct = default)
        {
            InvalidationCount++;
            return Task.CompletedTask;
        }
    }
}
