---
title: 'Story 1.4b — Suspensión de Compañías'
type: 'feature'
created: '2026-05-08'
status: 'done'
baseline_commit: 'c20cf96a6dc676a692d9ff2b4846004b3ae664f0'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-4-companies-plans-audit.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `PlanStatus.Suspended` existe en el enum pero sin mecanismo de activación: no hay `Company.Suspend()`, ni revocación de tokens del tenant, ni middleware que bloquee requests de tenants suspendidos.

**Approach:** Agregar `Company.Suspend(adminId, reason)`, `SuspendCompanyCommand` + handler, `ITenantAccessRevocationService` en SharedKernel (implementado en Users.Infrastructure — revoca todos los RefreshTokens del tenant via `User.TenantId`), y `CompanySuspensionMiddleware` que retorna 403 a usuarios de tenants suspendidos.

## Boundaries & Constraints

**Always:**
- `SuspendCompanyCommandHandler` persiste la suspensión en CompanyAdminDbContext primero; llama a `ITenantAccessRevocationService` después. Si la revocación falla, el middleware bloqueará igual (PlanStatus ya es Suspended).
- `SuspendCompanyCommandHandler` registra en `plan_audit_log` (PreviousPlan = NewPlan = plan actual sin cambio; Reason = `"SUSPENDED: {reason}"`) para trazabilidad.
- `ITenantAccessRevocationService.RevokeAllTokensForTenantAsync(tenantId)`: carga Users por `TenantId` (IgnoreQueryFilters), carga sus RefreshTokens activos, llama `token.Revoke()` en cada uno, luego `SaveChangesAsync`.
- `CompanySuspensionMiddleware`: registrado post-`UseAuthentication`, pre-`UseAuthorization`; usa `IServiceScopeFactory` para resolver `ICompanyRepository` (Scoped) desde un middleware Singleton; solo actúa si existe claim `tenant_id` en el JWT; si compañía no encontrada → pass-through sin error.
- Requests de `platform_admin` (sin claim `tenant_id`) nunca son bloqueadas por el middleware.
- `PATCH /api/v1/companies/{id}/suspend` requiere rol `platform_admin`.
- `ITenantAccessRevocationService`: interface en SharedKernel.Common; implementación en Users.Infrastructure.
- CompanyAdmin no puede referenciar Users.Core ni Users.Infrastructure directamente.

**Ask First:**
- Si `SuspendCompanyCommand` sobre compañía ya suspendida debe ser no-op silencioso (retornar 200) o lanzar error.

**Never:**
- Implementar reactivación en esta story.
- Que CompanyAdmin referencie Users.Core o Users.Infrastructure directamente.
- Eliminar físicamente usuarios ni compañías como parte de la suspensión.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Suspender compañía activa | `PATCH /api/v1/companies/{id}/suspend` + platform_admin JWT + `{ "reason": "..." }` | 200; PlanStatus=Suspended; tokens del tenant revocados; entrada en plan_audit_log | — |
| Compañía no encontrada | PATCH con id inválido | 404 RFC 7807 | `COMPANY_NOT_FOUND` |
| Sin JWT | PATCH | 401 | JWT middleware |
| Role != platform_admin | PATCH | 403 | Authorization middleware |
| Request de usuario de tenant suspendido | Cualquier endpoint con JWT que tenga claim `tenant_id` del tenant suspendido | 403 RFC 7807 antes de llegar al handler | `CompanySuspensionMiddleware` |
| Request de platform_admin | Cualquier endpoint con JWT sin claim `tenant_id` | Pass-through, sin restricción | — |

</frozen-after-approval>

## Code Map

**SharedKernel — nuevo:**
- `infrastructure/AiWearStudio.SharedKernel/Common/ITenantAccessRevocationService.cs` — interface: `Task RevokeAllTokensForTenantAsync(Guid tenantId, CancellationToken ct)`

**BC CompanyAdmin — modificado:**
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Entities/Company.cs` — agregar `Suspend(Guid adminId, string? reason)` → PlanStatus=Suspended; sin cambio de Plan
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/SuspendCompany/SuspendCompanyCommand.cs` — record(CompanyId, AdminId, Reason?) : ICommand\<Unit\>
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/SuspendCompany/SuspendCompanyCommandHandler.cs` — FindById→null→COMPANY_NOT_FOUND; company.Suspend; PlanAuditLog.Record(prev=currentPlan, next=currentPlan, reason="SUSPENDED:..."); AddAuditLog; SaveChanges; ITenantAccessRevocationService.RevokeAllTokensForTenantAsync(company.Id)
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/SuspendCompany/SuspendCompanyCommandValidator.cs` — CompanyId/AdminId NotEmpty

**Users.Infrastructure — modificado:**
- `modules/Users/AiWearStudio.Users.Infrastructure/Services/TenantAccessRevocationService.cs` — implementa ITenantAccessRevocationService usando UsersDbContext: query Users.Where(TenantId).IgnoreQueryFilters; query RefreshTokens activos; token.Revoke() en loop; SaveChangesAsync
- `modules/Users/AiWearStudio.Users.Infrastructure/DependencyInjection.cs` — agregar `services.AddScoped<ITenantAccessRevocationService, TenantAccessRevocationService>()`

