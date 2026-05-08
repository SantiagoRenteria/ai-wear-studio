---
title: 'Story 1.2 — Login, Refresh Token y Logout'
type: 'feature'
created: '2026-05-08'
status: 'done'
baseline_commit: 'NO_VCS'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-1-foundacion-arquitectonica-registro-cliente.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tras el registro (Story 1.1), los usuarios no pueden autenticarse: no hay endpoint de login, ni tabla `refresh_tokens`, ni mecanismo de rotación ni logout.

**Approach:** Implementar `POST /auth/login`, `POST /auth/refresh` y `POST /auth/logout` sobre la infraestructura existente. Los refresh tokens se persisten como SHA-256 hash en `users.refresh_tokens`; cada refresh rota el token obligatoriamente; el logout es idempotente.

## Boundaries & Constraints

**Always:**
- Refresh token almacenado como SHA-256 hash — nunca el valor raw en DB.
- TTL access token = 60 min (JwtSettings.TtlMinutes existente); TTL refresh token = 30 días (nuevo `JwtSettings.RefreshTokenTtlDays`).
- Rotación obligatoria: `POST /auth/refresh` revoca el token anterior antes de emitir el nuevo par.
- `POST /auth/logout` es idempotente — 204 siempre, sin importar si el token existe o ya fue revocado.
- Credenciales inválidas (email no existe, password incorrecto, usuario soft-deleted): siempre 401 "Credenciales inválidas" sin distinguir el motivo.
- `FindByEmailAsync` usa `HasQueryFilter` existente — excluye usuarios con `deleted_at` poblado sin código adicional.

**Ask First:**
- Si el TTL de refresh token debe variar por rol (customer vs. usuario interno) — HALT antes de implementar.

**Never:**
- Almacenar el refresh token raw en DB.
- Recuperación de contraseña (diferida a D-11 en deferred-work.md).
- Retornar 403 para credenciales inválidas (information leak).
- Permitir re-uso de un token ya rotado (replay attack).

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Login exitoso | `POST /auth/login` con email + password correctos | 200 + `{accessToken, refreshToken}` | — |
| Login email inexistente | Email no registrado | 401 RFC 7807 | DomainException("INVALID_CREDENTIALS") |
| Login password incorrecto | Email correcto, password wrong | 401 RFC 7807 | DomainException("INVALID_CREDENTIALS") |
| Login usuario soft-deleted | `deleted_at != null` | 401 RFC 7807 | HasQueryFilter → null → 401 |
| Refresh exitoso | `POST /auth/refresh` con token válido | 200 + nuevos tokens; token anterior revocado | — |
| Refresh token expirado | `expires_at < now` | 401 RFC 7807 | DomainException("TOKEN_EXPIRED") |
| Refresh token re-uso (replay) | Token ya rotado | 401 RFC 7807 | DomainException("TOKEN_EXPIRED") |
| Logout token válido | `POST /auth/logout` con token activo | 204 | — |
| Logout token inválido | Token inexistente o ya revocado | 204 | — |

</frozen-after-approval>

## Code Map

**Nuevos — Core:**
- `modules/Users/AiWearStudio.Users.Core/Domain/Entities/RefreshToken.cs` — entidad con `Create(userId, rawToken, ttlDays)`, `ComputeHash(token)` (SHA-256→Base64), `IsExpired()`, `IsRevoked()`, `Revoke()`
- `modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IRefreshTokenRepository.cs` — `AddAsync`, `FindByTokenHashAsync`, `SaveChangesAsync`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/Login/` — `LoginCommand(Email, Password)` + Handler + Validator
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/RefreshToken/` — `RefreshTokenCommand(Token)` + Handler + Validator
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/Logout/` — `LogoutCommand(Token)` + Handler

**Nuevos — Infrastructure + Tests:**
- `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Repositories/RefreshTokenRepository.cs`
- `modules/Users/AiWearStudio.Users.Infrastructure/Migrations/` — nueva migración `AddRefreshTokens`
- `tests/AiWearStudio.Users.Tests/Integration/AuthFlowTests.cs` — Testcontainers: AC-AUTH-LOGIN, AC-AUTH-REFRESH-ROTATION, AC-AUTH-LOGOUT

**Modificados:**
- `modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IUserRepository.cs` — agregar `FindByIdAsync(Guid id)`
- `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Repositories/UserRepository.cs` — implementar `FindByIdAsync`
- `modules/Users/AiWearStudio.Users.Infrastructure/Services/JwtSettings.cs` — agregar `RefreshTokenTtlDays` (default 30)
- `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/UsersDbContext.cs` — agregar `DbSet<RefreshToken>`, tabla `refresh_tokens` con FK `user_id` e índice único en `token_hash`
- `modules/Users/AiWearStudio.Users.Infrastructure/DependencyInjection.cs` — registrar `IRefreshTokenRepository`
- `AiWearStudio.Api/Endpoints/AuthEndpoints.cs` — agregar `POST /login` (200), `POST /refresh` (200), `POST /logout` (204)
- `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — capturar `INVALID_CREDENTIALS` → 401, `TOKEN_EXPIRED` → 401
- `AiWearStudio.Api/appsettings.Development.json` — agregar `"RefreshTokenTtlDays": 30` bajo sección `Jwt`

