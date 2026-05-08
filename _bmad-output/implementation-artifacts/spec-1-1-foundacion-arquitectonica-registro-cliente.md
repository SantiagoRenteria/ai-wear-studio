---
title: 'Story 1.1 — Fundación Arquitectónica y Registro de Cliente'
type: 'feature'
created: '2026-05-08'
status: 'done'
baseline_commit: 'NO_VCS'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/planning-artifacts/DAY_ONE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El proyecto no tiene backend. El frontend prototipo existe en `src/` (React + Konva) pero no hay solución .NET, infraestructura local, ni ningún endpoint funcional.

**Approach:** Crear `src/backend/` con la solución .NET 10 Clean Architecture Híbrida (19 proyectos), levantar el stack Docker (PostgreSQL 17 + Redis 7 + MinIO), definir SharedKernel completo, configurar el pipeline MediatR, e implementar el primer endpoint de negocio: registro de cliente con emisión de JWT.

## Boundaries & Constraints

**Always:**
- 19 proyectos exactos: 12 source + 7 test. Ver comandos exactos en `DAY_ONE.md §Fase 2`.
- Reglas de dependencia inmutables: SharedKernel sin deps salientes; BC.Core → solo SharedKernel; BC.Core → otro BC.Core = PROHIBIDO.
- Pipeline MediatR en orden exacto: `IdempotencyBehavior → LoggingBehavior → ValidationBehavior → Handler`.
- `HasQueryFilter` en `UsersDbContext` para `deleted_at IS NULL` en entidades con soft-delete.
- Contraseñas con `PasswordHasher<T>` (ASP.NET Core, bcrypt equivalente cost ≥ 12). Sin ASP.NET Identity.
- JWT: HS256, TTL 60 min, claims `{ sub, role: "customer" }` sin `tenant_id` para customers.
- Índices parciales `uix_email_b2c` (WHERE role = 'customer') y `uix_email_b2b` (WHERE role != 'customer') en tabla `users`.
- Todos los errores en RFC 7807 `application/problem+json`.
- Tests de integración con Testcontainers contra DB real — nunca mocks de DB.
- El frontend prototipo en `src/` permanece intacto; solo se crea `src/backend/`.

**Ask First:**
- Si `dotnet build` falla por conflicto de versión de NuGet entre proyectos — HALT antes de hacer downgrade.
- Si la versión de .NET instalada no es 10 — HALT y reportar antes de usar un TFM diferente.

**Never:**
- ASP.NET Core Identity (sus tablas no encajan con el modelo multi-tenant custom).
- Un `AppDbContext` global — un `DbContext` por BC.
- Secrets hardcodeados en `appsettings.json` o en código fuente.
- `tenant_id` nullable en entidades de dominio de BC Users o CompanyAdmin.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error Handling |
|----------|-------|----------|----------------|
| Registro exitoso | `POST /api/v1/auth/register` `{ email, password ≥8 chars }` | 201 + `{ accessToken (JWT 60min), refreshToken }`, claims `{ sub, role: "customer" }` | — |
| Email duplicado mismo rol | Email ya registrado como customer | 409 RFC 7807 | Index `uix_email_b2c` → 409 |
| Email duplicado rol cruzado | Email de customer intentando rol interno | 409 RFC 7807, mensaje explícito del conflicto B2C/B2B | Index `uix_email_b2b` → 409 |
| Password inválido | Password < 8 caracteres | 400 RFC 7807 con detalle de campo `password` | ValidationBehavior |
| Captive dependency en DI | Singleton registra `ITenantContext` directamente | `InvalidOperationException` en startup, app no arranca | `IStartupFilter` |
| Cross-tenant RBAC | Operario Tenant A → recurso del Tenant B | 404 | `HasQueryFilter` filtra antes del handler |

</frozen-after-approval>

## Code Map

