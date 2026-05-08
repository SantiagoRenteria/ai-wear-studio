using AiWearStudio.Api.Behaviors;
using AiWearStudio.Api.Endpoints;
using AiWearStudio.Api.Filters;
using AiWearStudio.Api.Middleware;
using AiWearStudio.Api.Startup;
using AiWearStudio.CompanyAdmin;
using AiWearStudio.CompanyAdmin.Infrastructure;
using AiWearStudio.Users.Core; // kept for other implicit usages
using AiWearStudio.Users.Infrastructure;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
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
            typeof(AiWearStudio.CompanyAdmin.AssemblyMarker).Assembly);
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

    builder.Services.AddAuthorization();

    // Modules
    builder.Services.AddUsersModule(builder.Configuration);
    builder.Services.AddCompanyAdminModule(builder.Configuration);

    // IStartupFilter: captive dependency detection
    builder.Services.AddTransient<IStartupFilter, TenantContextCaptureValidationFilter>(
        sp => new TenantContextCaptureValidationFilter(builder.Services));

    builder.Services.AddEndpointsApiExplorer();

    var app = builder.Build();

    // Seed platform admin if env vars are present
    await DatabaseSeeder.SeedPlatformAdminAsync(app.Services);

    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapAuthEndpoints();
    app.MapUsersEndpoints();
    app.MapCompaniesEndpoints();

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
