---
title: 'Story 1.3 — Revocación de Acceso y Suspensión de Usuarios'
type: 'feature'
created: '2026-05-08'
status: 'done'
baseline_commit: 'NO_VCS'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-2-login-tokens-y-refresh.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tras la autenticación (Story 1.2), no existe mecanismo para que un platform_admin desactive una cuenta de usuario e invalide inmediatamente todas sus sesiones activas. Adicionalmente, el role claim mapping en el middleware JWT no está configurado, lo que impide que `[Authorize(Roles)]` funcione en los endpoints.

**Approach:** Agregar `RoleClaimType = "role"` al middleware JWT existente; implementar `DELETE /api/v1/users/{id}` que desactiva el usuario vía `User.Deactivate()` (ya existe) y revoca todos sus refresh tokens en la misma solicitud vía batch update. Solo accesible para platform_admin.

## Boundaries & Constraints

**Always:**
- Solo `platform_admin` puede desactivar usuarios — `[Authorize(Roles = "platform_admin")]` en el endpoint.
- Desactivar revoca TODOS los refresh tokens del usuario (incluyendo expirados) mediante un único batch UPDATE.
- `User.Deactivate()` setea `deleted_at` y `is_active = false` — el HasQueryFilter sobre `deleted_at IS NULL` excluye al usuario automáticamente en todas las consultas posteriores.
- Respuesta 204 en éxito; 404 si el usuario no existe o ya está desactivado (HasQueryFilter retorna null en ambos casos).
- El access token del usuario desactivado sigue válido hasta su expiración natural (TTL ≤ 60 min) — exposición máxima aceptada por diseño del epic.

**Ask First:**
- Si se necesita endpoint de reactivación de usuarios en esta story.
- Si `/logout` debe requerir `[Authorize]` (implica que un access token expirado no puede llamar `/logout`).

**Never:**
- Agregar `[Authorize]` a `/refresh` — está diseñado para cuando el access token expira.
- Invalidar access tokens existentes — sin token blacklist en este epic.
- Distinguir en la respuesta "usuario nunca existió" de "usuario ya desactivado" — ambos retornan 404.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Desactivación exitosa | `DELETE /api/v1/users/{id}` + JWT role `platform_admin` | 204; `deleted_at` set; todos los tokens del usuario tienen `revoked_at` | — |
| Usuario no encontrado o ya desactivado | `DELETE /api/v1/users/{id}` con id inválido/inactivo | 404 RFC 7807 | DomainException("USER_NOT_FOUND") |
| Sin Authorization header | `DELETE /api/v1/users/{id}` sin JWT | 401 | JWT middleware |
| Role insuficiente | `DELETE /api/v1/users/{id}` con role `customer` | 403 | Authorization middleware |
| Refresh post-desactivación | `POST /auth/refresh` con token de usuario desactivado | 401 RFC 7807 | TOKEN_EXPIRED (FindByIdAsync → null via HasQueryFilter) |
| ID no es GUID válido | `DELETE /api/v1/users/abc` | 400 | Route constraint `:guid` rechaza |

</frozen-after-approval>

## Code Map

**Nuevos — Core:**
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/DeactivateUser/DeactivateUserCommand.cs` — command: `DeactivateUserCommand(Guid UserId) : ICommand<Unit>`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/DeactivateUser/DeactivateUserCommandHandler.cs` — `FindByIdAsync` → null → USER_NOT_FOUND; `Deactivate()` → `SaveChanges`; `RevokeAllForUserAsync`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/DeactivateUser/DeactivateUserCommandValidator.cs` — `UserId` not empty Guid

**Modificados — Core:**
- `modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IRefreshTokenRepository.cs` — agregar `Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)`

**Modificados — Infrastructure:**
- `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Repositories/RefreshTokenRepository.cs` — implementar `RevokeAllForUserAsync` con `ExecuteUpdateAsync`

**Nuevos — API:**
- `AiWearStudio.Api/Endpoints/UsersEndpoints.cs` — grupo `/api/v1/users`; `DELETE /{id:guid}` → `DeactivateUserCommand` → `Results.NoContent()`; `.RequireAuthorization(new AuthorizeAttribute { Roles = "platform_admin" })`

**Modificados — API:**
- `AiWearStudio.Api/Program.cs` — agregar `RoleClaimType = "role"` en `TokenValidationParameters`; agregar `app.MapUsersEndpoints()`
- `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — agregar `USER_NOT_FOUND` → 404 antes del catch genérico de `DomainException`

**Tests:**
- `tests/AiWearStudio.Users.Tests/Integration/DeactivateUserTests.cs` — Testcontainers: AC-DEACTIVATE, AC-DEACTIVATE-REPLAY, AC-DEACTIVATE-NOT-FOUND

## Tasks & Acceptance

