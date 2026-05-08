---
title: 'Story 1.4 — Gestión de Compañías, Planes y Audit Trail'
type: 'feature'
created: '2026-05-08'
status: 'done'
baseline_commit: '86ba50f03394bf15d5263997d64c113a56ceb111'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-3-revocacion-y-suspension.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No existe el BC CompanyAdmin ni la entidad `Company`. Platform_admin no puede crear talleres, asignar planes ni consultar compañías. Sin audit trail de cambios de plan ni seed de la cuenta platform_admin inicial.

**Approach:** Crear BC CompanyAdmin (un proyecto, carpetas internas Domain/Application/Infrastructure) con entidad `Company`, tabla `plan_audit_log`, commands `CreateCompany`/`AssignPlan`, endpoints GET/POST/PATCH, seed idempotente de platform_admin y factory `User.CreatePlatformAdmin`. Suspensión diferida a Story 1.4b (D-23).

## Boundaries & Constraints

**Always:**
- Solo `platform_admin` puede acceder a todos los endpoints `/api/v1/companies`.
- `Company.Id` (UUID) es el `tenant_id` global del sistema — usado como FK en todos los BCs.
- `slug` único globalmente; duplicado → `DomainException("DUPLICATE_SLUG:...")` → 409.
- `AssignPlan` registra siempre en `plan_audit_log`: plan anterior, plan nuevo, admin_id, reason, timestamp.
- `HasQueryFilter` en CompanyAdminDbContext: solo `deleted_at IS NULL`. Platform_admin ve todas las companies activas.
- Seed platform_admin: idempotente; lee `ADMIN_EMAIL` + `ADMIN_PASSWORD` de env vars; no-op si ya existe.
- `BC.CompanyAdmin → SharedKernel` únicamente en Domain/Application; nunca BC.Core → BC.Core.
- MediatR y FluentValidation deben escanear assembly CompanyAdmin via `AssemblyMarker`.

**Ask First:**
- Si `slug` debe validarse con regex (solo lowercase, letras, números, guiones).
- Si `AssignPlan` debe bloquear si el plan nuevo es igual al actual.

**Never:**
- Que CompanyAdmin referencie Users.Core o Users.Infrastructure directamente.
- Seed con valores hardcodeados (siempre env vars).
- Implementar suspensión en esta story (diferida a D-23).

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Crear compañía | `POST /api/v1/companies` + platform_admin JWT | 201 + Company (Id=tenant_id, PlanStatus=Active) | — |
| Slug duplicado | `POST` con slug ya existente | 409 RFC 7807 | `DUPLICATE_SLUG` |
| Listar companies | `GET /api/v1/companies` + platform_admin JWT | 200 array | — |
| Obtener company | `GET /api/v1/companies/{id:guid}` + platform_admin JWT | 200 company | `COMPANY_NOT_FOUND` 404 |
| Asignar plan | `PATCH /api/v1/companies/{id:guid}/plan` | 200; entrada en plan_audit_log | `COMPANY_NOT_FOUND` 404 |
| Company no encontrada | cualquier operación con Id inválido | 404 RFC 7807 | `COMPANY_NOT_FOUND` |
| Sin JWT | cualquier endpoint /companies | 401 | JWT middleware |
| Role != platform_admin | cualquier endpoint /companies | 403 | Authorization middleware |
| Seed idempotente | startup con ADMIN_EMAIL ya registrado | no-op, sin error | — |

</frozen-after-approval>

## Code Map

