using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.Commands.RegisterCustomer;
using AiWearStudio.Users.Core.Application.Commands.ResendVerificationEmail;
using AiWearStudio.Users.Core.Application.Commands.VerifyEmail;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Infrastructure;
using AiWearStudio.Users.Infrastructure.Persistence;
using AiWearStudio.Users.Infrastructure.Persistence.Repositories;
using AiWearStudio.Users.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Testcontainers.PostgreSql;
using Testcontainers.Redis;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class EmailVerificationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb").WithUsername("testuser").WithPassword("testpass").Build();

    private readonly RedisContainer _redis = new RedisBuilder("redis:7-alpine").Build();

    private UsersDbContext _db = default!;
    private RegisterCustomerCommandHandler _registerHandler = default!;
    private VerifyEmailCommandHandler _verifyHandler = default!;
    private ResendVerificationEmailCommandHandler _resendHandler = default!;
    private RedisEmailVerificationTokenService _tokenService = default!;
    private JwtTokenService _jwtService = default!;

    public async Task InitializeAsync()
    {
        await Task.WhenAll(_postgres.StartAsync(), _redis.StartAsync());

        var dbOptions = new DbContextOptionsBuilder<UsersDbContext>()
            .UseNpgsql(_postgres.GetConnectionString()).Options;

        _db = new UsersDbContext(dbOptions);
        await _db.Database.MigrateAsync();

        var multiplexer = await ConnectionMultiplexer.ConnectAsync(_redis.GetConnectionString());
        _tokenService = new RedisEmailVerificationTokenService(multiplexer);

        var jwtOptions = Options.Create(new JwtSettings
        {
            Secret = "test_secret_min_32_chars_changeme_abc",
            Issuer = "test", Audience = "test", TtlMinutes = 60, RefreshTokenTtlDays = 30
        });
        _jwtService = new JwtTokenService(jwtOptions);

        var passwordHasher = new PasswordHasher<User>();
        var passwordHasherService = new PasswordHasherService(passwordHasher);
        var userRepo = new UserRepository(_db);
        var emailSender = new LoggingEmailSender(NullLogger<LoggingEmailSender>.Instance);

        _registerHandler = new RegisterCustomerCommandHandler(
            userRepo, _jwtService, passwordHasherService,
            _tokenService, emailSender, NullLogger<RegisterCustomerCommandHandler>.Instance);

        _verifyHandler = new VerifyEmailCommandHandler(_tokenService, userRepo);

        _resendHandler = new ResendVerificationEmailCommandHandler(
            _tokenService, userRepo, emailSender, NullLogger<ResendVerificationEmailCommandHandler>.Instance);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
        await _redis.DisposeAsync();
    }

    [Fact(DisplayName = "AC-EMAIL-01: Registro crea usuario con email_verified=false y token Redis con TTL")]
    [Trait("Category", "Integration")]
    public async Task Register_CreatesUserWithEmailVerifiedFalse_AndRedisToken()
    {
        var response = await _registerHandler.Handle(
            new RegisterCustomerCommand("verify@example.com", "TestPass1234!"),
            CancellationToken.None);

        Assert.NotEmpty(response.AccessToken);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == "verify@example.com");
        Assert.NotNull(user);
        Assert.False(user!.EmailVerified);
        Assert.Null(user.EmailVerifiedAt);

        // JWT debe contener email_verified=false
        var payload = System.IdentityModel.Tokens.Jwt.JwtPayload.Base64UrlDeserialize(
            response.AccessToken.Split('.')[1]);
        Assert.Equal("false", payload["email_verified"]?.ToString());
    }

    [Fact(DisplayName = "AC-EMAIL-02: verify-email con token válido actualiza email_verified=true en DB y elimina token Redis")]
    [Trait("Category", "Integration")]
    public async Task VerifyEmail_WithValidToken_SetsEmailVerifiedTrue()
    {
        var hash = new PasswordHasher<User>().HashPassword(null!, "Pass1234!");
        var user = User.CreateCustomer("toverify@example.com", hash);
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();

        var token = await _tokenService.CreateTokenAsync(user.Id);

        await _verifyHandler.Handle(new VerifyEmailCommand(token), CancellationToken.None);

        var updated = await _db.Users.FirstAsync(u => u.Id == user.Id);
        Assert.True(updated.EmailVerified);
        Assert.NotNull(updated.EmailVerifiedAt);

        // Token ya no debe existir en Redis
        var consumed = await _tokenService.ConsumeTokenAsync(token);
        Assert.Null(consumed);
    }

    [Fact(DisplayName = "AC-EMAIL-03: verify-email con token inválido lanza EMAIL_VERIFICATION_TOKEN_INVALID")]
    [Trait("Category", "Integration")]
    public async Task VerifyEmail_WithInvalidToken_ThrowsDomainException()
    {
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _verifyHandler.Handle(new VerifyEmailCommand("invalid_token_xyz"), CancellationToken.None));

        Assert.StartsWith("EMAIL_VERIFICATION_TOKEN_INVALID", ex.Message);
    }

    [Fact(DisplayName = "AC-EMAIL-04: verify-email con token ya consumido lanza EMAIL_VERIFICATION_TOKEN_INVALID")]
    [Trait("Category", "Integration")]
    public async Task VerifyEmail_WithConsumedToken_ThrowsDomainException()
    {
        var hash = new PasswordHasher<User>().HashPassword(null!, "Pass1234!");
        var user = User.CreateCustomer("consumed@example.com", hash);
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();

        var token = await _tokenService.CreateTokenAsync(user.Id);
        await _verifyHandler.Handle(new VerifyEmailCommand(token), CancellationToken.None);

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _verifyHandler.Handle(new VerifyEmailCommand(token), CancellationToken.None));

        Assert.StartsWith("EMAIL_VERIFICATION_TOKEN_INVALID", ex.Message);
    }

    [Fact(DisplayName = "AC-EMAIL-05: ResendVerification excedido 3 intentos en 15min lanza RESEND_LIMIT_EXCEEDED")]
    [Trait("Category", "Integration")]
    public async Task ResendVerification_ExceedsLimit_ThrowsResendLimitExceeded()
    {
        var hash = new PasswordHasher<User>().HashPassword(null!, "Pass1234!");
        var user = User.CreateCustomer("resend@example.com", hash);
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();

        var command = new ResendVerificationEmailCommand("resend@example.com");
        // Primeros 3 intentos deben pasar
        for (int i = 0; i < 3; i++)
            await _resendHandler.Handle(command, CancellationToken.None);

        // El 4to debe fallar
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _resendHandler.Handle(command, CancellationToken.None));

        Assert.StartsWith("RESEND_LIMIT_EXCEEDED", ex.Message);
    }

    [Fact(DisplayName = "AC-EMAIL-06: RedisAiRateLimiter con 10 llamadas concurrentes retorna exactamente ≤10 positivos")]
    [Trait("Category", "Integration")]
    public async Task AiRateLimiter_10ConcurrentCalls_ExactlyTenPositive()
    {
        var multiplexer = await ConnectionMultiplexer.ConnectAsync(_redis.GetConnectionString());
        var rateLimiter = new RedisAiRateLimiter(multiplexer);
        var userId = Guid.NewGuid();

        var tasks = Enumerable.Range(0, 15).Select(_ =>
            rateLimiter.CheckAndIncrementAsync(userId)).ToList();

        var results = await Task.WhenAll(tasks);

        var positiveCount = results.Count(r => r > 0);
        var negativeCount = results.Count(r => r == -1);

        Assert.Equal(10, positiveCount);
        Assert.Equal(5, negativeCount);
    }
}
