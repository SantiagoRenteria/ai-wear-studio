using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AiWearStudio.Api.Startup;

public static class DatabaseSeeder
{
    public static async Task SeedPlatformAdminAsync(IServiceProvider services)
    {
        var adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL");
        var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD");

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
            return;

        using var scope = services.CreateScope();
        var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasherService>();

        var existing = await userRepo.FindByEmailAsync(adminEmail);
        if (existing is not null)
            return;

        try
        {
            var hash = hasher.HashPassword(adminPassword);
            var admin = User.CreatePlatformAdmin(adminEmail, hash);
            await userRepo.AddAsync(admin);
            await userRepo.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is Npgsql.PostgresException pg && pg.SqlState == "23505")
        {
            // Another instance seeded concurrently — idempotent, not an error.
        }
    }
}
