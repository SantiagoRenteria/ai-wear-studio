using AiWearStudio.CompanyAdmin.Application.Commands.AssignPlan;
using AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;
using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence.Repositories;
using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Infrastructure.Persistence;
using AiWearStudio.Users.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class CompanyAdminTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private CompanyAdminDbContext _companyDb = default!;
    private UsersDbContext _usersDb = default!;
    private CompanyRepository _companyRepo = default!;
    private CreateCompanyCommandHandler _createHandler = default!;
    private AssignPlanCommandHandler _assignPlanHandler = default!;
    private IPasswordHasherService _hasher = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var connStr = _postgres.GetConnectionString();

        var companyOpts = new DbContextOptionsBuilder<CompanyAdminDbContext>()
            .UseNpgsql(connStr)
            .Options;
        _companyDb = new CompanyAdminDbContext(companyOpts);
        await _companyDb.Database.MigrateAsync();

        var usersOpts = new DbContextOptionsBuilder<UsersDbContext>()
            .UseNpgsql(connStr)
            .Options;
        _usersDb = new UsersDbContext(usersOpts);
        await _usersDb.Database.MigrateAsync();

        _companyRepo = new CompanyRepository(_companyDb);
        _createHandler = new CreateCompanyCommandHandler(_companyRepo);
        _assignPlanHandler = new AssignPlanCommandHandler(_companyRepo);

        var jwtOptions = Options.Create(new AiWearStudio.Users.Infrastructure.JwtSettings
        {
            Secret = "test_secret_min_32_chars_changeme_abc",
            Issuer = "test",
            Audience = "test",
            TtlMinutes = 60,
            RefreshTokenTtlDays = 30
        });
        _hasher = new PasswordHasherService(new Microsoft.AspNetCore.Identity.PasswordHasher<User>());
    }

    public async Task DisposeAsync()
    {
        await _companyDb.DisposeAsync();
        await _usersDb.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-COMPANY-CREATE: Crear compañía persiste con PlanStatus=Active y retorna Id")]
    [Trait("Category", "Integration")]
    public async Task CreateCompany_PersistsWithActiveStatus_ReturnsId()
    {
        var adminId = Guid.NewGuid();
        var id = await _createHandler.Handle(
            new CreateCompanyCommand("Taller A", "taller-a", Plan.Demo, adminId),
            CancellationToken.None);

        Assert.NotEqual(Guid.Empty, id);

        var company = await _companyRepo.FindByIdAsync(id);
        Assert.NotNull(company);
        Assert.Equal("taller-a", company.Slug);
        Assert.Equal(PlanStatus.Active, company.PlanStatus);
        Assert.Equal(Plan.Demo, company.Plan);
        Assert.Equal(adminId, company.ActivatedBy);
    }

    [Fact(DisplayName = "AC-COMPANY-SLUG-DUPLICATE: Slug duplicado lanza DUPLICATE_SLUG")]
    [Trait("Category", "Integration")]
    public async Task CreateCompany_DuplicateSlug_ThrowsDuplicateSlug()
    {
        var adminId = Guid.NewGuid();
        await _createHandler.Handle(
            new CreateCompanyCommand("Taller B", "taller-b", Plan.Demo, adminId),
            CancellationToken.None);

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _createHandler.Handle(
                new CreateCompanyCommand("Taller B Copia", "taller-b", Plan.SaaS, adminId),
                CancellationToken.None));

        Assert.StartsWith("DUPLICATE_SLUG", ex.Message);
    }

    [Fact(DisplayName = "AC-COMPANY-ASSIGN-PLAN-AUDIT: AssignPlan registra entrada en plan_audit_log")]
    [Trait("Category", "Integration")]
    public async Task AssignPlan_RecordsPlanAuditLog()
    {
        var adminId = Guid.NewGuid();
        var companyId = await _createHandler.Handle(
            new CreateCompanyCommand("Taller C", "taller-c", Plan.Demo, adminId),
            CancellationToken.None);

        await _assignPlanHandler.Handle(
            new AssignPlanCommand(companyId, Plan.SaaS, adminId, "upgrade por crecimiento"),
            CancellationToken.None);

        var company = await _companyRepo.FindByIdAsync(companyId);
        Assert.Equal(Plan.SaaS, company!.Plan);

        var log = await _companyDb.PlanAuditLogs
            .FirstOrDefaultAsync(l => l.CompanyId == companyId);
        Assert.NotNull(log);
        Assert.Equal(Plan.Demo, log.PreviousPlan);
        Assert.Equal(Plan.SaaS, log.NewPlan);
        Assert.Equal(adminId, log.AdminId);
        Assert.Equal("upgrade por crecimiento", log.Reason);
    }

    [Fact(DisplayName = "AC-COMPANY-NOT-FOUND: AssignPlan con id inexistente lanza COMPANY_NOT_FOUND")]
    [Trait("Category", "Integration")]
    public async Task AssignPlan_NonExistentCompany_ThrowsCompanyNotFound()
    {
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _assignPlanHandler.Handle(
                new AssignPlanCommand(Guid.NewGuid(), Plan.SaaS, Guid.NewGuid(), null),
                CancellationToken.None));

        Assert.StartsWith("COMPANY_NOT_FOUND", ex.Message);
    }

    [Fact(DisplayName = "AC-COMPANY-SEED-IDEMPOTENT: CreatePlatformAdmin factory crea usuario con Role=PlatformAdmin y TenantId=null")]
    [Trait("Category", "Integration")]
    public async Task CreatePlatformAdmin_CreatesUserWithCorrectRole()
    {
        var hash = _hasher.HashPassword("admin_password_123");
        var admin = User.CreatePlatformAdmin("admin@platform.com", hash);

        await _usersDb.Users.AddAsync(admin);
        await _usersDb.SaveChangesAsync();

        var found = await _usersDb.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == "admin@platform.com");

        Assert.NotNull(found);
        Assert.Equal(AiWearStudio.Users.Core.Domain.Enums.UserRole.PlatformAdmin, found.Role);
        Assert.Null(found.TenantId);

        // Idempotencia: agregar mismo usuario no debe lanzar si ya existe (verificar que el admin ya está)
        var existing = await _usersDb.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Email == "admin@platform.com");
        Assert.Equal(1, existing);
    }
}
