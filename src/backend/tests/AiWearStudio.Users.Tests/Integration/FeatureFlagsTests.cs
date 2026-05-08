using AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;
using AiWearStudio.CompanyAdmin.Domain.Constants;
using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence.Repositories;
using AiWearStudio.CompanyAdmin.Infrastructure.Services;
using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class FeatureFlagsTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private CompanyAdminDbContext _companyDb = default!;
    private CompanyRepository _companyRepo = default!;
    private IFeatureFlagService _flagService = default!;
    private CreateCompanyCommandHandler _createHandler = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        var connStr = _postgres.GetConnectionString();

        var opts = new DbContextOptionsBuilder<CompanyAdminDbContext>()
            .UseNpgsql(connStr).Options;
        _companyDb = new CompanyAdminDbContext(opts);
        await _companyDb.Database.MigrateAsync();

        _companyRepo = new CompanyRepository(_companyDb);
        _flagService = new FeatureFlagService(_companyDb);
        _createHandler = new CreateCompanyCommandHandler(_companyRepo, _flagService);
    }

    public async Task DisposeAsync()
    {
        await _companyDb.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-FLAGS-SEED-DEMO: Crear compañía Demo siembra flags por defecto del plan Demo")]
    [Trait("Category", "Integration")]
    public async Task CreateCompany_DemoPlan_SeedsDefaultFlags()
    {
        var adminId = Guid.NewGuid();
        var companyId = await _createHandler.Handle(
            new CreateCompanyCommand("Taller Demo", "taller-demo", Plan.Demo, adminId),
            CancellationToken.None);

        var flags = await _companyDb.CompanyFeatureFlags
            .Where(f => f.CompanyId == companyId)
            .ToListAsync();

        Assert.Equal(3, flags.Count);
        Assert.True(flags.Single(f => f.FeatureKey == FeatureFlags.AiGeneration).Enabled);
        Assert.False(flags.Single(f => f.FeatureKey == FeatureFlags.BulkExport).Enabled);
        Assert.False(flags.Single(f => f.FeatureKey == FeatureFlags.WhiteLabel).Enabled);
    }

    [Fact(DisplayName = "AC-FLAGS-SEED-SAAS: Crear compañía SaaS siembra flags por defecto del plan SaaS")]
    [Trait("Category", "Integration")]
    public async Task CreateCompany_SaaSPlan_SeedsDefaultFlags()
    {
        var adminId = Guid.NewGuid();
        var companyId = await _createHandler.Handle(
            new CreateCompanyCommand("Taller SaaS", "taller-saas", Plan.SaaS, adminId),
            CancellationToken.None);

        var flags = await _companyDb.CompanyFeatureFlags
            .Where(f => f.CompanyId == companyId)
            .ToListAsync();

        Assert.Equal(3, flags.Count);
        Assert.True(flags.Single(f => f.FeatureKey == FeatureFlags.AiGeneration).Enabled);
        Assert.True(flags.Single(f => f.FeatureKey == FeatureFlags.BulkExport).Enabled);
        Assert.False(flags.Single(f => f.FeatureKey == FeatureFlags.WhiteLabel).Enabled);
    }

    [Fact(DisplayName = "AC-FLAGS-READ: IsEnabledAsync retorna el valor correcto desde la tabla")]
    [Trait("Category", "Integration")]
    public async Task IsEnabledAsync_ReturnsCorrectValue()
    {
        var adminId = Guid.NewGuid();
        var companyId = await _createHandler.Handle(
            new CreateCompanyCommand("Taller Read", "taller-read", Plan.Demo, adminId),
            CancellationToken.None);

        var aiEnabled = await _flagService.IsEnabledAsync(companyId, FeatureFlags.AiGeneration);
        var bulkEnabled = await _flagService.IsEnabledAsync(companyId, FeatureFlags.BulkExport);
        var unknownKey = await _flagService.IsEnabledAsync(companyId, "unknown_key");

        Assert.True(aiEnabled);
        Assert.False(bulkEnabled);
        Assert.False(unknownKey);
    }

    [Fact(DisplayName = "AC-FLAGS-TOGGLE: SetFlagAsync actualiza enabled, updated_at y updated_by")]
    [Trait("Category", "Integration")]
    public async Task SetFlagAsync_UpdatesFlagState()
    {
        var adminId = Guid.NewGuid();
        var companyId = await _createHandler.Handle(
            new CreateCompanyCommand("Taller Toggle", "taller-toggle", Plan.Demo, adminId),
            CancellationToken.None);

        var newAdminId = Guid.NewGuid();
        await _flagService.SetFlagAsync(companyId, FeatureFlags.BulkExport, true, newAdminId);

        var flag = await _companyDb.CompanyFeatureFlags
            .FirstAsync(f => f.CompanyId == companyId && f.FeatureKey == FeatureFlags.BulkExport);

        Assert.True(flag.Enabled);
        Assert.Equal(newAdminId, flag.UpdatedBy);
        Assert.True(flag.UpdatedAt > DateTime.UtcNow.AddSeconds(-5));

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _flagService.SetFlagAsync(companyId, "invalid_key", true, adminId));
        Assert.StartsWith("UNKNOWN_FEATURE_KEY", ex.Message);
    }
}