**BC CompanyAdmin — proyecto existente, se puebla:**
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/AiWearStudio.CompanyAdmin.csproj` — agregar refs: EF Core 9.0.1, Npgsql.EF 9.x, MediatR, FluentValidation.DependencyInjectionExtensions, Extensions.DependencyInjection.Abstractions
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/AssemblyMarker.cs` — marcador para escaneo MediatR/validators
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Enums/Plan.cs` — Demo, SaaS, LicenciaPermanente
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Enums/PlanStatus.cs` — Active, Suspended, Expired, Trial
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Entities/Company.cs` — Id, Name, Slug, Plan, PlanStatus, TrialEndsAt (DateTime?), ActivatedBy (Guid?), ActivatedAt (DateTime?), CreatedAt, Settings (string?→jsonb), DeletedAt (DateTime?); factory `Create(name, slug, plan, adminId)`; método `AssignPlan(plan)` → actualiza Plan + PlanStatus=Active + ActivatedBy + ActivatedAt
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Entities/PlanAuditLog.cs` — Id, CompanyId, AdminId (Guid), PreviousPlan, NewPlan, Reason (string?), ChangedAt; factory `Record(...)`; sin soft-delete
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Repositories/ICompanyRepository.cs` — FindByIdAsync, FindBySlugAsync, ListAsync, AddAsync, SaveChangesAsync
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/CreateCompany/CreateCompanyCommand.cs` — record(Name, Slug, Plan, AdminId) : ICommand\<Guid\>
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/CreateCompany/CreateCompanyCommandHandler.cs` — FindBySlug→null OK; Company.Create→Add→SaveChanges→return Id; si slug existe → DUPLICATE_SLUG
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/CreateCompany/CreateCompanyCommandValidator.cs` — Name/Slug NotEmpty; Plan válido (NotEqual(0))
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/AssignPlan/AssignPlanCommand.cs` — record(CompanyId, NewPlan, AdminId, Reason) : ICommand\<Unit\>
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/AssignPlan/AssignPlanCommandHandler.cs` — FindById→null→COMPANY_NOT_FOUND; PlanAuditLog.Record(prev, new); company.AssignPlan(newPlan); AddLog; SaveChanges
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/AssignPlan/AssignPlanCommandValidator.cs` — CompanyId/AdminId NotEmpty; NewPlan válido
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Infrastructure/Persistence/CompanyAdminDbContext.cs` — schema "company_admin"; snake_case; HasQueryFilter Company (deleted_at IS NULL); UniqueIndex slug; DbSet\<Company\>, DbSet\<PlanAuditLog\>
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Infrastructure/Persistence/Repositories/CompanyRepository.cs` — implementa ICompanyRepository; ListAsync retorna todas (no paginación aún)
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Infrastructure/DependencyInjection.cs` — `AddCompanyAdminModule(services, config)`: DbContext (connection string "CompanyAdmin") + ICompanyRepository Scoped

**Users.Core — modificado:**
- `modules/Users/AiWearStudio.Users.Core/Domain/Entities/User.cs` — agregar factory `CreatePlatformAdmin(email, hash)` → Role=PlatformAdmin, TenantId=null

**API — nuevos y modificados:**
- `AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs` — MapCompaniesEndpoints; POST /companies → CreateCompanyCommand → 201; GET /companies → ICompanyRepository.ListAsync → 200; GET /companies/{id:guid} → FindByIdAsync → 200/404; PATCH /companies/{id:guid}/plan → AssignPlanCommand → 200; todo RequireAuthorization(Roles="platform_admin")
- `AiWearStudio.Api/Startup/DatabaseSeeder.cs` — `SeedPlatformAdminAsync(IServiceProvider)`: lee ADMIN_EMAIL + ADMIN_PASSWORD; IPasswordHasherService.HashPassword; `User.CreatePlatformAdmin`; si no existe → Add + SaveChanges
- `AiWearStudio.Api/Program.cs` — `AddCompanyAdminModule`; extender `RegisterServicesFromAssemblies` con `typeof(CompanyAdmin.AssemblyMarker).Assembly`; `AddValidatorsFromAssembly` para CompanyAdmin; `await DatabaseSeeder.SeedPlatformAdminAsync(app.Services)`; `MapCompaniesEndpoints`
- `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — `COMPANY_NOT_FOUND` → 404; `DUPLICATE_SLUG` → 409

**Tests:**
- `tests/AiWearStudio.Users.Tests/AiWearStudio.Users.Tests.csproj` — agregar ProjectReference a AiWearStudio.CompanyAdmin
- `tests/AiWearStudio.Users.Tests/Integration/CompanyAdminTests.cs` — Testcontainers: AC-COMPANY-CREATE, AC-COMPANY-SLUG-DUPLICATE, AC-COMPANY-ASSIGN-PLAN-AUDIT, AC-COMPANY-NOT-FOUND, AC-COMPANY-SEED-IDEMPOTENT

## Tasks & Acceptance

**Execution:**
- [x] `modules/CompanyAdmin/.../AiWearStudio.CompanyAdmin.csproj` — agregar 5 refs NuGet (EF Core 9.0.1, Npgsql.EF.PG 9.x, MediatR, FluentValidation.DI, Extensions.DI.Abstractions)
- [x] `modules/CompanyAdmin/.../AssemblyMarker.cs` — `public sealed class AssemblyMarker {}`
- [x] `modules/CompanyAdmin/.../Domain/Enums/Plan.cs` + `PlanStatus.cs`
- [x] `modules/CompanyAdmin/.../Domain/Entities/Company.cs` — entity + factory Create + método AssignPlan
- [x] `modules/CompanyAdmin/.../Domain/Entities/PlanAuditLog.cs` — entity + factory Record
- [x] `modules/CompanyAdmin/.../Domain/Repositories/ICompanyRepository.cs`
- [x] `modules/CompanyAdmin/.../Application/Commands/CreateCompany/` — 3 archivos
- [x] `modules/CompanyAdmin/.../Application/Commands/AssignPlan/` — 3 archivos
- [x] `modules/CompanyAdmin/.../Infrastructure/Persistence/CompanyAdminDbContext.cs`
- [x] `modules/CompanyAdmin/.../Infrastructure/Persistence/Repositories/CompanyRepository.cs`
- [x] `modules/CompanyAdmin/.../Infrastructure/DependencyInjection.cs`
- [x] EF Core migration — `dotnet ef migrations add InitialCompanySchema --project modules/CompanyAdmin/AiWearStudio.CompanyAdmin --startup-project AiWearStudio.Api` (desde `src/backend/`)
- [x] `modules/Users/.../Domain/Entities/User.cs` — factory `CreatePlatformAdmin`
- [x] `AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs` — 4 endpoints (GET list, GET id, POST, PATCH plan)
- [x] `AiWearStudio.Api/Startup/DatabaseSeeder.cs` — seed idempotente
- [x] `AiWearStudio.Api/Program.cs` — integrar CompanyAdmin: DI, MediatR scan, validators, seed, endpoints
- [x] `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — COMPANY_NOT_FOUND → 404; DUPLICATE_SLUG → 409
- [x] `tests/.../AiWearStudio.Users.Tests.csproj` — ProjectReference CompanyAdmin
- [x] `tests/.../Integration/CompanyAdminTests.cs` — 5 tests Testcontainers