- `src/backend/` — raíz de la solución .NET 10; `AiWearStudio.sln` + `Makefile` + `docker-compose*.yml` + `.env.example`
- `src/backend/infrastructure/AiWearStudio.SharedKernel/` — tipos base del dominio + interfaces transversales
- `src/backend/modules/Users/AiWearStudio.Users.Core/` — User entity, RegisterCustomerCommand + Handler, IUserRepository
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/` — UsersDbContext, migraciones, UserRepository, JwtTokenService, PasswordHasherService
- `src/backend/AiWearStudio.Api/` — Program.cs, AuthEndpoints, Behaviors, IStartupFilter
- `src/backend/tests/AiWearStudio.Architecture.Tests/` — NetArchTest: reglas de dependencia
- `src/backend/tests/AiWearStudio.Users.Tests/` — Testcontainers: AC-RBAC-CROSS-TENANT, AC-RBAC-EMAIL-CONFLICT

## Tasks & Acceptance

**Execution:**
- [x] `src/backend/docker-compose.yml`, `src/backend/docker-compose.test.yml`, `src/backend/Makefile`, `src/backend/.env.example` — crear archivos de infraestructura base; contenido exacto en `DAY_ONE.md §Fase 1`
- [x] `src/backend/` — scaffold 19 proyectos con `dotnet new` y referencias entre proyectos; comandos exactos en `DAY_ONE.md §Fase 2–4`
- [x] `src/backend/infrastructure/AiWearStudio.SharedKernel/` — crear: `Entity.cs`, `AggregateRoot.cs`, `ValueObject.cs`, `IDomainEvent.cs`, `ICommand.cs`, `IQuery.cs`, `Result.cs`, `ITenantContext.cs`, `IAssetStorage.cs`, `IRateLimitPolicy.cs`; contenido exacto en `DAY_ONE.md §Fase 5`
- [x] `src/backend/AiWearStudio.Api/Behaviors/IdempotencyBehavior.cs`, `LoggingBehavior.cs`, `ValidationBehavior.cs` — implementar `IPipelineBehavior<,>`; registrar en `Program.cs` en orden exacto (`DAY_ONE.md §Fase 6`)
- [x] `src/backend/AiWearStudio.Api/Filters/TenantContextCaptureValidationFilter.cs` — `IStartupFilter` que inspecciona descriptores DI y lanza `InvalidOperationException` si un Singleton tiene `ITenantContext` como dependencia directa (`DAY_ONE.md §Fase 7`)
- [x] `src/backend/modules/Users/AiWearStudio.Users.Core/Domain/Entities/User.cs` — AggregateRoot con: `Id (Guid)`, `Email (string)`, `PasswordHash (string)`, `Role (enum: Customer|Operator|WorkshopAdmin|PlatformAdmin)`, `TenantId (Guid?)`, `IsActive (bool)`, `DeletedAt (DateTime?)`
- [x] `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Persistence/UsersDbContext.cs` — `HasQueryFilter` para `deleted_at IS NULL` en User; índices parciales `uix_email_b2c` y `uix_email_b2b` en `OnModelCreating`; `UseSnakeCaseNamingConvention()`
- [x] `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Migrations/` — generar migración inicial con `dotnet ef migrations add InitialSchema`
- [x] `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/RegisterCustomerCommand.cs` — `ICommand<AuthResponse>`; handler: validar email único vía IUserRepository, hashear password, persistir User, emitir JWT + refresh token vía IJwtTokenService
- [x] `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Services/JwtTokenService.cs` — JWT HS256, TTL 60 min, claims `{ sub, role }` sin tenant_id, clave desde `IOptions<JwtSettings>`
- [x] `src/backend/AiWearStudio.Api/Endpoints/AuthEndpoints.cs` — `POST /api/v1/auth/register` → `ISender.Send(RegisterCustomerCommand)` → 201; mapear `DomainException` y duplicado de email a RFC 7807
- [x] `src/backend/tests/AiWearStudio.Architecture.Tests/DependencyTests.cs` — NetArchTest: (1) SharedKernel sin deps salientes, (2) `*.Core` solo referencia SharedKernel, (3) ningún `*.Core` referencia otro `*.Core`
- [x] `src/backend/tests/AiWearStudio.Users.Tests/Integration/TenantIsolationTests.cs` — Testcontainers con `docker-compose.test.yml`: `AC-RBAC-CROSS-TENANT` (operario Tenant A → recurso Tenant B = 404), `AC-RBAC-EMAIL-CONFLICT` (email cruzado B2C↔B2B = 409)

**Acceptance Criteria:**
- Dado que `make dev` se ejecuta en `src/backend/`, cuando los contenedores levantan, entonces PostgreSQL 17 + Redis 7 + MinIO están disponibles y `dotnet run --project AiWearStudio.Api` arranca sin excepciones.
- Dado que `dotnet build AiWearStudio.sln` se ejecuta, cuando completa, entonces 0 errores y 0 warnings; `dotnet sln list` retorna exactamente 19 proyectos.
- Dado que un Singleton en DI captura `ITenantContext` directamente, cuando la app inicia, entonces `IStartupFilter` lanza `InvalidOperationException` antes del primer request.
- Dado que `POST /api/v1/auth/register` recibe `{ email, password ≥8 }` nuevos, cuando el handler procesa, entonces retorna 201 con `{ accessToken, refreshToken }` y los claims JWT incluyen `{ sub, role: "customer" }` sin `tenant_id`.
- Dado que el mismo email se envía dos veces, cuando el segundo request llega, entonces retorna 409 `application/problem+json`.
- Dado que un email registrado como customer intenta registrarse como usuario interno, cuando la DB rechaza por índice parcial, entonces la API retorna 409 con mensaje explícito del conflicto de rol.
- Dado que `dotnet test AiWearStudio.Architecture.Tests` se ejecuta, cuando NetArchTest verifica dependencias, entonces todos los tests pasan.
- Dado que se ejecuta el test `AC-RBAC-CROSS-TENANT` con Testcontainers, cuando un operario del Tenant A accede a un recurso del Tenant B, entonces retorna 404.

## Design Notes

**Sin `AppDbContext` global:** Cada BC tiene su propio `DbContext`. El `UsersDbContext` solo gestiona las tablas del schema `users`. La comunicación cross-BC va por la API pública del módulo, nunca por JOINs.

**`IStartupFilter` vs test de arquitectura:** El captive dependency risk es silencioso — un Singleton que captura `ITenantContext` retiene el scope del primer request y corrompe el tenant isolation en producción bajo carga. Fallarlo en startup garantiza detección antes del primer deploy.

**`IdempotencyBehavior` antes del log:** Si el request fue procesado antes, no debería loguear ni validar de nuevo — retornar la respuesta cacheada limpiamente desde Redis.

## Verification

**Commands:**
- `dotnet build src/backend/AiWearStudio.sln` — expected: `Build succeeded. 0 Error(s). 0 Warning(s).`
- `dotnet sln src/backend/AiWearStudio.sln list | find /c /v ""` — expected: `19`
- `dotnet test src/backend/tests/AiWearStudio.Architecture.Tests` — expected: todos los tests pasan
- `dotnet test src/backend/tests/AiWearStudio.Users.Tests --filter Category=Integration` — expected: AC-RBAC-CROSS-TENANT pasa, AC-RBAC-EMAIL-CONFLICT pasa
- `curl -s -X POST http://localhost:5000/api/v1/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"TestPass1234!\"}"` — expected: HTTP 201 con `accessToken` no nulo

