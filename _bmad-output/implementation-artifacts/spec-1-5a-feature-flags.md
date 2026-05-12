---
title: 'Story 1.5a — Feature Flags de Compañía'
type: 'feature'
created: '2026-05-08'
status: 'done'
baseline_commit: '1ded5f1a492711bebf968ea175ef81c5646ee84d'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-4-companies-plans-audit.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `CompanyFeatureFlags` no existe — no hay mecanismo para controlar qué capacidades están habilitadas por tenant/plan, ni para que otros BCs (DesignEngine) consulten si una feature está activa sin acceso directo a la DB de CompanyAdmin.

**Approach:** Crear tabla `company_feature_flags` con entidad `CompanyFeatureFlag`, `IFeatureFlagService` en SharedKernel (implementado en CompanyAdmin.Infrastructure), auto-seed de flags al crear una compañía según el plan, y endpoint `PATCH /api/v1/companies/{id}/flags/{key}` para que platform_admin pueda alternar flags individualmente.

## Boundaries & Constraints

**Always:**
- `IFeatureFlagService` en SharedKernel.Common; implementación en CompanyAdmin.Infrastructure (usando CompanyAdminDbContext).
- PK compuesta `(company_id, feature_key)` en `company_feature_flags`; sin columna `id` separada.
- `FeatureFlags` static class con constantes `AiGeneration`, `BulkExport`, `WhiteLabel` en CompanyAdmin.Domain — define el universo de claves válidas.
- `IsEnabledAsync` para feature key desconocida retorna `false` (default seguro, no excepción).
- `SetFlagAsync` para feature key fuera de `FeatureFlags.All` lanza `DomainException("UNKNOWN_FEATURE_KEY:...")` → 422.
- `CreateCompanyCommandHandler` llama `IFeatureFlagService` para seed inmediatamente después de `SaveChangesAsync` (misma transacción no requerida — si seed falla, los flags se pueden resembrar; la compañía ya existe).
- Flags por defecto según plan:
  - **Demo**: `ai_generation=true`, `bulk_export=false`, `white_label=false`
  - **SaaS**: `ai_generation=true`, `bulk_export=true`, `white_label=false`
  - **LicenciaPermanente**: `ai_generation=true`, `bulk_export=true`, `white_label=true`
- `SetFlagAsync` persiste `updated_at = UtcNow` y `updated_by = adminId`.
- `PATCH /api/v1/companies/{id}/flags/{key}` requiere rol `platform_admin`.
- CompanyAdmin no puede referenciar Users.Core ni Users.Infrastructure.

**Ask First:**
- Si deben resembrarse los flags cuando `AssignPlan` cambia el plan (e.g., upgrade Demo→SaaS activa `bulk_export` automáticamente).

**Never:**
- Implementar quota de uso de IA (contador de generaciones Demo) — difiere a Epic 3.
- Acceder a `company_feature_flags` directamente desde otros BCs; siempre via `IFeatureFlagService`.
- Exponer endpoint para que workshop_admin altere sus propios feature flags.

## I/O & Edge-Case Matrix

| Scenario | Input / Estado | Comportamiento Esperado | Error |
|----------|---------------|------------------------|-------|
| Crear compañía Demo | `CreateCompanyCommand(Plan.Demo)` | 3 flags seeded: `ai_generation=true`, `bulk_export=false`, `white_label=false` | — |
| Crear compañía SaaS | `CreateCompanyCommand(Plan.SaaS)` | `ai_generation=true`, `bulk_export=true`, `white_label=false` | — |
| Crear compañía LP | `CreateCompanyCommand(Plan.LicenciaPermanente)` | Todos los flags `=true` | — |
| IsEnabled — flag habilitado | `IsEnabledAsync(id, "ai_generation")` con flag en DB | `true` | — |
| IsEnabled — key inexistente | `IsEnabledAsync(id, "unknown")` | `false` (sin excepción) | — |
| SetFlag — toggle exitoso | `PATCH /{id}/flags/bulk_export { "enabled": true }` | 200; `enabled=true`; `updated_at` y `updated_by` actualizados | — |
| SetFlag — compañía no encontrada | `PATCH` con id inválido | 404 RFC 7807 | `COMPANY_NOT_FOUND` |
| SetFlag — key inválida | `PATCH /{id}/flags/unknown_key` | 422 RFC 7807 | `UNKNOWN_FEATURE_KEY` |

</frozen-after-approval>

## Code Map

**SharedKernel — nuevo:**
- `infrastructure/AiWearStudio.SharedKernel/Common/IFeatureFlagService.cs` — interface: `IsEnabledAsync(Guid, string, CancellationToken)`, `SetFlagAsync(Guid, string, bool, Guid, CancellationToken)`, `SeedForPlanAsync(Guid, IEnumerable<(string key, bool enabled)>, Guid, CancellationToken)`

