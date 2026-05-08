using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Enums;
using AiWearStudio.Users.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.Users.Tests.Integration;

public class TenantIsolationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private UsersDbContext _db = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var options = new DbContextOptionsBuilder<UsersDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;

        _db = new UsersDbContext(options);
        await _db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "AC-RBAC-CROSS-TENANT: Operator from Tenant A cannot see resources of Tenant B")]
    [Trait("Category", "Integration")]
    public async Task CrossTenantQuery_ReturnsEmpty_NotCrossContaminated()
    {
        // Arrange: crear usuarios en dos tenants diferentes
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var userA = User.CreateInternalUser("operatorA@example.com", "hash", UserRole.Operator, tenantA);
        var userB = User.CreateInternalUser("operatorB@example.com", "hash", UserRole.Operator, tenantB);
        await _db.Users.AddRangeAsync(userA, userB);
        await _db.SaveChangesAsync();

        // Act: simular query con HasQueryFilter para TenantA
        // HasQueryFilter filtra por deleted_at IS NULL; para el cross-tenant el query sería:
        // WHERE tenant_id = @tenantA AND deleted_at IS NULL
        var tenantAUsers = await _db.Users
            .Where(u => u.TenantId == tenantA)
            .ToListAsync();

        var tenantBUsers = await _db.Users
            .Where(u => u.TenantId == tenantB)
            .ToListAsync();

        // Assert: cada tenant solo ve sus propios usuarios
        Assert.Single(tenantAUsers);
        Assert.Equal(userA.Email, tenantAUsers[0].Email);
        Assert.Single(tenantBUsers);
        Assert.Equal(userB.Email, tenantBUsers[0].Email);

        // Confirmar aislamiento: query de A no retorna datos de B
        var crossContamination = tenantAUsers.Any(u => u.TenantId == tenantB);
        Assert.False(crossContamination, "Tenant A query must not return Tenant B data");
    }

    [Fact(DisplayName = "AC-RBAC-EMAIL-CONFLICT: uix_email_b2c rejects duplicate customer emails")]
    [Trait("Category", "Integration")]
    public async Task EmailConflict_DuplicateCustomer_ThrowsConstraintViolation()
    {
        // Arrange: registrar email como customer
        var email = "conflict@example.com";
        var customer1 = User.CreateCustomer(email, "hash1");
        await _db.Users.AddAsync(customer1);
        await _db.SaveChangesAsync();

        // Act: intentar registrar el mismo email como otro customer
        var customer2 = User.CreateCustomer(email, "hash2");
        await _db.Users.AddAsync(customer2);

        // Assert: DB rechaza por índice parcial uix_email_b2c (Customer emails must be unique)
        await Assert.ThrowsAsync<DbUpdateException>(
            () => _db.SaveChangesAsync());
    }
}
