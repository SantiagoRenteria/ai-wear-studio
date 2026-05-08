using AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;
using AiWearStudio.CompanyAdmin.Application.Commands.UpdateCompanySettings;
using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence.Repositories;
using AiWearStudio.CompanyAdmin.Infrastructure.Services;
using AiWearStudio.SharedKernel.Domain;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class CompanySettingsTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private CompanyAdminDbContext _db = default!;
    private CompanyRepository _companyRepo = default!;
    private UpdateCompanySettingsCommandHandler _handler = default!;
    private Guid _companyId;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        var connStr = _postgres.GetConnectionString();

        var opts = new DbContextOptionsBuilder<CompanyAdminDbContext>().UseNpgsql(connStr).Options;
        _db = new CompanyAdminDbContext(opts);
        await _db.Database.MigrateAsync();

        _companyRepo = new CompanyRepository(_db);
        var flagService = new FeatureFlagService(_db);
        var createHandler = new CreateCompanyCommandHandler(_companyRepo, flagService);

        _companyId = await createHandler.Handle(
            new CreateCompanyCommand("Taller Original", "taller-orig", Plan.SaaS, Guid.NewGuid()),
            CancellationToken.None);

        _handler = new UpdateCompanySettingsCommandHandler(_companyRepo);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-SETTINGS-NAME: Actualizar nombre persiste el nuevo nombre sin tocar otros settings")]
    [Trait("Category", "Integration")]
    public async Task UpdateSettings_NewName_PersistsNameAndPreservesSettings()
    {
        // Precarga settings iniciales
        await _handler.Handle(
            new UpdateCompanySettingsCommand(_companyId, null,
                new Dictionary<string, string> { ["primary"] = "#AABBCC" }, null),
            CancellationToken.None);

        await _handler.Handle(
            new UpdateCompanySettingsCommand(_companyId, "Taller Nuevo", null, null),
            CancellationToken.None);

        _db.ChangeTracker.Clear();
        var company = await _companyRepo.FindByIdAsync(_companyId);

        Assert.NotNull(company);
        Assert.Equal("Taller Nuevo", company.Name);

        // Los brand_colors previos deben permanecer intactos
        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(company.Settings!)!;
        Assert.True(dict.ContainsKey("brand_colors"));
    }

    [Fact(DisplayName = "AC-SETTINGS-COLORS: BrandColors hex se almacenan en settings.brand_colors y domain_config siempre presente")]
    [Trait("Category", "Integration")]
    public async Task UpdateSettings_BrandColors_PersistedAndDomainConfigEnsured()
    {
        var colors = new Dictionary<string, string>
        {
            ["primary"] = "#FF5733",
            ["secondary"] = "#C70039"
        };

        await _handler.Handle(
            new UpdateCompanySettingsCommand(_companyId, null, colors, null),
            CancellationToken.None);

        _db.ChangeTracker.Clear();
        var company = await _companyRepo.FindByIdAsync(_companyId);
        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(company!.Settings!)!;

        var brandColors = JsonSerializer.Deserialize<Dictionary<string, string>>(dict["brand_colors"].GetRawText())!;
        Assert.Equal("#FF5733", brandColors["primary"]);
        Assert.Equal("#C70039", brandColors["secondary"]);
        Assert.True(dict.ContainsKey("domain_config"));
    }

    [Fact(DisplayName = "AC-SETTINGS-NOTIFICATIONS: NotificationConfig JSON se almacena en settings.notification_config")]
    [Trait("Category", "Integration")]
    public async Task UpdateSettings_NotificationConfig_Persisted()
    {
        var notifJson = """{"orderUpdates":true,"marketing":false}""";

        await _handler.Handle(
            new UpdateCompanySettingsCommand(_companyId, null, null, notifJson),
            CancellationToken.None);

        _db.ChangeTracker.Clear();
        var company = await _companyRepo.FindByIdAsync(_companyId);
        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(company!.Settings!)!;

        Assert.True(dict.ContainsKey("notification_config"));
        var notif = dict["notification_config"];
        Assert.True(notif.GetProperty("orderUpdates").GetBoolean());
        Assert.False(notif.GetProperty("marketing").GetBoolean());
    }

    [Fact(DisplayName = "AC-SETTINGS-NOT-FOUND: CompanyId inexistente lanza COMPANY_NOT_FOUND")]
    [Trait("Category", "Integration")]
    public async Task UpdateSettings_NonExistentCompany_ThrowsCompanyNotFound()
    {
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(
                new UpdateCompanySettingsCommand(Guid.NewGuid(), "Nombre", null, null),
                CancellationToken.None));

        Assert.StartsWith("COMPANY_NOT_FOUND", ex.Message);
    }
}
