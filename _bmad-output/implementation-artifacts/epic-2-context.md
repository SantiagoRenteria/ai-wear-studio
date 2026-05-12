# Epic 2 Context: Catálogo de Prendas y Configuración del Taller

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permitir a un cliente externo explorar el catálogo completo de prendas del taller (colores, vistas, zonas de impresión, técnicas recomendadas) y realizar su selección antes de diseñar. El workshop_admin puede activar/desactivar prendas y colores según su inventario real. Este epic instala el BC `Catalog` con datos migrados del prototipo, expone las APIs de consulta con caché Redis, y entrega la experiencia de selección de prenda en el frontend.

## Stories

- Story 2.1: Backend del Catálogo con Seeds del Prototipo
- Story 2.2: Exploración y Selección de Prenda en el Frontend
- Story 2.3: Gestión del Catálogo por Workshop Admin

## Requirements & Constraints

- El catálogo base (garments, color variants, views, zones, techniques) es global — no tiene `tenant_id` directo. La activación per-tenant se gestiona via tabla `TenantGarmentStatus` (separada).
- `GET /api/v1/catalog/garments` retorna solo prendas activas para el tenant: LEFT JOIN con `TenantGarmentStatus` donde `COALESCE(is_active, true) = true` (default activo si no hay registro).
- Redis caché con clave `catalog:garments:{tenantId}` y TTL configurable vía `Catalog:CacheTtlSeconds` en `IConfiguration`. Cuando no hay registro en Redis, se consulta PostgreSQL y se popula el caché.
- Invalidación inmediata del caché cuando cambia `TenantGarmentStatus` para un tenant.
- Seeds del prototipo: exactamente 10 tipos de prenda, 23 zonas de impresión, 5 técnicas de impresión.
- Hard-delete para entidades del catálogo (decisión D1 — sin `deleted_at`).
- No JOINs cross-schema en EF Core. El Catalog BC no puede consultar tablas de Users ni CompanyAdmin.
- El claim `tenant_id` del JWT identifica al tenant del caller — nunca se acepta en el body.
- Roles autorizados para GET catalog: `customer` y `workshop_admin`.
- Roles autorizados para PATCH admin catalog: `workshop_admin` (Story 2.3).

## Technical Decisions

**BC Catalog — 1 proyecto** (`AiWearStudio.Catalog`): Domain + Application + Infrastructure como carpetas internas. Sin `.Core` / `.Infrastructure` separados hasta que lo justifique la complejidad.

**Redis (D2):** `StackExchange.Redis` via `IConnectionMultiplexer`. Registrado en DI como Singleton desde `ConnectionMultiplexer.Connect(config["Redis:ConnectionString"])`.

**Estructura del dominio:**
- `Garment` (global): id, name, category, display_order
- `GarmentColorVariant` (global): id, garment_id, color_name, hex_code, display_order
- `GarmentView` (global): id, garment_id, view_name, display_order
- `PrintZone` (global): id, garment_view_id, name, x_cm, y_cm, width_cm, height_cm, recommended_technique_id
- `PrintTechnique` (global): id, name, description
- `TenantGarmentStatus` (per-tenant): id, tenant_id, garment_id, is_active

**MediatR queries:** `GetCatalogGarmentsQuery(TenantId)` → `List<GarmentDto>` · `GetGarmentZonesQuery(GarmentId, ViewId, TenantId)` → `List<PrintZoneDto>`

**Cache invalidation:** Override `SaveChangesAsync` en `CatalogDbContext` — detecta cambios en `TenantGarmentStatus` y llama `ICatalogCache.InvalidateGarmentsAsync(tenantId)` post-save.

**Seeds:** `modelBuilder.HasData()` en `OnModelCreating` de `CatalogDbContext`. Datos fijos con GUIDs deterministas para permitir re-ejecución idempotente.

**`AssemblyMarker`** en `AiWearStudio.Catalog` — registrado en `Program.cs` para MediatR + FluentValidation.

## UX & Interaction Patterns

- El cliente ve prendas activas del taller como cards con imagen (image_url en GarmentView) y selector de color.
- Al seleccionar prenda+color+vista, el sistema carga las zonas de impresión delimitadas visualmente con la técnica recomendada.
- TanStack Query v5 maneja el estado del servidor en el frontend (cache, loading, error states).

## Cross-Story Dependencies

- Story 2.1 (Backend) es prerequisito para 2.2 (Frontend) y 2.3 (Admin). La API debe estar lista antes de que el frontend la consuma.
- Story 2.3 (Admin PATCH) reutiliza los mismos endpoints del Catalog BC; la invalidación de caché ya está en `CatalogDbContext.SaveChangesAsync` — no requiere cambios en la capa de caché.
- El `DesignSnapshot` (Epic 3) requiere `version_catalog` del catálogo al confirmar pedido — debe leer `Garment.Id` + `PrintZone.Id` como referencias inmutables.
