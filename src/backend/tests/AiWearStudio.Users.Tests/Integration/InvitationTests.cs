using AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;
using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence.Repositories;
using AiWearStudio.CompanyAdmin.Infrastructure.Services;
using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.Commands.AcceptInvitation;
using AiWearStudio.Users.Core.Application.Commands.SendInvitation;
using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Enums;
using AiWearStudio.Users.Infrastructure;
using AiWearStudio.Users.Infrastructure.Persistence;
using AiWearStudio.Users.Infrastructure.Persistence.Repositories;
using AiWearStudio.Users.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class InvitationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private CompanyAdminDbContext _companyDb = default!;
    private UsersDbContext _usersDb = default!;
    private SendInvitationCommandHandler _sendHandler = default!;
    private AcceptInvitationCommandHandler _acceptHandler = default!;
    private UserInvitationRepository _invitationRepo = default!;
    private UserRepository _userRepo = default!;
    private Guid _tenantId;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        var connStr = _postgres.GetConnectionString();

        var companyOpts = new DbContextOptionsBuilder<CompanyAdminDbContext>().UseNpgsql(connStr).Options;
        _companyDb = new CompanyAdminDbContext(companyOpts);
        await _companyDb.Database.MigrateAsync();

        var usersOpts = new DbContextOptionsBuilder<UsersDbContext>().UseNpgsql(connStr).Options;
        _usersDb = new UsersDbContext(usersOpts);
        await _usersDb.Database.MigrateAsync();

        var companyRepo = new CompanyRepository(_companyDb);
        var featureFlagService = new FeatureFlagService(_companyDb);
        var createCompanyHandler = new CreateCompanyCommandHandler(companyRepo, featureFlagService);
        _tenantId = await createCompanyHandler.Handle(
            new CreateCompanyCommand("Taller Invitaciones", "taller-inv", Plan.SaaS, Guid.NewGuid()),
            CancellationToken.None);

        _invitationRepo = new UserInvitationRepository(_usersDb);
        _userRepo = new UserRepository(_usersDb);
        var refreshTokenRepo = new RefreshTokenRepository(_usersDb);

        var jwtOptions = Options.Create(new JwtSettings
        {
            Secret = "test_secret_min_32_chars_changeme_abc",
            Issuer = "test",
            Audience = "test",
            TtlMinutes = 60,
            RefreshTokenTtlDays = 30
        });
        var jwtService = new JwtTokenService(jwtOptions);
        var hasher = new PasswordHasherService(new PasswordHasher<User>());
        var emailSender = new LoggingEmailSender(NullLogger<LoggingEmailSender>.Instance);

        _sendHandler = new SendInvitationCommandHandler(_invitationRepo, emailSender);
        _acceptHandler = new AcceptInvitationCommandHandler(
            _invitationRepo, _userRepo, refreshTokenRepo, jwtService, hasher);
    }

    public async Task DisposeAsync()
    {
        await _companyDb.DisposeAsync();
        await _usersDb.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-INVITE-SEND: Enviar invitación persiste registro con token y TTL 48h")]
    [Trait("Category", "Integration")]
    public async Task SendInvitation_PersistsWithTokenAndTtl()
    {
        var adminId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var id = await _sendHandler.Handle(
            new SendInvitationCommand("operario@taller.com", UserRole.Operator, _tenantId, adminId),
            CancellationToken.None);

        Assert.NotEqual(Guid.Empty, id);

        var inv = await _usersDb.UserInvitations.FindAsync(id);
        Assert.NotNull(inv);
        Assert.Equal("operario@taller.com", inv.Email);
        Assert.Equal(UserRole.Operator, inv.Role);
        Assert.Equal(_tenantId, inv.TenantId);
        Assert.NotEqual(Guid.Empty, inv.Token);
        Assert.Null(inv.ConsumedAt);
        Assert.True(inv.ExpiresAt > before.AddHours(47));
        Assert.True(inv.ExpiresAt < before.AddHours(49));
    }

    [Fact(DisplayName = "AC-INVITE-SCOPE: Invitación duplicada lanza DUPLICATE_INVITATION")]
    [Trait("Category", "Integration")]
    public async Task SendInvitation_Duplicate_ThrowsDuplicateInvitation()
    {
        var adminId = Guid.NewGuid();
        await _sendHandler.Handle(
            new SendInvitationCommand("dup@taller.com", UserRole.Operator, _tenantId, adminId),
            CancellationToken.None);

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _sendHandler.Handle(
                new SendInvitationCommand("dup@taller.com", UserRole.Operator, _tenantId, adminId),
                CancellationToken.None));

        Assert.StartsWith("DUPLICATE_INVITATION", ex.Message);
    }

    [Fact(DisplayName = "AC-INVITE-ACCEPT: Aceptar invitación crea usuario, refresca token y marca consumed")]
    [Trait("Category", "Integration")]
    public async Task AcceptInvitation_CreatesUserAndMarksConsumed()
    {
        var adminId = Guid.NewGuid();
        await _sendHandler.Handle(
            new SendInvitationCommand("nuevo@taller.com", UserRole.WorkshopAdmin, _tenantId, adminId),
            CancellationToken.None);

        var inv = await _usersDb.UserInvitations
            .FirstAsync(i => i.Email == "nuevo@taller.com");

        var response = await _acceptHandler.Handle(
            new AcceptInvitationCommand(inv.Token, "Password123!"),
            CancellationToken.None);

        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);

        await _usersDb.Entry(inv).ReloadAsync();
        Assert.NotNull(inv.ConsumedAt);

        var user = await _usersDb.Users.FirstOrDefaultAsync(u => u.Email == "nuevo@taller.com");
        Assert.NotNull(user);
        Assert.Equal(UserRole.WorkshopAdmin, user.Role);
        Assert.Equal(_tenantId, user.TenantId);
    }

    [Fact(DisplayName = "AC-INVITE-EXPIRED: Token expirado lanza INVITATION_EXPIRED")]
    [Trait("Category", "Integration")]
    public async Task AcceptInvitation_Expired_ThrowsInvitationExpired()
    {
        var inv = UserInvitation.Create("expired@taller.com", UserRole.Operator, _tenantId, Guid.NewGuid());

        // Forzar expiración manipulando directamente la DB con SQL
        await _usersDb.UserInvitations.AddAsync(inv);
        await _usersDb.SaveChangesAsync();

        await _usersDb.Database.ExecuteSqlRawAsync(
            "UPDATE users.user_invitations SET expires_at = NOW() - INTERVAL '1 hour' WHERE id = {0}",
            inv.Id);

        _usersDb.ChangeTracker.Clear();
        var freshInv = await _usersDb.UserInvitations.FindAsync(inv.Id);

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _acceptHandler.Handle(
                new AcceptInvitationCommand(freshInv!.Token, "Password123!"),
                CancellationToken.None));

        Assert.StartsWith("INVITATION_EXPIRED", ex.Message);
    }

    [Fact(DisplayName = "AC-INVITE-CONSUMED: Token ya consumido lanza INVITATION_ALREADY_CONSUMED")]
    [Trait("Category", "Integration")]
    public async Task AcceptInvitation_AlreadyConsumed_ThrowsInvitationAlreadyConsumed()
    {
        var adminId = Guid.NewGuid();
        await _sendHandler.Handle(
            new SendInvitationCommand("consumed@taller.com", UserRole.Operator, _tenantId, adminId),
            CancellationToken.None);

        var inv = await _usersDb.UserInvitations.FirstAsync(i => i.Email == "consumed@taller.com");

        await _acceptHandler.Handle(
            new AcceptInvitationCommand(inv.Token, "Password123!"),
            CancellationToken.None);

        _usersDb.ChangeTracker.Clear();

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _acceptHandler.Handle(
                new AcceptInvitationCommand(inv.Token, "Password123!"),
                CancellationToken.None));

        Assert.StartsWith("INVITATION_ALREADY_CONSUMED", ex.Message);
    }
}
