# Deferred Work

Issues found during review but explicitly out of scope for the story that surfaced them. Revisit in targeted hardening or future stories.

---

## Cache Stampede / Thundering Herd
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `GetCatalogGarmentsQueryHandler.cs`
**Detail:** Concurrent requests to a cold cache trigger multiple simultaneous DB reads. Under traffic spikes or TTL expiry waves, N requests fire N identical queries. Consider a distributed lock (Redis SETNX) or stale-while-revalidate pattern.

---

## Cache Invalidation Exception Propagates out of SaveChangesAsync
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `CatalogDbContext.cs:SaveChangesAsync`
**Detail:** If `cache.InvalidateGarmentsAsync` throws after a successful DB commit, the exception propagates to the caller, which may retry and produce a duplicate write. A `try-catch` around the invalidation loop (logging the error and continuing) would make the operation resilient. Skipped because the spec's design notes show this code without exception handling.

---

## Redis Integration Tests
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `CatalogQueryTests.cs`
**Detail:** `Testcontainers.Redis` is incompatible with `Testcontainers.PostgreSql 4.11.0` (MissingMethodException on ContainerConfiguration). Until the version conflict is resolved, `RedisCatalogCache` (JSON corruption path, TTL behavior, concurrent invalidation) is untested at the integration level. Track Testcontainers.Redis release compatible with 4.11.x.

---

## Cache Invalidation for Global Entity Changes
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `CatalogDbContext.cs:SaveChangesAsync`
**Detail:** Only `TenantGarmentStatus` changes trigger cache invalidation. Admin mutations to `Garment`, `GarmentColorVariant`, `PrintZone`, etc. leave the cache stale until TTL expires. Story 2.3 (admin endpoints) should extend the SaveChangesAsync override to detect changes to global catalog entities and broadcast invalidation to all active tenant keys.

---

## CancellationToken Passthrough in Redis Operations
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `RedisCatalogCache.cs`
**Detail:** `ICatalogCache` methods accept `CancellationToken` but `IDatabase` (StackExchange.Redis 2.x) does not expose CT overloads on `StringGetAsync`, `StringSetAsync`, `KeyDeleteAsync`. Operations cannot be cancelled mid-flight. When StackExchange.Redis adds CT support or if upgrading to a future version, wire the tokens through.

---

## Tenant Claim Silent Failure Observability
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `CatalogEndpoints.cs:TryGetTenantId`
**Detail:** When `tenant_id` JWT claim is absent or non-GUID, the endpoint returns 401 but logs nothing. Add a structured log entry (`catalog.auth.invalid_tenant_claim path={Path}`) to aid debugging of auth integration issues.
