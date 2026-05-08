using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.Commands.DeactivateUser;
using AiWearStudio.Users.Core.Application.Commands.RefreshToken;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Infrastructure.Persistence;
using AiWearStudio.Users.Infrastructure.Persistence.Repositories;
using AiWearStudio.Users.Infrastructure;
using AiWearStudio.Users.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class DeactivateUserTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private UsersDbContext _db = default!;
    private DeactivateUserCommandHandler _deactivateHandler = default!;
    private RefreshTokenCommandHandler _refreshHandler = default!;
    private UserRepository _userRepo = default!;
    private RefreshTokenRepository _refreshTokenRepo = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var dbOptions = new DbContextOptionsBuilder<UsersDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;

        _db = new UsersDbContext(dbOptions);
        await _db.Database.MigrateAsync();

        var jwtOptions = Options.Create(new JwtSettings
        {
            Secret = "test_secret_min_32_chars_changeme_abc",
            Issuer = "test",
            Audience = "test",
            TtlMinutes = 60,
            RefreshTokenTtlDays = 30
        });
        var jwtTokenService = new JwtTokenService(jwtOptions);
        _userRepo = new UserRepository(_db);
        _refreshTokenRepo = new RefreshTokenRepository(_db);

        _deactivateHandler = new DeactivateUserCommandHandler(_userRepo, _refreshTokenRepo);
        _refreshHandler = new RefreshTokenCommandHandler(_refreshTokenRepo, _userRepo, jwtTokenService);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-DEACTIVATE: Desactivar usuario revoca todos sus tokens y lo excluye de consultas")]
    [Trait("Category", "Integration")]
    public async Task Deactivate_RevokesAllTokensAndExcludesUser()
    {
        var user = User.CreateCustomer("deactivate@example.com", "some_hash");
        await _db.Users.AddAsync(user);

        var token1 = RefreshToken.Create(user.Id, Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)), ttlDays: 30);
        var token2 = RefreshToken.Create(user.Id, Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)), ttlDays: 30);
        await _db.RefreshTokens.AddRangeAsync(token1, token2);
        await _db.SaveChangesAsync();

        await _deactivateHandler.Handle(new DeactivateUserCommand(user.Id), CancellationToken.None);

        var foundUser = await _userRepo.FindByIdAsync(user.Id);
        Assert.Null(foundUser);

        var activeTokens = await _db.RefreshTokens
            .CountAsync(rt => rt.UserId == user.Id && rt.RevokedAt == null);
        Assert.Equal(0, activeTokens);
    }

    [Fact(DisplayName = "AC-DEACTIVATE-REPLAY: Refresh con token de usuario desactivado lanza TOKEN_EXPIRED")]
    [Trait("Category", "Integration")]
    public async Task Deactivate_RefreshWithDeactivatedUserToken_ThrowsTokenExpired()
    {
        var user = User.CreateCustomer("deactivate-replay@example.com", "some_hash");
        await _db.Users.AddAsync(user);

        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var refreshToken = RefreshToken.Create(user.Id, rawToken, ttlDays: 30);
        await _db.RefreshTokens.AddAsync(refreshToken);
        await _db.SaveChangesAsync();

        await _deactivateHandler.Handle(new DeactivateUserCommand(user.Id), CancellationToken.None);

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _refreshHandler.Handle(new RefreshTokenCommand(rawToken), CancellationToken.None));

        Assert.StartsWith("TOKEN_EXPIRED", ex.Message);
    }

    [Fact(DisplayName = "AC-DEACTIVATE-NOT-FOUND: Desactivar usuario inexistente lanza USER_NOT_FOUND")]
    [Trait("Category", "Integration")]
    public async Task Deactivate_NonExistentUser_ThrowsUserNotFound()
    {
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _deactivateHandler.Handle(
                new DeactivateUserCommand(Guid.NewGuid()),
                CancellationToken.None));

        Assert.StartsWith("USER_NOT_FOUND", ex.Message);
    }

    [Fact(DisplayName = "AC-DEACTIVATE-ALREADY-INACTIVE: Desactivar usuario ya desactivado lanza USER_NOT_FOUND")]
    [Trait("Category", "Integration")]
    public async Task Deactivate_AlreadyDeactivatedUser_ThrowsUserNotFound()
    {
        var user = User.CreateCustomer("already-inactive@example.com", "some_hash");
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();

        await _deactivateHandler.Handle(new DeactivateUserCommand(user.Id), CancellationToken.None);

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _deactivateHandler.Handle(new DeactivateUserCommand(user.Id), CancellationToken.None));

        Assert.StartsWith("USER_NOT_FOUND", ex.Message);
    }

    [Fact(DisplayName = "AC-DEACTIVATE-HASQUERYFILTER: HasQueryFilter bloquea refresh aunque el token no esté revocado")]
    [Trait("Category", "Integration")]
    public async Task Deactivate_HasQueryFilterBlocksRefresh_EvenWithNonRevokedToken()
    {
        var user = User.CreateCustomer("hqf@example.com", "some_hash");
        await _db.Users.AddAsync(user);
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var token = RefreshToken.Create(user.Id, rawToken, ttlDays: 30);
        await _db.RefreshTokens.AddAsync(token);
        await _db.SaveChangesAsync();

        // Simula fallo parcial: desactiva el usuario sin revocar tokens
        user.Deactivate();
        await _db.SaveChangesAsync();

        Assert.False(token.IsRevoked());

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _refreshHandler.Handle(new RefreshTokenCommand(rawToken), CancellationToken.None));
        Assert.StartsWith("TOKEN_EXPIRED", ex.Message);
    }
}