**BC CompanyAdmin — nuevos:**
- `modules/CompanyAdmin/.../Domain/Constants/FeatureFlags.cs` — constantes `AiGeneration`, `BulkExport`, `WhiteLabel`; colección estática `All`; método `DefaultsForPlan(Plan)` → `IEnumerable<(string, bool)>`
- `modules/CompanyAdmin/.../Domain/Entities/CompanyFeatureFlag.cs` — PK compuesta; `Enable/Disable(Guid adminId)`; `UpdatedAt`, `UpdatedBy`
- `modules/CompanyAdmin/.../Infrastructure/Services/FeatureFlagService.cs` — implementa `IFeatureFlagService` via CompanyAdminDbContext

**BC CompanyAdmin — modificados:**
- `modules/CompanyAdmin/.../Infrastructure/Persistence/CompanyAdminDbContext.cs` — agregar `DbSet<CompanyFeatureFlag>`; configurar PK compuesta, tabla `company_feature_flags`, schema `company_admin`
- `modules/CompanyAdmin/.../Application/Commands/CreateCompany/CreateCompanyCommandHandler.cs` — llamar `IFeatureFlagService.SeedForPlanAsync` post-SaveChanges
- `modules/CompanyAdmin/.../Infrastructure/DependencyInjection.cs` — registrar `IFeatureFlagService → FeatureFlagService` (Scoped)

**API — modificados:**
- `AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs` — agregar `MapPatch("/{id:guid}/flags/{key}", ...)` → `SetFlagAsync` → 200; rol `platform_admin` heredado del grupo
- `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — agregar `catch (DomainException ex) when (ex.Message.StartsWith("UNKNOWN_FEATURE_KEY"))` → 422

**Tests — nuevo:**
- `tests/AiWearStudio.Users.Tests/Integration/FeatureFlagsTests.cs` — Testcontainers: AC-FLAGS-SEED-DEMO, AC-FLAGS-SEED-SAAS, AC-FLAGS-READ, AC-FLAGS-TOGGLE

**Migración:**
- `dotnet ef migrations add AddCompanyFeatureFlags` en el proyecto CompanyAdmin

## Tasks & Acceptance

**Execution:**
- [x] `infrastructure/.../Common/IFeatureFlagService.cs` — crear interface con 3 métodos async
- [x] `modules/CompanyAdmin/.../Domain/Constants/FeatureFlags.cs` — constantes + `DefaultsForPlan(Plan)`
- [x] `modules/CompanyAdmin/.../Domain/Entities/CompanyFeatureFlag.cs` — entidad con PK compuesta y métodos de estado
- [x] `modules/CompanyAdmin/.../Infrastructure/Persistence/CompanyAdminDbContext.cs` — DbSet + configuración EF
- [x] Migración EF `AddCompanyFeatureFlags` — ejecutar `dotnet ef migrations add`
- [x] `modules/CompanyAdmin/.../Infrastructure/Services/FeatureFlagService.cs` — implementar los 3 métodos
- [x] `modules/CompanyAdmin/.../Application/Commands/CreateCompany/CreateCompanyCommandHandler.cs` — seed post-SaveChanges
- [x] `modules/CompanyAdmin/.../Infrastructure/DependencyInjection.cs` — registrar servicio
- [x] `AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs` — endpoint PATCH /{id}/flags/{key}
- [x] `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — handler UNKNOWN_FEATURE_KEY → 422
- [x] `tests/.../Integration/FeatureFlagsTests.cs` — 4 tests Testcontainers

**Acceptance Criteria:**
- Dado `CreateCompanyCommand(Plan.Demo)`, cuando el handler persiste la compañía, entonces `company_feature_flags` contiene exactamente 3 filas para ese `company_id` con los valores por defecto del plan Demo.
- Dado una compañía con `ai_generation=true`, cuando `IFeatureFlagService.IsEnabledAsync(companyId, "ai_generation")` es llamado, entonces retorna `true`.
- Dado `PATCH /api/v1/companies/{id}/flags/bulk_export { "enabled": true }` con JWT platform_admin, cuando el handler procesa la request, entonces la fila en `company_feature_flags` tiene `enabled=true`, `updated_at` actualizado y `updated_by=adminId`.
- Dado `PATCH /api/v1/companies/{id}/flags/invalid_key`, cuando el handler procesa, entonces retorna 422 RFC 7807 con código `UNKNOWN_FEATURE_KEY`.

## Design Notes

**`FeatureFlags.DefaultsForPlan(Plan)`** centraliza en el dominio la lógica de qué flags corresponden a cada plan. El handler y el servicio no contienen esa lógica — llaman a este método.

**SeedForPlanAsync** usa `AddRangeAsync` + `SaveChangesAsync` en una sola llamada. Es idempotente si el caller garantiza que no existen filas previas (Company recién creada). No se hace upsert para evitar complejidad innecesaria en esta story.

## Verification

**Commands:**
- `dotnet build AiWearStudio.slnx` — expected: 0 errores, 0 warnings
- `dotnet test tests/AiWearStudio.Users.Tests --filter Category=Integration` — expected: 24 tests pasan (20 anteriores + 4 nuevos AC-FLAGS-*)
