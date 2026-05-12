using AiWearStudio.DesignEngine.Core.Application.Commands.UpsertDesignDraft;
using AiWearStudio.DesignEngine.Core.Application.Queries.GetDesignDraft;
using AiWearStudio.DesignEngine.Infrastructure.Persistence;
using AiWearStudio.DesignEngine.Infrastructure.Persistence.Repositories;
using AiWearStudio.SharedKernel.Domain;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Xunit;

namespace AiWearStudio.DesignEngine.Tests;

public class DesignDraftIntegrationTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private DesignEngineDbContext _db = default!;
    private DesignDraftRepository _repo = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var opts = new DbContextOptionsBuilder<DesignEngineDbContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;
        _db = new DesignEngineDbContext(opts);
        await _db.Database.MigrateAsync();
        _repo = new DesignDraftRepository(_db);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact(DisplayName = "T8.3a: GET retorna null cuando draft no existe")]
    [Trait("Category", "Integration")]
    public async Task GetDesignDraft_NotFound_ReturnsNull()
    {
        var handler = new GetDesignDraftQueryHandler(_repo);
        var result = await handler.Handle(
            new GetDesignDraftQuery(Guid.NewGuid(), Guid.NewGuid()),
            CancellationToken.None);

        Assert.Null(result);
    }

    [Fact(DisplayName = "T8.3b: GET retorna null cuando draft pertenece a otro tenant")]
    [Trait("Category", "Integration")]
    public async Task GetDesignDraft_WrongTenant_ReturnsNull()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var designId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var upsertHandler = new UpsertDesignDraftCommandHandler(_repo);
        await upsertHandler.Handle(
            new UpsertDesignDraftCommand(designId, tenantA, userId, "{}", "*"),
            CancellationToken.None);
        _db.ChangeTracker.Clear();

        var getHandler = new GetDesignDraftQueryHandler(_repo);
        var result = await getHandler.Handle(
            new GetDesignDraftQuery(designId, tenantB),
            CancellationToken.None);

        Assert.Null(result);
    }

    [Fact(DisplayName = "T8.4a: PATCH con If-Match:* crea el draft y retorna ETag")]
    [Trait("Category", "Integration")]
    public async Task UpsertDesignDraft_CreateWithWildcard_ReturnsETag()
    {
        var tenantId = Guid.NewGuid();
        var designId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var handler = new UpsertDesignDraftCommandHandler(_repo);

        var etag = await handler.Handle(
            new UpsertDesignDraftCommand(designId, tenantId, userId, "{\"test\":1}", "*"),
            CancellationToken.None);

        Assert.NotEmpty(etag);
        Assert.Equal(32, etag.Length);

        _db.ChangeTracker.Clear();
        var getHandler = new GetDesignDraftQueryHandler(_repo);
        var result = await getHandler.Handle(new GetDesignDraftQuery(designId, tenantId), CancellationToken.None);
        Assert.NotNull(result);
        Assert.Equal(etag, result.ETag);
    }

    [Fact(DisplayName = "T8.4b: PATCH con ETag válido actualiza el draft")]
    [Trait("Category", "Integration")]
    public async Task UpsertDesignDraft_UpdateWithValidETag_Succeeds()
    {
        var tenantId = Guid.NewGuid();
        var designId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var handler = new UpsertDesignDraftCommandHandler(_repo);

        var etag1 = await handler.Handle(
            new UpsertDesignDraftCommand(designId, tenantId, userId, "{\"v\":1}", "*"),
            CancellationToken.None);
        _db.ChangeTracker.Clear();

        var etag2 = await handler.Handle(
            new UpsertDesignDraftCommand(designId, tenantId, userId, "{\"v\":2}", etag1),
            CancellationToken.None);

        Assert.NotEqual(etag1, etag2);
        _db.ChangeTracker.Clear();

        var getHandler = new GetDesignDraftQueryHandler(_repo);
        var result = await getHandler.Handle(new GetDesignDraftQuery(designId, tenantId), CancellationToken.None);
        Assert.Equal("{\"v\":2}", result!.SnapshotJson);
    }

    [Fact(DisplayName = "T8.4c: PATCH con ETag obsoleto lanza ETAG_MISMATCH")]
    [Trait("Category", "Integration")]
    public async Task UpsertDesignDraft_ObsoleteETag_ThrowsETagMismatch()
    {
        var tenantId = Guid.NewGuid();
        var designId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var handler = new UpsertDesignDraftCommandHandler(_repo);

        await handler.Handle(
            new UpsertDesignDraftCommand(designId, tenantId, userId, "{}", "*"),
            CancellationToken.None);
        _db.ChangeTracker.Clear();

        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            handler.Handle(
                new UpsertDesignDraftCommand(designId, tenantId, userId, "{}", "etag-obsoleto"),
                CancellationToken.None));

        Assert.StartsWith("ETAG_MISMATCH", ex.Message);
    }
}
