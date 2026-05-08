---
title: 'Story 2.1 — Backend del Catálogo con Seeds del Prototipo'
type: 'feature'
created: '2026-05-08'
status: 'done'
baseline_commit: '86ba50f03394bf15d5263997d64c113a56ceb111'
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El BC `Catalog` existe como stub vacío (csproj sin código). Los clientes no pueden explorar prendas porque no existen entidades de dominio, migraciones, seeds del prototipo, endpoints de consulta, ni caché Redis.

**Approach:** Construir el dominio Catalog (6 entidades), migración EF Core con seeds HasData (10 prendas, 23 zonas, 5 técnicas), dos queries MediatR (GetCatalogGarments, GetGarmentZones), caché Redis con TTL configurable e invalidación automática via SaveChanges override, y dos endpoints GET con roles `customer` + `workshop_admin`.

## Boundaries & Constraints

**Always:**
- `tenant_id` viene del claim JWT — nunca del body de la request.
- Filtrado de prendas activas: LEFT JOIN lógico con `TenantGarmentStatus`; si no existe registro para ese tenant+garment, la prenda se considera activa (`COALESCE(is_active, true)`).
- Caché key: `catalog:garments:{tenantId}`. TTL desde `IConfiguration["Catalog:CacheTtlSeconds"]` (default 300s si falta la key).
- Seeds via `modelBuilder.HasData()` con GUIDs deterministas (constantes en el seeder).
- Hard-delete para todas las entidades del Catalog (sin `deleted_at`).
- Cache invalidation ocurre DESPUÉS de `base.SaveChangesAsync()` — nunca antes.
- Log estructurado obligatorio: `catalog.cache.hit` / `catalog.cache.miss` con `tenant_id` en cada acceso al handler.
- `GET /catalog/garments/{garmentId}/views/{viewId}/zones`: lanzar `DomainException("GARMENT_VIEW_NOT_FOUND: ...")` si la combinación garment+view no existe → GlobalExceptionMiddleware ya mapea `DomainException` a 404.

**Ask First:** Nada. Todos los edge-cases están definidos.