**API — nuevos y modificados:**
- `AiWearStudio.Api/Middleware/CompanySuspensionMiddleware.cs` — IServiceScopeFactory; lee claim `tenant_id`; ICompanyRepository.FindByIdAsync; si PlanStatus==Suspended → WriteProblemAsync 403 "COMPANY_SUSPENDED" y return (sin llamar next)
- `AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs` — agregar `MapPatch("/{id:guid}/suspend", ...)` → SuspendCompanyCommand → 200; RequireAuthorization Roles=platform_admin (ya heredado del grupo)
- `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — agregar `catch (DomainException ex) when (ex.Message.StartsWith("COMPANY_SUSPENDED"))` → 403
- `AiWearStudio.Api/Program.cs` — `app.UseMiddleware<CompanySuspensionMiddleware>()` entre `UseAuthentication` y `UseAuthorization`

**Tests:**
- `tests/AiWearStudio.Users.Tests/Integration/CompanySuspensionTests.cs` — Testcontainers: AC-SUSPEND-ACTIVE, AC-SUSPEND-NOT-FOUND, AC-SUSPEND-TOKENS-REVOKED, AC-SUSPEND-MIDDLEWARE-BLOCKS

## Tasks & Acceptance

**Execution:**
- [x] `infrastructure/AiWearStudio.SharedKernel/Common/ITenantAccessRevocationService.cs` — crear interface con un método async
- [x] `modules/CompanyAdmin/.../Domain/Entities/Company.cs` — agregar método `Suspend(Guid adminId, string? reason)`
- [x] `modules/CompanyAdmin/.../Application/Commands/SuspendCompany/SuspendCompanyCommand.cs` — record command
- [x] `modules/CompanyAdmin/.../Application/Commands/SuspendCompany/SuspendCompanyCommandHandler.cs` — handler con lógica de suspensión + audit + revocación
- [x] `modules/CompanyAdmin/.../Application/Commands/SuspendCompany/SuspendCompanyCommandValidator.cs` — validador FluentValidation
- [x] `modules/Users/.../Services/TenantAccessRevocationService.cs` — implementación del servicio de revocación
- [x] `modules/Users/.../DependencyInjection.cs` — registrar ITenantAccessRevocationService
- [x] `AiWearStudio.Api/Middleware/CompanySuspensionMiddleware.cs` — middleware que bloquea tenants suspendidos
- [x] `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — handler COMPANY_SUSPENDED → 403
- [x] `AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs` — endpoint PATCH /{id}/suspend
- [x] `AiWearStudio.Api/Program.cs` — registrar CompanySuspensionMiddleware en el pipeline
- [x] `tests/.../Integration/CompanySuspensionTests.cs` — 4 tests Testcontainers

**Acceptance Criteria:**
- Dado platform_admin, cuando `SuspendCompanyCommandHandler` procesa `SuspendCompanyCommand(companyId, adminId, reason)`, entonces `Company.PlanStatus = Suspended` y `plan_audit_log` contiene entrada con PreviousPlan = NewPlan = plan original y Reason que empieza con "SUSPENDED".
- Dado id inexistente, cuando handler procesa `SuspendCompanyCommand`, entonces lanza `DomainException("COMPANY_NOT_FOUND:...")`.
- Dado compañía suspendida con usuarios activos, cuando `TenantAccessRevocationService.RevokeAllTokensForTenantAsync(tenantId)` ejecuta, entonces todos los RefreshTokens del tenant tienen `RevokedAt != null`.
- Dado JWT con claim `tenant_id` de compañía con PlanStatus=Suspended, cuando `CompanySuspensionMiddleware` procesa la request, entonces la respuesta es 403 RFC 7807 con código `COMPANY_SUSPENDED` sin que el handler sea invocado.

## Design Notes

**Eventual consistency entre dos DbContexts:** CompanyAdmin y Users son schemas distintos sin transacción distribuida. La suspensión se persiste primero (CompanyAdminDbContext) para que el middleware bloquee inmediatamente. La revocación de tokens (UsersDbContext) es best-effort — si falla, el middleware sigue bloqueando porque PlanStatus ya es Suspended. La exposición máxima es el TTL del access token vigente (≤ 60 min, configurado).

**CompanySuspensionMiddleware con IServiceScopeFactory:** Los middlewares son Singleton en ASP.NET Core. `ICompanyRepository` es Scoped. El middleware crea un scope por request via `IServiceScopeFactory.CreateScope()` para resolver el repositorio correctamente.

## Verification

**Commands:**
- `dotnet build AiWearStudio.slnx` — expected: 0 errores, 0 warnings
- `dotnet test tests/AiWearStudio.Users.Tests --filter Category=Integration` — expected: 20 tests pasan (16 anteriores + 4 nuevos AC-SUSPEND-*)