**Acceptance Criteria:**
- Dado platform_admin, cuando `CreateCompanyCommandHandler` procesa `CreateCompanyCommand(name, slug, Plan.Demo, adminId)`, entonces Company persiste con `PlanStatus=Active` y su `Id` es el tenant_id del sistema.
- Dado slug duplicado, cuando el handler procesa `CreateCompanyCommand`, entonces lanza `DomainException("DUPLICATE_SLUG:...")`.
- Dado company activa, cuando `AssignPlanCommandHandler` procesa `AssignPlanCommand(companyId, Plan.SaaS, adminId, reason)`, entonces `plan_audit_log` tiene una entrada con PreviousPlan=Demo, NewPlan=SaaS, AdminId y Reason correctos.
- Dado id que no existe, cuando cualquier handler procesa, entonces lanza `DomainException("COMPANY_NOT_FOUND:...")`.
- Dado startup con ADMIN_EMAIL ya registrado en Users DB, cuando `DatabaseSeeder.SeedPlatformAdminAsync` ejecuta, entonces no lanza y no duplica el usuario.

## Design Notes

**GET endpoints con repo directo (sin MediatR):** Los endpoints GET de companies inyectan `ICompanyRepository` directamente en lugar de crear Query+QueryHandler. Evita boilerplate para lecturas triviales platform_admin-only. Arquitecturalmente válido: el endpoint pertenece al host, no a otro BC.

**MediatR multi-assembly:** `cfg.RegisterServicesFromAssemblies(typeof(Users.Core.AssemblyMarker).Assembly, typeof(CompanyAdmin.AssemblyMarker).Assembly)` — los behaviors (Idempotency, Logging, Validation) se registran una sola vez para ambos assemblies. Validators: `AddValidatorsFromAssembly(typeof(CompanyAdmin.AssemblyMarker).Assembly)`.

**Seed en startup:** `await DatabaseSeeder.SeedPlatformAdminAsync(app.Services)` corre antes de `app.Run()`. Crea scope propio (`app.Services.CreateScope()`), accede a `IUserRepository` y `IPasswordHasherService`. Idempotente: `FindByEmailAsync(adminEmail)` → si null → crear + save; si existe → return.

**Migration desde API startup:** CompanyAdminDbContext usa conexión string "CompanyAdmin" (misma instancia PostgreSQL que "Users", schema diferente). Para `dotnet ef migrations add`, el startup project debe referenciar CompanyAdmin (ya lo hace vía AddCompanyAdminModule).

## Verification

**Commands:**
- `dotnet build AiWearStudio.slnx` — expected: 0 errores, 0 warnings
- `dotnet test tests/AiWearStudio.Users.Tests --filter Category=Integration` — expected: 16 tests pasan (11 anteriores + 5 nuevos AC-COMPANY-*)