**Never:**
- Implementar PATCH de activación/desactivación admin (Story 2.3).
- Agregar `tenant_id` directamente a `Garment`, `PrintZone`, `PrintTechnique` (son entidades globales).
- Hacer JOINs cross-schema con tablas de Users o CompanyAdmin.
- Implementar `HasQueryFilter` global en entidades globales del catálogo.
- Usar `IMemoryCache` — solo Redis (`IConnectionMultiplexer`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| GET garments: tenant sin overrides | TenantId válido, 0 registros en TenantGarmentStatus | 200 con 10 prendas + colores | N/A |
| GET garments: tenant con 2 desactivadas | TenantGarmentStatus con is_active=false para 2 prendas | 200 con 8 prendas | N/A |
| GET garments: segunda consulta | Primera llamada ya populó Redis | 200 desde Redis; log catalog.cache.hit | N/A |
| Cache invalidation | SaveChanges con TenantGarmentStatus modificado | Key de Redis eliminada para ese tenant | N/A |
| GET zones: combinación válida | garmentId + viewId existentes | 200 con zonas, dimensiones y técnica recomendada | N/A |
| GET zones: view no existe para garment | viewId no pertenece al garmentId | 404 GARMENT_VIEW_NOT_FOUND | GlobalExceptionMiddleware |

</frozen-after-approval>

## Code Map

- `modules/Catalog/AiWearStudio.Catalog/AiWearStudio.Catalog.csproj` — agregar paquetes (EF Core Npgsql, StackExchange.Redis, MediatR, FluentValidation, Serilog)
- `modules/Catalog/AiWearStudio.Catalog/AssemblyMarker.cs` — crear (registra el assembly en Program.cs)
- `modules/Catalog/AiWearStudio.Catalog/Domain/Entities/` — 6 entidades: Garment, GarmentColorVariant, GarmentView, PrintZone, PrintTechnique, TenantGarmentStatus
- `modules/Catalog/AiWearStudio.Catalog/Domain/Repositories/IGarmentRepository.cs` — interfaces de acceso a datos
- `modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetCatalogGarments/` — Query + Handler + DTO (GarmentDto, ColorVariantDto)
- `modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetGarmentZones/` — Query + Handler + DTO (PrintZoneDto)
- `modules/Catalog/AiWearStudio.Catalog/Infrastructure/Caching/ICatalogCache.cs` — interfaz cache catalog
- `modules/Catalog/AiWearStudio.Catalog/Infrastructure/Caching/RedisCatalogCache.cs` — implementación Redis
- `modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/CatalogDbContext.cs` — DbContext con HasData seeds + SaveChangesAsync override para invalidación
- `modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/Repositories/GarmentRepository.cs` — implementa IGarmentRepository
- `modules/Catalog/AiWearStudio.Catalog/Infrastructure/DependencyInjection.cs` — AddCatalogModule()
- `AiWearStudio.Api/Endpoints/CatalogEndpoints.cs` — GET /api/v1/catalog/garments + GET /api/v1/catalog/garments/{id}/views/{viewId}/zones
- `AiWearStudio.Api/Program.cs` — agregar AssemblyMarker al MediatR, AddCatalogModule, MapCatalogEndpoints
- `AiWearStudio.Api/appsettings.json` — agregar ConnectionStrings:Catalog, Redis:ConnectionString, Catalog:CacheTtlSeconds
- `tests/AiWearStudio.Catalog.Tests/AiWearStudio.Catalog.Tests.csproj` — agregar Testcontainers + refs
- `tests/AiWearStudio.Catalog.Tests/Integration/CatalogQueryTests.cs` — 4 tests de integración

## Tasks & Acceptance

**Execution:**
- [x] `modules/Catalog/AiWearStudio.Catalog/AiWearStudio.Catalog.csproj` — agregar `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.EntityFrameworkCore.Design`, `StackExchange.Redis`, `MediatR`, `FluentValidation.DependencyInjectionExtensions`, `Microsoft.Extensions.DependencyInjection.Abstractions`, `Microsoft.Extensions.Configuration.Abstractions`, `Serilog` (mismas versiones que CompanyAdmin)
- [x] `modules/Catalog/AiWearStudio.Catalog/AssemblyMarker.cs` — `public sealed class AssemblyMarker {}`
- [x] `modules/Catalog/AiWearStudio.Catalog/Domain/Entities/` — crear las 6 entidades: `Garment(Id, Name, Category, DisplayOrder)`, `GarmentColorVariant(Id, GarmentId, ColorName, HexCode, DisplayOrder)`, `GarmentView(Id, GarmentId, ViewName, DisplayOrder)`, `PrintTechnique(Id, Name, Description)`, `PrintZone(Id, GarmentViewId, Name, XCm, YCm, WidthCm, HeightCm, RecommendedTechniqueId)`, `TenantGarmentStatus(Id, TenantId, GarmentId, IsActive)` — todos con constructores privados + factory estáticas
- [x] `modules/Catalog/AiWearStudio.Catalog/Domain/Repositories/IGarmentRepository.cs` — `GetActiveGarmentsAsync(Guid tenantId, CancellationToken ct)` + `GetViewZonesAsync(Guid garmentId, Guid viewId, CancellationToken ct)`
- [x] `modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetCatalogGarments/GetCatalogGarmentsQuery.cs` — `record GetCatalogGarmentsQuery(Guid TenantId) : IQuery<List<GarmentDto>>`
- [x] `modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetCatalogGarments/GetCatalogGarmentsQueryHandler.cs` — check cache → miss: query repo → set cache → return; hit: return from cache; log catalog.cache.hit/miss
- [x] `modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetCatalogGarments/GarmentDto.cs` — `record GarmentDto(Guid Id, string Name, string Category, IReadOnlyList<ColorVariantDto> Colors)` + `record ColorVariantDto(Guid Id, string ColorName, string HexCode)`
- [x] `modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetGarmentZones/GetGarmentZonesQuery.cs` — `record GetGarmentZonesQuery(Guid GarmentId, Guid ViewId, Guid TenantId) : IQuery<List<PrintZoneDto>>`
- [x] `modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetGarmentZones/GetGarmentZonesQueryHandler.cs` — llama repo.GetViewZonesAsync → si null/empty → throw DomainException GARMENT_VIEW_NOT_FOUND → retorna List<PrintZoneDto>
- [x] `modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetGarmentZones/PrintZoneDto.cs` — `record PrintZoneDto(Guid Id, string Name, decimal XCm, decimal YCm, decimal WidthCm, decimal HeightCm, string? RecommendedTechnique)`
- [x] `modules/Catalog/AiWearStudio.Catalog/Infrastructure/Caching/ICatalogCache.cs` — `GetGarmentsAsync`, `SetGarmentsAsync`, `InvalidateGarmentsAsync`
- [x] `modules/Catalog/AiWearStudio.Catalog/Infrastructure/Caching/RedisCatalogCache.cs` — implementa ICatalogCache con IConnectionMultiplexer; log estructurado en GetGarmentsAsync
- [x] `modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/CatalogDbContext.cs` — DbSets, OnModelCreating con HasData (10 garments/23 zones/5 techniques) + Fluent API config; override SaveChangesAsync detecta TenantGarmentStatus changes → post-save invalida cache
- [x] `modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/Repositories/GarmentRepository.cs` — `GetActiveGarmentsAsync`: query garments WHERE NOT EXISTS (TenantGarmentStatus con is_active=false para ese tenant) + Include colorVariants; `GetViewZonesAsync`: query zones + include technique donde GarmentView.GarmentId==garmentId && GarmentView.Id==viewId
- [x] `modules/Catalog/AiWearStudio.Catalog/Infrastructure/DependencyInjection.cs` — `AddCatalogModule(config)`: AddDbContext<CatalogDbContext>, AddSingleton IConnectionMultiplexer, AddScoped ICatalogCache → RedisCatalogCache, AddScoped IGarmentRepository → GarmentRepository
- [x] `AiWearStudio.Api/Endpoints/CatalogEndpoints.cs` — grupo `/api/v1/catalog` con roles `customer,workshop_admin`; GET `/garments` → send GetCatalogGarmentsQuery; GET `/garments/{garmentId:guid}/views/{viewId:guid}/zones` → send GetGarmentZonesQuery; extraer tenantId del JWT claim `tenant_id`
- [x] `AiWearStudio.Api/Program.cs` — agregar `typeof(AiWearStudio.Catalog.AssemblyMarker).Assembly` al RegisterServicesFromAssemblies de MediatR; `builder.Services.AddCatalogModule(builder.Configuration)`; `app.MapCatalogEndpoints()`
- [x] `AiWearStudio.Api/appsettings.json` — agregar `"Catalog": ""` en ConnectionStrings, `"Redis": { "ConnectionString": "" }`, `"Catalog": { "CacheTtlSeconds": 300 }`
- [x] `tests/AiWearStudio.Catalog.Tests/AiWearStudio.Catalog.Tests.csproj` — agregar `Testcontainers.PostgreSql 4.11.0`, `Microsoft.EntityFrameworkCore` + ref al proyecto Catalog
- [x] `tests/AiWearStudio.Catalog.Tests/Integration/CatalogQueryTests.cs` — 5 tests: seeds-count, garments-all-active, garments-filtered, zones-query, zones-not-found

**Acceptance Criteria:**
- **AC-CAT-SEEDS:** Dados los seeds ejecutados via `MigrateAsync`, cuando se cuentan Garments/PrintZones/PrintTechniques en DB, entonces los totales son exactamente 10 / 23 / 5.
- **AC-CAT-GARMENTS:** Dado un tenantId sin registros en TenantGarmentStatus, cuando `GetCatalogGarmentsQueryHandler` ejecuta, entonces retorna 10 GarmentDtos cada uno con al menos 1 ColorVariantDto.
- **AC-CAT-GARMENTS-FILTERED:** Dado que TenantGarmentStatus tiene `is_active=false` para 2 garments de ese tenant, cuando el handler ejecuta, entonces retorna 8 GarmentDtos.
- **AC-CAT-ZONES:** Dado un garmentId y viewId válidos, cuando `GetGarmentZonesQueryHandler` ejecuta, entonces retorna al menos 1 PrintZoneDto con dimensiones > 0 y RecommendedTechnique no nulo.

## Design Notes

**Filtrado activo con COALESCE lógico en LINQ:**
```csharp
// Retorna garments donde NO existe un status explícito de is_active=false para el tenant
var garments = await _db.Garments
    .Where(g => !_db.TenantGarmentStatuses
        .Any(s => s.TenantId == tenantId && s.GarmentId == g.Id && !s.IsActive))
    .Include(g => g.ColorVariants.OrderBy(c => c.DisplayOrder))
    .OrderBy(g => g.DisplayOrder)
    .Select(g => new GarmentDto(...))
    .ToListAsync(ct);
```

**Cache invalidation post-SaveChanges:**
```csharp
public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    var affectedTenants = ChangeTracker.Entries<TenantGarmentStatus>()
        .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
        .Select(e => e.Entity.TenantId).Distinct().ToList();
    var result = await base.SaveChangesAsync(ct);
    foreach (var tid in affectedTenants)
        await _cache.InvalidateGarmentsAsync(tid, ct);
    return result;
}
```

**Seeds con GUIDs deterministas (constantes estáticas):**
```csharp
// En CatalogDbContext o clase CatalogSeedData estática
internal static readonly Guid TShirtId = new("11111111-0001-0001-0001-000000000001");
// ... 10 garments, 5 techniques, views, 23 zones
```

## Verification

**Commands:**
- `dotnet build --no-restore -c Debug src/backend` -- expected: 0 errors, 0 warnings
- `dotnet test src/backend/tests/AiWearStudio.Catalog.Tests --filter "FullyQualifiedName~CatalogQueryTests" --no-build` -- expected: 4 passed

## Suggested Review Order

**API Boundary**

- Dos rutas Minimal API con roles `customer|workshop_admin`; tenant extraído del JWT claim
  [`CatalogEndpoints.cs:11`](../../src/backend/AiWearStudio.Api/Endpoints/CatalogEndpoints.cs#L11)

- Extracción del claim `tenant_id` — falla fast con 401 si ausente o no parseable como GUID
  [`CatalogEndpoints.cs:52`](../../src/backend/AiWearStudio.Api/Endpoints/CatalogEndpoints.cs#L52)

**Active-Filter Logic (decisión de diseño clave)**

- NOT EXISTS subquery sobre TenantGarmentStatus; sin registro = prenda activa (COALESCE lógico)
  [`GarmentRepository.cs:10`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/Repositories/GarmentRepository.cs#L10)

- Navigation property en WHERE genera SQL JOIN; sin Include adicional necesario
  [`GarmentRepository.cs:28`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/Repositories/GarmentRepository.cs#L28)

**Cache Layer**

- Key por tenant `catalog:garments:{tenantId}`; JSON corrupto retorna null (cache miss fallback)
  [`RedisCatalogCache.cs:14`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/Caching/RedisCatalogCache.cs#L14)

- TTL leído de config con fallback a 300s; evaluado en cada operación de escritura
  [`RedisCatalogCache.cs:16`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/Caching/RedisCatalogCache.cs#L16)

**Cache Invalidation Post-Save**

- Override detecta cambios en TenantGarmentStatus antes del save; invalida después — nunca antes
  [`CatalogDbContext.cs:17`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/CatalogDbContext.cs#L17)

**Application Handlers**

- Log estructurado `catalog.cache.hit/miss` con `tenant_id` en cada acceso
  [`GetCatalogGarmentsQueryHandler.cs:15`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetCatalogGarments/GetCatalogGarmentsQueryHandler.cs#L15)

- DomainException `GARMENT_VIEW_NOT_FOUND` para combinación garment+view inválida
  [`GetGarmentZonesQueryHandler.cs:14`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetGarmentZones/GetGarmentZonesQueryHandler.cs#L14)

**Error Handling (patch aplicado en review)**

- Handler específico mapea `GARMENT_VIEW_NOT_FOUND` a 404; sin él caía en el catch genérico de 422
  [`GlobalExceptionMiddleware.cs:52`](../../src/backend/AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs#L52)

**Seeds (datos deterministas)**

- HasData con GUIDs deterministas: 10 prendas / 5 técnicas / 22 vistas / 23 zonas
  [`CatalogDbContext.cs:45`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/CatalogDbContext.cs#L45)

- Constantes GUID en clase pública para uso en tests (CatalogSeedData.GarmTshirt, etc.)
  [`CatalogSeedData.cs:8`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/CatalogSeedData.cs#L8)

**Wiring y Configuración**

- Fail-fast en startup si Redis o Catalog DB connection string está vacío
  [`DependencyInjection.cs:14`](../../src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/DependencyInjection.cs#L14)

- Registro de assembly, módulo y endpoints en Program.cs
  [`Program.cs:28`](../../src/backend/AiWearStudio.Api/Program.cs#L28)

**Tests y Periféricos**

- Test AC-CAT-SEEDS: verifica exactamente 10/23/5 en DB después de MigrateAsync
  [`CatalogQueryTests.cs:47`](../../src/backend/tests/AiWearStudio.Catalog.Tests/Integration/CatalogQueryTests.cs#L47)

- Test AC-CAT-GARMENTS-FILTERED: inserta 2 TenantGarmentStatus con is_active=false, espera 8
  [`CatalogQueryTests.cs:73`](../../src/backend/tests/AiWearStudio.Catalog.Tests/Integration/CatalogQueryTests.cs#L73)

- Placeholders de config (valores reales via env vars en producción)
  [`appsettings.json:17`](../../src/backend/AiWearStudio.Api/appsettings.json#L17)