## Suggested Review Order

**Punto de entrada — API de registro**

- Minimal API endpoint; primer contacto del request con el sistema
  [`AuthEndpoints.cs:15`](../../src/backend/AiWearStudio.Api/Endpoints/AuthEndpoints.cs#L15)

- Orquestación central: email checks, hash, persistencia, JWT
  [`RegisterCustomerCommandHandler.cs:15`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/RegisterCustomer/RegisterCustomerCommandHandler.cs#L15)

- FluentValidation: formato email + mínimo 8 chars de password
  [`RegisterCustomerCommandValidator.cs:8`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/RegisterCustomer/RegisterCustomerCommandValidator.cs#L8)

**Modelo de dominio**

- AggregateRoot con factories estáticas que imponen invariantes de tenant y rol
  [`User.cs:1`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Domain/Entities/User.cs#L1)

- Enum que mapea a los strings literales de los índices parciales en DB
  [`UserRole.cs:1`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Domain/Enums/UserRole.cs#L1)

**Esquema de DB e índices**

- HasQueryFilter (soft-delete) + uix_email_b2c / uix_email_b2b declarados
  [`UsersDbContext.cs:24`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Persistence/UsersDbContext.cs#L24)

- Migración generada: columnas snake_case + ambos índices parciales reales
  [`20260508145454_InitialSchema.cs:1`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Migrations/20260508145454_InitialSchema.cs#L1)

- ExistsWithEmailAndRoleGroupAsync usa IgnoreQueryFilters para soft-deleted rows
  [`UserRepository.cs:13`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Repositories/UserRepository.cs#L13)

**JWT y seguridad**

- GenerateAccessToken: HS256, claims {sub, role}, tenant_id solo si presente
  [`JwtTokenService.cs:18`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Services/JwtTokenService.cs#L18)

- Wrapper de IPasswordHasher<User>; mantiene Core libre de dependencia AspNetCore
  [`PasswordHasherService.cs:8`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Services/PasswordHasherService.cs#L8)

**Pipeline y cross-cutting**

- Registro de behaviors en orden exacto: Idempotency → Logging → Validation
  [`Program.cs:27`](../../src/backend/AiWearStudio.Api/Program.cs#L27)

- RFC 7807 para todos los errores; DbUpdateException → 409 en race conditions
  [`GlobalExceptionMiddleware.cs:36`](../../src/backend/AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs#L36)

- IStartupFilter que detecta singleton capturando ITenantContext al arrancar
  [`TenantContextCaptureValidationFilter.cs:13`](../../src/backend/AiWearStudio.Api/Filters/TenantContextCaptureValidationFilter.cs#L13)

**Tests**

- NetArchTest: SharedKernel sin deps salientes, Core solo → SharedKernel
  [`DependencyTests.cs:1`](../../src/backend/tests/AiWearStudio.Architecture.Tests/DependencyTests.cs#L1)

- Testcontainers: aislamiento cross-tenant + constraint uix_email_b2c
  [`TenantIsolationTests.cs:40`](../../src/backend/tests/AiWearStudio.Users.Tests/Integration/TenantIsolationTests.cs#L40)

**Infraestructura**

- Registro de servicios del módulo Users en el contenedor DI
  [`DependencyInjection.cs:1`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/DependencyInjection.cs#L1)

- PostgreSQL en puerto 5434 (evita conflicto con servicio local en 5432)
  [`docker-compose.yml:8`](../../src/backend/docker-compose.yml#L8)