## Tasks & Acceptance

**Execution:**
- [x] `modules/Users/AiWearStudio.Users.Core/Domain/Entities/RefreshToken.cs` — crear entidad (`Entity` base) con factory `Create`, `ComputeHash` estático, `IsExpired`, `IsRevoked`, `Revoke`
- [x] `modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IRefreshTokenRepository.cs` — interface: `AddAsync`, `FindByTokenHashAsync`, `SaveChangesAsync`
- [x] `modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IUserRepository.cs` — agregar `Task<User?> FindByIdAsync(Guid id, CancellationToken ct = default)`
- [x] `modules/Users/AiWearStudio.Users.Infrastructure/Services/JwtSettings.cs` — agregar `public int RefreshTokenTtlDays { get; init; } = 30`
- [x] `modules/Users/AiWearStudio.Users.Core/Application/Commands/Login/LoginCommand.cs` + `LoginCommandHandler.cs` + `LoginCommandValidator.cs` — handler: normalizar email, `FindByEmailAsync` (null → INVALID_CREDENTIALS), `VerifyPassword` (false → INVALID_CREDENTIALS), `RefreshToken.Create(userId, rawToken, ttlDays)`, persistir, retornar `AuthResponse`
- [x] `modules/Users/AiWearStudio.Users.Core/Application/Commands/RefreshToken/RefreshTokenCommand.cs` + `RefreshTokenCommandHandler.cs` + `RefreshTokenCommandValidator.cs` — handler: `ComputeHash` → `FindByTokenHashAsync` → validar no expirado/revocado → `FindByIdAsync(userId)` → `Revoke()` → crear nuevo `RefreshToken` → persistir → retornar `AuthResponse`
- [x] `modules/Users/AiWearStudio.Users.Core/Application/Commands/Logout/LogoutCommand.cs` + `LogoutCommandHandler.cs` — handler idempotente: `ComputeHash` → `FindByTokenHashAsync` → si encontrado y no revocado → `Revoke()` → `SaveChanges` → `Unit`
- [x] `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/UsersDbContext.cs` — `DbSet<RefreshToken>`, tabla `refresh_tokens` schema `users`, FK `user_id` → `users.id`, índice único `uix_refresh_token_hash` en `token_hash`
- [x] `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Repositories/RefreshTokenRepository.cs` — implementar `IRefreshTokenRepository`
- [x] `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Repositories/UserRepository.cs` — implementar `FindByIdAsync` con `HasQueryFilter` (excluye soft-deleted)
- [x] `modules/Users/AiWearStudio.Users.Infrastructure/DependencyInjection.cs` — `services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>()`
- [x] `dotnet ef migrations add AddRefreshTokens --project modules/Users/AiWearStudio.Users.Infrastructure --startup-project AiWearStudio.Api` — generar migración; verificar que crea `users.refresh_tokens` con columnas snake_case y el índice único
- [x] `AiWearStudio.Api/Endpoints/AuthEndpoints.cs` — `POST /login` → `LoginCommand` → `Results.Ok(result)`; `POST /refresh` → `RefreshTokenCommand` → `Results.Ok(result)`; `POST /logout` → `LogoutCommand` → `Results.NoContent()`
- [x] `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — agregar `catch (DomainException ex) when (ex.Message.StartsWith("INVALID_CREDENTIALS"))` → 401; `catch (DomainException ex) when (ex.Message.StartsWith("TOKEN_EXPIRED"))` → 401
- [x] `AiWearStudio.Api/appsettings.Development.json` — agregar `"RefreshTokenTtlDays": 30` dentro del bloque `Jwt`
- [x] `tests/AiWearStudio.Users.Tests/Integration/AuthFlowTests.cs` — Testcontainers: `AC-AUTH-LOGIN` (login exitoso → 200 + tokens en DB), `AC-AUTH-REFRESH-ROTATION` (refresh rota token; reintento con token anterior → TOKEN_EXPIRED), `AC-AUTH-LOGOUT` (logout → 204; re-refresh → TOKEN_EXPIRED)

**Acceptance Criteria:**
- Dado `POST /auth/login` con credenciales correctas de customer, cuando el handler procesa, entonces retorna 200 con `{accessToken, refreshToken}` y existe exactamente un `RefreshToken` en DB.
- Dado `POST /auth/login` con email inexistente o password incorrecto, cuando el handler procesa, entonces retorna 401 RFC 7807 sin distinguir el motivo.
- Dado `POST /auth/login` con usuario soft-deleted (`deleted_at != null`), cuando el handler procesa, entonces retorna 401 (sin lógica adicional — `HasQueryFilter` excluye el usuario).
- Dado `POST /auth/refresh` con token válido, cuando el handler procesa, entonces retorna 200 con nuevos tokens Y el token anterior queda revocado (reintento inmediato → 401).
- Dado `POST /auth/refresh` con token expirado o ya revocado, cuando el handler procesa, entonces retorna 401 RFC 7807.
- Dado `POST /auth/logout` con cualquier token (válido, inválido, ya revocado), cuando el handler procesa, entonces siempre retorna 204.

## Spec Change Log

## Design Notes

**SHA-256 en DB:** El token raw se emite al cliente y nunca se persiste. `RefreshToken.ComputeHash(rawToken)` es el único punto de conversión — estático en la entidad para hacerlo explícito. Si la DB se ve comprometida, los hashes no son reversibles.

**Rotación como detección de replay:** Revocar el token anterior antes de emitir el nuevo garantiza que un token capturado en tránsito solo puede usarse una vez. Un intento de re-uso después de la rotación retorna 401. En Story 1.3 se puede extender para revocar todos los tokens del usuario cuando se detecta re-uso (indicio de compromiso).

**Logout idempotente:** El cliente no necesita saber si el token era válido. Retornar siempre 204 previene que un atacante use este endpoint para sondear la validez de tokens robados.

## Verification

**Commands:**
- `dotnet build AiWearStudio.slnx` — expected: 0 errores, 0 warnings
- `dotnet test tests/AiWearStudio.Users.Tests --filter Category=Integration` — expected: 5 tests pasan (2 de Story 1.1 + 3 nuevos AC-AUTH-*)
- `curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"TestPass1234!\"}"` — expected: 200 + `accessToken` y `refreshToken` no nulos

## Suggested Review Order

**Diseño de dominio — punto de entrada**

- Entidad central: SHA-256 hash, TTL atómico (single `now`), `IsExpired`/`IsRevoked`/`Revoke`
  [`RefreshToken.cs:7`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Domain/Entities/RefreshToken.cs#L7)

**Ciclo de vida del token — handlers**

- Login: normaliza email, verifica password, emite par access+refresh; un RefreshToken por login
  [`LoginCommandHandler.cs:17`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/Login/LoginCommandHandler.cs#L17)

- Refresh: revoca token anterior y persiste nuevo en un solo `SaveChangesAsync` (rotación atómica)
  [`RefreshTokenCommandHandler.cs:16`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/RefreshToken/RefreshTokenCommandHandler.cs#L16)

- Logout: idempotente — revoca solo si no revocado; sin throw en ningún caso
  [`LogoutCommandHandler.cs:10`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/Logout/LogoutCommandHandler.cs#L10)

**Validación**

- Validators para Login, Refresh y Logout (NotEmpty en todos los campos requeridos)
  [`LoginCommandValidator.cs:1`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/Login/LoginCommandValidator.cs#L1)
  [`RefreshTokenCommandValidator.cs:1`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/RefreshToken/RefreshTokenCommandValidator.cs#L1)
  [`LogoutCommandValidator.cs:1`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/Logout/LogoutCommandValidator.cs#L1)

**Mapeo de errores → HTTP**

- `INVALID_CREDENTIALS` → 401; `TOKEN_EXPIRED` → 401; sin distinguir motivo (spec constraint)
  [`GlobalExceptionMiddleware.cs:27`](../../src/backend/AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs#L27)

**Superficie API**

- POST /login (200), /refresh (200), /logout (204) — minimal API, sin lógica en endpoints
  [`AuthEndpoints.cs:29`](../../src/backend/AiWearStudio.Api/Endpoints/AuthEndpoints.cs#L29)

**Contratos de repositorio**

- `IRefreshTokenRepository`: AddAsync, FindByTokenHashAsync, SaveChangesAsync
  [`IRefreshTokenRepository.cs:1`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IRefreshTokenRepository.cs#L1)

- `FindByIdAsync` añadido a IUserRepository (necesario para RefreshTokenCommandHandler)
  [`IUserRepository.cs:9`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IUserRepository.cs#L9)

- `RefreshTokenTtlDays` en IJwtTokenService — preserva frontera Clean Architecture
  [`IJwtTokenService.cs:9`](../../src/backend/modules/Users/AiWearStudio.Users.Core/Application/Interfaces/IJwtTokenService.cs#L9)

**Infraestructura**

- EF config: tabla `refresh_tokens`, FK cascade, índice único `uix_refresh_token_hash`
  [`UsersDbContext.cs:40`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Persistence/UsersDbContext.cs#L40)

- Migración genera schema correcto en snake_case con FK e índice único
  [`AddRefreshTokens.cs:14`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Migrations/20260508160248_AddRefreshTokens.cs#L14)

- `JwtSettings.RefreshTokenTtlDays` + exposición vía `JwtTokenService`
  [`JwtSettings.cs:9`](../../src/backend/modules/Users/AiWearStudio.Users.Infrastructure/JwtSettings.cs#L9)

**Tests y configuración**

- Tests de integración invocan handlers reales contra Postgres real (Testcontainers)
  [`AuthFlowTests.cs:67`](../../src/backend/tests/AiWearStudio.Users.Tests/Integration/AuthFlowTests.cs#L67)

- `RefreshTokenTtlDays: 30` en config de desarrollo
  [`appsettings.Development.json:12`](../../src/backend/AiWearStudio.Api/appsettings.Development.json#L12)
