using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.Commands.Login;
using AiWearStudio.Users.Core.Application.Commands.Logout;
using AiWearStudio.Users.Core.Application.Commands.RefreshToken;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Infrastructure;
using AiWearStudio.Users.Infrastructure.Persistence;
using AiWearStudio.Users.Infrastructure.Persistence.Repositories;
using AiWearStudio.Users.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class AuthFlowTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private UsersDbContext _db = default!;
    private LoginCommandHandler _loginHandler = default!;
    private RefreshTokenCommandHandler _refreshHandler = default!;
    private LogoutCommandHandler _logoutHandler = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var dbOptions = new DbContextOptionsBuilder<UsersDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;

        _db = new UsersDbContext(dbOptions);
        await _db.Database.MigrateAsync();

        var passwordHasher = new PasswordHasher<User>();
        var passwordHasherService = new PasswordHasherService(passwordHasher);
        var jwtOptions = Options.Create(new JwtSettings
        {
            Secret = "test_secret_min_32_chars_changeme_abc",
            Issuer = "test",
            Audience = "test",
            TtlMinutes = 60,
            RefreshTokenTtlDays = 30
        });
        var jwtTokenService = new JwtTokenService(jwtOptions);
        var userRepo = new UserRepository(_db);
        var refreshTokenRepo = new RefreshTokenRepository(_db);

        _loginHandler = new LoginCommandHandler(userRepo, refreshTokenRepo, jwtTokenService, passwordHasherService);
        _refreshHandler = new RefreshTokenCommandHandler(refreshTokenRepo, userRepo, jwtTokenService);
        _logoutHandler = new LogoutCommandHandler(refreshTokenRepo);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-AUTH-LOGIN: Login exitoso retorna tokens y persiste exactamente un RefreshToken en DB")]
    [Trait("Category", "Integration")]
    public async Task Login_WithValidCredentials_ReturnsTokensAndPersistsRefreshToken()
    {
        var passwordHasher = new PasswordHasher<User>();
        var hash = passwordHasher.HashPassword(null!, "TestPass1234!");
        var user = User.CreateCustomer("logintest@example.com", hash);
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();

        var response = await _loginHandler.Handle(
            new LoginCommand("logintest@example.com", "TestPass1234!"),
            CancellationToken.None);

        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);

        var storedCount = await _db.RefreshTokens.CountAsync(rt => rt.UserId == user.Id);
        Assert.Equal(1, storedCount);
    }

    [Fact(DisplayName = "AC-AUTH-LOGIN-INVALID: Credenciales incorrectas lanzan INVALID_CREDENTIALS")]
    [Trait("Category", "Integration")]
    public async Task Login_WithInvalidCredentials_ThrowsInvalidCredentials()
    {
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _loginHandler.Handle(
                new LoginCommand("noexiste@example.com", "wrong"),
                CancellationToken.None));

        Assert.StartsWith("INVALID_CREDENTIALS", ex.Message);
    }

    [Fact(DisplayName = "AC-AUTH-REFRESH-ROTATION: Refresh rota token; token anterior revocado; re-uso lanza TOKEN_EXPIRED")]
    [Trait("Category", "Integration")]
    public async Task Refresh_RotatesToken_OldTokenRevokedAndReplayRejected()
    {
        var user = User.CreateCustomer("refresh@example.com", "some_hash");
        await _db.Users.AddAsync(user);

        var rawOldToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var oldToken = RefreshToken.Create(user.Id, rawOldToken, ttlDays: 30);
        await _db.RefreshTokens.AddAsync(oldToken);
        await _db.SaveChangesAsync();

        var response = await _refreshHandler.Handle(
            new RefreshTokenCommand(rawOldToken),
            CancellationToken.None);

        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);
        Assert.NotEqual(rawOldToken, response.RefreshToken);

        Assert.True(oldToken.IsRevoked(), "El token anterior debe quedar revocado tras la rotación");

        var replayEx = await Assert.ThrowsAsync<DomainException>(() =>
            _refreshHandler.Handle(new RefreshTokenCommand(rawOldToken), CancellationToken.None));
        Assert.StartsWith("TOKEN_EXPIRED", replayEx.Message);
    }

    [Fact(DisplayName = "AC-AUTH-LOGOUT: Logout revoca token; operación es idempotente")]
    [Trait("Category", "Integration")]
    public async Task Logout_RevokesToken_IsIdempotent()
    {
        var user = User.CreateCustomer("logout@example.com", "some_hash");
        await _db.Users.AddAsync(user);
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var token = RefreshToken.Create(user.Id, rawToken, ttlDays: 30);
        await _db.RefreshTokens.AddAsync(token);
        await _db.SaveChangesAsync();

        await _logoutHandler.Handle(new LogoutCommand(rawToken), CancellationToken.None);

        Assert.True(token.IsRevoked(), "El token debe quedar revocado después del logout");

        var result = await _logoutHandler.Handle(new LogoutCommand(rawToken), CancellationToken.None);
        Assert.Equal(MediatR.Unit.Value, result);
    }
}
