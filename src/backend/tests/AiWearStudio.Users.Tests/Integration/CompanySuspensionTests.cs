using AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;
using AiWearStudio.CompanyAdmin.Application.Commands.SuspendCompany;
using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence.Repositories;
using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Infrastructure.Persistence;
using AiWearStudio.Users.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class CompanySuspensionTests : IAsyncLifetime
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
    private SuspendCompanyCommandHandler _suspendHandler = default!;
    private ITenantAccessRevocationService _revocationService = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        var connStr = _postgres.GetConnectionString();

        var companyOpts = new DbContextOptionsBuilder<CompanyAdminDbContext>()
            .UseNpgsql(connStr).Options;
        _companyDb = new CompanyAdminDbContext(companyOpts);
        await _companyDb.Database.MigrateAsync();

        var usersOpts = new DbContextOptionsBuilder<UsersDbContext>()
            .UseNpgsql(connStr).Options;
        _usersDb = new UsersDbContext(usersOpts);
        await _usersDb.Database.MigrateAsync();

        _companyRepo = new CompanyRepository(_companyDb);
        _revocationService = new TenantAccessRevocationService(_usersDb);
        _createHandler = new CreateCompanyCommandHandler(_companyRepo);
        _suspendHandler = new SuspendCompanyCommandHandler(_companyRepo, _revocationService);
    }

    public async Task DisposeAsync()
    {
        await _companyDb.DisposeAsync();
        await _usersDb.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-SUSPEND-ACTIVE: Suspender compañía activa persiste PlanStatus=Suspended y registra audit log")]
    [Trait("Category", "Integration")]
    public async Task SuspendCompany_ActiveCompany_PersistsSuspendedStatusAndAuditLog()
    {
        var adminId = Guid.NewGuid();
        var companyId = await _createHandler.Handle(
            new CreateCompanyCommand("Taller S1", "taller-s1", Plan.Demo, adminId),
            CancellationToken.None);

        await _suspendHandler.Handle(
            new SuspendCompanyCommand(companyId, adminId, "incumplimiento de términos"),
            CancellationToken.None);

        var company = await _companyRepo.FindByIdAsync(companyId);
        Assert.NotNull(company);
        Assert.Equal(PlanStatus.Suspended, company.PlanStatus);

        var log = await _companyDb.PlanAuditLogs
            .FirstOrDefaultAsync(l => l.CompanyId == companyId);
        Assert.NotNull(log);
        Assert.Equal(Plan.Demo, log.PreviousPlan);
        Assert.Equal(Plan.Demo, log.NewPlan);
        Assert.StartsWith("SUSPENDED", log.Reason);
    }

    [Fact(DisplayName = "AC-SUSPEND-NOT-FOUND: SuspendCompany con id inexistente lanza COMPANY_NOT_FOUND")]
    [Trait("Category", "Integration")]
    public async Task SuspendCompany_NonExistentId_ThrowsCompanyNotFound()
    {
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _suspendHandler.Handle(
                new SuspendCompanyCommand(Guid.NewGuid(), Guid.NewGuid(), null),
                CancellationToken.None));

        Assert.StartsWith("COMPANY_NOT_FOUND", ex.Message);
    }

    [Fact(DisplayName = "AC-SUSPEND-TOKENS-REVOKED: RevokeAllTokensForTenantAsync revoca todos los tokens del tenant")]
    [Trait("Category", "Integration")]
    public async Task RevokeAllTokensForTenant_RevokesAllActiveTokens()
    {
        var tenantId = Guid.NewGuid();

        // Crear dos usuarios del mismo tenant con refresh tokens
        var user1 = User.CreateInternalUser("op1@tenant.com", "hash1", AiWearStudio.Users.Core.Domain.Enums.UserRole.Operator, tenantId);
        var user2 = User.CreateInternalUser("op2@tenant.com", "hash2", AiWearStudio.Users.Core.Domain.Enums.UserRole.Operator, tenantId);
        await _usersDb.Users.AddRangeAsync(user1, user2);

        var token1 = RefreshToken.Create(user1.Id, "rawtoken1", 30);
        var token2 = RefreshToken.Create(user2.Id, "rawtoken2", 30);
        await _usersDb.RefreshTokens.AddRangeAsync(token1, token2);
        await _usersDb.SaveChangesAsync();

        await _revocationService.RevokeAllTokensForTenantAsync(tenantId);

        var tokens = await _usersDb.RefreshTokens
            .Where(rt => rt.UserId == user1.Id || rt.UserId == user2.Id)
            .ToListAsync();

        Assert.All(tokens, t => Assert.NotNull(t.RevokedAt));
    }

    [Fact(DisplayName = "AC-SUSPEND-E2E: Suspender compañía marca PlanStatus=Suspended y revoca tokens del tenant")]
    [Trait("Category", "Integration")]
    public async Task SuspendCompany_ThenRevokeTokens_CompanyIsSuspendedAndTokensRevoked()
    {
        var adminId = Guid.NewGuid();
        var tenantId_company = await _createHandler.Handle(
            new CreateCompanyCommand("Taller S2", "taller-s2", Plan.SaaS, adminId),
            CancellationToken.None);

        var user = User.CreateInternalUser("user@taller-s2.com", "hash", AiWearStudio.Users.Core.Domain.Enums.UserRole.Operator, tenantId_company);
        await _usersDb.Users.AddAsync(user);
        var token = RefreshToken.Create(user.Id, "rawtoken_s2", 30);
        await _usersDb.RefreshTokens.AddAsync(token);
        await _usersDb.SaveChangesAsync();

        await _suspendHandler.Handle(
            new SuspendCompanyCommand(tenantId_company, adminId, "fraude"),
            CancellationToken.None);

        var company = await _companyRepo.FindByIdAsync(tenantId_company);
        Assert.Equal(PlanStatus.Suspended, company!.PlanStatus);

        var revokedToken = await _usersDb.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.UserId == user.Id);
        Assert.NotNull(revokedToken!.RevokedAt);
    }
}
