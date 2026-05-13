using AiWearStudio.SharedKernel.Common;
using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Application.Services;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Repositories;
using AiWearStudio.Users.Infrastructure.Persistence;
using AiWearStudio.Users.Infrastructure.Persistence.Repositories;
using AiWearStudio.Users.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AiWearStudio.Users.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddUsersModule(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<JwtSettings>(options => config.GetSection("Jwt").Bind(options));
        services.AddDbContext<UsersDbContext>(opts =>
            opts.UseNpgsql(config.GetConnectionString("Users")));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IUserInvitationRepository, UserInvitationRepository>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IPasswordHasherService, PasswordHasherService>();
        services.AddScoped<ITenantAccessRevocationService, TenantAccessRevocationService>();
        services.AddScoped<IEmailSender, LoggingEmailSender>();
        services.AddScoped<IEmailVerificationTokenService, RedisEmailVerificationTokenService>();
        services.AddSingleton<IAiRateLimiter, RedisAiRateLimiter>();

        return services;
    }
}
