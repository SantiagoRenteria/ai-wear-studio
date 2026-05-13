using AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System.Text.Json;

namespace AiWearStudio.Catalog.Infrastructure.Caching;

public class RedisCatalogCache(
    IConnectionMultiplexer redis,
    IConfiguration config,
    ILogger<RedisCatalogCache> logger) : ICatalogCache
{
    private static string GarmentKey(Guid tenantId) => $"catalog:garments:{tenantId}";

    private TimeSpan Ttl =>
        int.TryParse(config["Catalog:CacheTtlSeconds"], out var ttl)
            ? TimeSpan.FromSeconds(ttl)
            : TimeSpan.FromSeconds(300);

    public async Task<List<GarmentDto>?> GetGarmentsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var value = await db.StringGetAsync(GarmentKey(tenantId));
        if (value.IsNullOrEmpty)
            return null;
        try
        {
            return JsonSerializer.Deserialize<List<GarmentDto>>((string)value!);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public async Task SetGarmentsAsync(Guid tenantId, List<GarmentDto> garments, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var json = JsonSerializer.Serialize(garments);
        await db.StringSetAsync(GarmentKey(tenantId), json, Ttl);
    }

    public async Task InvalidateGarmentsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var deleted = await db.KeyDeleteAsync(GarmentKey(tenantId));
        if (deleted)
            logger.LogInformation("catalog.cache.invalidated tenant_id={TenantId}", tenantId);
    }
}