**Execution:**
- [x] `modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IRefreshTokenRepository.cs` — agregar `Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)`
- [x] `modules/Users/AiWearStudio.Users.Core/Application/Commands/DeactivateUser/DeactivateUserCommand.cs` — record `DeactivateUserCommand(Guid UserId) : ICommand<Unit>`
- [x] `modules/Users/AiWearStudio.Users.Core/Application/Commands/DeactivateUser/DeactivateUserCommandHandler.cs` — `FindByIdAsync` → null → `DomainException("USER_NOT_FOUND: ...")`; `user.Deactivate()` → `userRepository.SaveChangesAsync`; `refreshTokenRepository.RevokeAllForUserAsync(request.UserId, ct)` → return `Unit.Value`
- [x] `modules/Users/AiWearStudio.Users.Core/Application/Commands/DeactivateUser/DeactivateUserCommandValidator.cs` — `RuleFor(x => x.UserId).NotEqual(Guid.Empty)`
- [x] `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Repositories/RefreshTokenRepository.cs` — implementar `RevokeAllForUserAsync`: load active tokens → `Revoke()` → `SaveChangesAsync` (reemplazó `ExecuteUpdateAsync` por incompatibilidad de ABI entre EF Core 9.x/10.x)
- [x] `AiWearStudio.Api/Program.cs` — agregar `RoleClaimType = "role"` en `TokenValidationParameters`; agregar `app.MapUsersEndpoints()` tras `app.MapAuthEndpoints()`
- [x] `AiWearStudio.Api/Endpoints/UsersEndpoints.cs` — `MapUsersEndpoints`: grupo `/api/v1/users`; `MapDelete("/{id:guid}", ...)` → send `DeactivateUserCommand(id)` → `Results.NoContent()`; `.RequireAuthorization(new AuthorizeAttribute { Roles = "platform_admin" })`.Produces(204).ProducesProblem(401).ProducesProblem(403).ProducesProblem(404)
- [x] `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — agregar antes del catch genérico `DomainException`: `catch (DomainException ex) when (ex.Message.StartsWith("USER_NOT_FOUND"))` → `WriteProblemAsync(context, 404, "Usuario no encontrado", "El usuario solicitado no existe.")`
- [x] `tests/AiWearStudio.Users.Tests/Integration/DeactivateUserTests.cs` — handler-level Testcontainers: AC-DEACTIVATE (desactivación → deleted_at set + tokens revocados), AC-DEACTIVATE-REPLAY (refresh con token de usuario desactivado → DomainException("TOKEN_EXPIRED")), AC-DEACTIVATE-NOT-FOUND (id inexistente → DomainException("USER_NOT_FOUND"))

**Acceptance Criteria:**
- Dado un usuario activo con refresh tokens, cuando `DeactivateUserCommandHandler` procesa `DeactivateUserCommand(userId)`, entonces `IUserRepository.FindByIdAsync(userId)` retorna null y todos los `RefreshToken` del usuario tienen `RevokedAt != null`.
- Dado un usuario desactivado con tokens previos, cuando `RefreshTokenCommandHandler` procesa un token de ese usuario, entonces lanza `DomainException("TOKEN_EXPIRED...")` porque `FindByIdAsync` retorna null vía HasQueryFilter.
- Dado un UserId que no existe o ya está desactivado, cuando el handler procesa, entonces lanza `DomainException("USER_NOT_FOUND...")`.
- Dado `DELETE /api/v1/users/{id}` sin JWT, cuando el middleware procesa, entonces retorna 401 sin invocar el handler. Dado role distinto de platform_admin, entonces retorna 403.

## Spec Change Log

**2026-05-08 — Patch de review (atomicidad + cobertura):**
- `RevokeAllForUserAsync` implementado con `ToListAsync` + `foreach t.Revoke()` (sin `SaveChangesAsync` interno) en lugar de `ExecuteUpdateAsync` — incompatibilidad de ABI entre EF Core 9.x/10.x causaba `TypeLoadException` en test runner.
- `DeactivateUserCommandHandler` reordenado: `user.Deactivate()` + `RevokeAllForUserAsync` primero, `SaveChangesAsync` único al final — commit atómico de ambas mutaciones.
- Tests ampliados de 3 a 5: agregados `AC-DEACTIVATE-ALREADY-INACTIVE` y `AC-DEACTIVATE-HASQUERYFILTER`.

## Design Notes

**`RevokeAllForUserAsync` — ToList + Revoke en lugar de ExecuteUpdateAsync:** La intención original era un solo batch UPDATE vía `ExecuteUpdateAsync` (sin change tracker). Descartado por incompatibilidad de ABI `SetPropertyCalls<T>` entre EF Core 9.0.1 (Infrastructure) y 10.0.7 (Tests). Implementación actual: carga tokens activos → `t.Revoke()` en memoria → `SaveChangesAsync` del caller. La atomicidad se preserva porque ambos repositorios comparten el mismo `UsersDbContext` Scoped.

**Desactivación como soft-delete:** `User.Deactivate()` ya existe y setea ambos campos (`is_active`, `deleted_at`). El HasQueryFilter `deleted_at IS NULL` hace que el usuario desactivado sea invisible para `FindByIdAsync` — lo que automáticamente bloquea el refresh vía `RefreshTokenCommandHandler` sin lógica adicional.

**`RoleClaimType = "role"`:** El JWT emite claims con type literal `"role"`. Sin este setting, `[Authorize(Roles)]` busca claims de tipo `ClaimTypes.Role` (URI largo) y siempre falla silenciosamente devolviendo 403. El fix es una línea en `TokenValidationParameters`.

## Verification

**Commands:**
- `dotnet build AiWearStudio.slnx` — expected: 0 errores, 0 warnings
- `dotnet test tests/AiWearStudio.Users.Tests --filter Category=Integration` — expected: 11 tests pasan (6 de Stories 1.1–1.2 + 5 nuevos AC-DEACTIVATE-*)

**Verification results (2026-05-08):** Build succeeded — 0 errors, 0 warnings. Tests: 11/11 passed.
