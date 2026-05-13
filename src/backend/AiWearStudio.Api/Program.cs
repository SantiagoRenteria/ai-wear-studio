using AiWearStudio.Api.Behaviors;
using AiWearStudio.Api.Endpoints;
using AiWearStudio.Api.Filters;
using AiWearStudio.Api.Middleware;
using AiWearStudio.Api.Startup;
using AiWearStudio.Catalog.Infrastructure;
using AiWearStudio.Catalog.Infrastructure.Persistence;
using AiWearStudio.CompanyAdmin;
using AiWearStudio.CompanyAdmin.Infrastructure;
using AiWearStudio.CompanyAdmin.Infrastructure.Persistence;
using AiWearStudio.DesignEngine.Core;
using AiWearStudio.DesignEngine.Infrastructure;
using AiWearStudio.DesignEngine.Infrastructure.Persistence;
using AiWearStudio.Users.Core;
using AiWearStudio.Users.Infrastructure;
using AiWearStudio.Users.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.HttpOverrides;
using Minio;
using Serilog;
using StackExchange.Redis;
using System.Text;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: "{Timestamp:o} [{Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, cfg) => cfg
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console(new Serilog.Formatting.Json.JsonFormatter()));

    // MediatR — pipeline order: Idempotency → Logging → Validation → Handler
    builder.Services.AddMediatR(cfg =>
    {
        cfg.RegisterServicesFromAssemblies(
            typeof(AiWearStudio.Users.Core.AssemblyMarker).Assembly,
            typeof(AiWearStudio.CompanyAdmin.AssemblyMarker).Assembly,
            typeof(AiWearStudio.Catalog.AssemblyMarker).Assembly,
            typeof(AiWearStudio.DesignEngine.Core.AssemblyMarker).Assembly);
        cfg.AddOpenBehavior(typeof(IdempotencyBehavior<,>));
        cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
        cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
    });

    builder.Services.AddValidatorsFromAssemblyContaining<AiWearStudio.Users.Core.AssemblyMarker>(ServiceLifetime.Transient);
    builder.Services.AddValidatorsFromAssembly(
        typeof(AiWearStudio.CompanyAdmin.AssemblyMarker).Assembly, ServiceLifetime.Transient);

    // JWT Authentication
    var jwtSecret = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret not configured");
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opts =>
        {
            opts.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = builder.Configuration["Jwt:Audience"],
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                RoleClaimType = "role"
            };
        });

    builder.Services.AddAuthorization(opts =>
    {
        opts.AddPolicy("RequireVerifiedEmail", policy =>
            policy.RequireAuthenticatedUser().RequireClaim("email_verified", "true"));
    });

    // Redis — Singleton compartido entre módulos
    var redisConn = builder.Configuration["Redis:ConnectionString"]
        ?? throw new InvalidOperationException("Redis:ConnectionString not configured");
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
        ConnectionMultiplexer.Connect(redisConn));

    // MinIO — P8 patch: throw if endpoint is not configured (same pattern as Redis)
    var minioEndpoint = builder.Configuration["MinIO:Endpoint"];
    if (string.IsNullOrWhiteSpace(minioEndpoint))
        throw new InvalidOperationException("MinIO:Endpoint not configured");
    var minioAccessKey = builder.Configuration["MinIO:AccessKey"] ?? "minioadmin";
    var minioSecretKey = builder.Configuration["MinIO:SecretKey"] ?? "minioadmin";
    var minioPublicBase = builder.Configuration["MinIO:PublicBaseUrl"]
        ?? throw new InvalidOperationException("MinIO:PublicBaseUrl not configured");
    _ = minioPublicBase; // validated at startup; consumed by UploadDesignAssetCommandHandler
    var minioUseSSL = bool.TryParse(builder.Configuration["MinIO:UseSSL"], out var ssl) && ssl;
    builder.Services.AddSingleton<IMinioClient>(_ =>
        new MinioClient()
            .WithEndpoint(minioEndpoint)
            .WithCredentials(minioAccessKey, minioSecretKey)
            .WithSSL(minioUseSSL)
            .Build());

    // Modules
    builder.Services.AddUsersModule(builder.Configuration);
    builder.Services.AddCompanyAdminModule(builder.Configuration);
    builder.Services.AddCatalogModule(builder.Configuration);
    builder.Services.AddDesignEngineModule(builder.Configuration);

    // IStartupFilter: captive dependency detection
    builder.Services.AddTransient<IStartupFilter, TenantContextCaptureValidationFilter>(
        sp => new TenantContextCaptureValidationFilter(builder.Services));

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
            policy.WithOrigins(
                    "http://localhost:3000",
                    "http://localhost:5173")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials());
    });

    builder.Services.AddEndpointsApiExplorer();

    var app = builder.Build();

    // Auto-migrate all BC schemas on startup (dev/container convenience)
    // EnsureSchema() in migrations won't help for the __EFMigrationsHistory table itself,
    // so we create each schema explicitly before handing off to MigrateAsync.
    if (app.Environment.IsDevelopment())
    {
        using var scope = app.Services.CreateScope();
        var sp = scope.ServiceProvider;

        var usersCtx = sp.GetRequiredService<UsersDbContext>();
        await usersCtx.Database.ExecuteSqlRawAsync("CREATE SCHEMA IF NOT EXISTS users");
        await usersCtx.Database.MigrateAsync();

        var companyAdminCtx = sp.GetRequiredService<CompanyAdminDbContext>();
        await companyAdminCtx.Database.ExecuteSqlRawAsync("CREATE SCHEMA IF NOT EXISTS company_admin");
        await companyAdminCtx.Database.MigrateAsync();

        var catalogCtx = sp.GetRequiredService<CatalogDbContext>();
        await catalogCtx.Database.ExecuteSqlRawAsync("CREATE SCHEMA IF NOT EXISTS catalog");
        await catalogCtx.Database.MigrateAsync();

        var designEngineCtx = sp.GetRequiredService<DesignEngineDbContext>();
        await designEngineCtx.Database.ExecuteSqlRawAsync("CREATE SCHEMA IF NOT EXISTS design_engine");
        await designEngineCtx.Database.MigrateAsync();

    }

    // Bucket creation runs in all environments.
    {
        using var scope = app.Services.CreateScope();
        var minioClient = scope.ServiceProvider.GetRequiredService<IMinioClient>();

        foreach (var bucket in new[] { "ai-wear-previews", "ai-wear-assets" })
        {
            var exists = await minioClient.BucketExistsAsync(
                new Minio.DataModel.Args.BucketExistsArgs().WithBucket(bucket));
            if (!exists)
                await minioClient.MakeBucketAsync(
                    new Minio.DataModel.Args.MakeBucketArgs().WithBucket(bucket));
        }
    }

    // Seed platform admin if env vars are present
    await DatabaseSeeder.SeedPlatformAdminAsync(app.Services);

    app.MapGet("/health", () => Results.Ok());

    // P5 patch: read X-Forwarded-For from trusted proxy so IP-based rate limiting
    // uses the real client IP rather than the load balancer's IP.
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    });

    app.UseCors();
    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseAuthentication();
    app.UseMiddleware<CompanySuspensionMiddleware>();
    app.UseAuthorization();
    app.MapAuthEndpoints();
    app.MapUsersEndpoints();
    app.MapCompaniesEndpoints();
    app.MapWorkshopCompaniesEndpoints();
    app.MapInvitationsEndpoints();
    app.MapCatalogEndpoints();
    app.MapAdminCatalogEndpoints();
    app.MapDesignEngineEndpoints();
    app.MapPreviewEndpoints();

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Expose Program for integration tests
public partial class Program { }
