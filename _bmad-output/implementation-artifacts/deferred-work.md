# Deferred Work

Issues surfaced during code review but pre-existing or out-of-scope for the triggering story. Collect here for future focused attention.

---

## From Story 1.1 Review

| # | Finding | Severity | Source Story | Suggested Story |
|---|---------|----------|--------------|-----------------|
| D-01 | **RefreshToken no persistido**: El handler genera un refresh token y lo retorna al cliente pero no lo almacena en DB, imposibilitando revocación y el flujo de refresh. | High | 1.1 | Login / Token Refresh |
| D-02 | **Sin endpoint `/login`**: Solo existe `/register`. Los usuarios registrados no pueden autenticarse. | High | 1.1 | Login story |
| D-03 | **ValidationBehavior solo aplica a `ICommand<TResponse>`**: Los `IQuery<TResponse>` futuros saltarán validación silenciosamente. Cambiar constraint a `where TRequest : notnull`. | Medium | 1.1 | Cuando se agregue el primer Query |
| D-04 | **DI captive dependency filter incompleto**: `TenantContextCaptureValidationFilter` solo detecta inyección vía constructor; property injection y factory patterns la evaden. | High | 1.1 | Hardening de multi-tenancy |
| D-05 | **IdempotencyBehavior placeholder**: Pass-through sin lógica Redis. Implementar en Story 1.3+ con idempotency key de header y caché Redis 60s. | Medium | 1.1 | Story 1.3 |
| D-06 | **Exception matching por string**: `ex.Message.StartsWith("DUPLICATE_EMAIL")` es frágil ante renombramientos. Usar custom exception types con código enum. | Medium | 1.1 | Refactor de exceptions |
| D-07 | **Placeholder tests en módulos stub**: `UnitTest1.cs` en Catalog, Orders, CompanyAdmin, ProductionQueue, DesignEngine son `[Fact]` sin assertions. Cambiar a `[Fact(Skip = "TODO")]` o eliminar. | Low | 1.1 | Al implementar cada módulo |
| D-08 | **Email max length no validado en FluentValidation**: Solo el constraint de DB (`varchar(320)`) actúa como límite. Agregar `.MaximumLength(254)` (RFC 5321). | Low | 1.1 | Hardening de validación |
| D-09 | **Testcontainers sin Collection Fixture**: Cada test class crea su propio contenedor. Si varias clases de integración comparten setup, agregar `[Collection]` fixtures para evitar interferencia. | Low | 1.1 | Cuando se agreguen más tests de integración |
| D-10 | **`Result<T>` en SharedKernel sin uso**: Tipo definido pero ningún handler lo usa aún. Eliminar o comenzar a usar cuando un handler necesite resultados tipados sin exceptions. | Low | 1.1 | Al implementar handlers que retornen resultados compuestos |

## From Story 1.2 Review

| # | Finding | Severity | Source Story | Suggested Story |
|---|---------|----------|--------------|-----------------|
| D-12 | **Timing side-channel en login**: Cuando `user is null`, `VerifyPassword` se cortocircuita; un atacante puede distinguir "email no existe" de "password incorrecto" midiendo latencia. Siempre llamar a `VerifyPassword` contra un hash dummy cuando el usuario no se encuentra. | Medium | 1.2 | Hardening de autenticación |
| D-13 | **`FirstOrDefaultAsync` vs `SingleOrDefaultAsync` en `RefreshTokenRepository`**: El índice único `uix_refresh_token_hash` garantiza unicidad, pero `FirstOrDefault` silencia violaciones de unicidad en memoria. Usar `SingleOrDefaultAsync` para que EF lance excepción si se viola el invariante. | Low | 1.2 | Hardening de repositorios |
| D-14 | **Rotación sin transacción explícita**: `RefreshTokenCommandHandler` revoca el token anterior y persiste el nuevo en un solo `SaveChangesAsync`. EF los agrupa en una transacción implícita, pero si el handler evoluciona (e.g., cross-DB calls), la atomicidad debe hacerse explícita con `IDbContextTransaction`. | Medium | 1.2 | Hardening de infraestructura |
| D-15 | **Sin `[Authorize]` en `/refresh` y `/logout`**: Cualquier llamada no autenticada con un token válido puede rotar o revocar sesiones sin presentar un access token válido. En Story 1.3 agregar autenticación JWT a estos endpoints y validar que el `sub` del JWT coincida con el `user_id` del refresh token. | Medium | 1.2 | Story 1.3 — JWT middleware |
| D-16 | **Códigos de error embebidos en string**: `DomainException("INVALID_CREDENTIALS: ...")` usa prefijo de string para el routing en `GlobalExceptionMiddleware`. Frágil ante renombramientos. Agregar propiedad tipada `ErrorCode` (enum o constante) a `DomainException` y hacer switch en middleware. (Ver también D-06 de Story 1.1.) | Medium | 1.2 | Refactor de exceptions |
| D-17 | **Sin revocación de tokens previos en nuevo login**: Cada `POST /auth/login` crea un nuevo RefreshToken sin revocar los existentes del usuario. Tokens de sesiones anteriores (multi-dispositivo) permanecen válidos indefinidamente hasta TTL. Definir política: revocar todos, revocar por dispositivo, o limitar tokens activos por usuario. | Low | 1.2 | Política de multi-dispositivo |

## From Story 1.3 Review

| # | Finding | Severity | Source Story | Suggested Story |
|---|---------|----------|--------------|-----------------|
| D-18 | **`ExecuteUpdateAsync` bloqueado por ABI EF Core 9/10**: Infrastructure usa EF Core 9.0.1; Tests referencian 10.0.7. `SetPropertyCalls<T>` tiene breaking change entre versiones → `TypeLoadException` en runtime. Alinear ambos proyectos a la misma versión de EF Core para poder usar `ExecuteUpdateAsync` y obtener el batch UPDATE original. | Medium | 1.3 | Hardening de infraestructura |
| D-19 | **`RevokeAllForUserAsync` sin transacción explícita en handler**: La atomicidad se basa en que `UserRepository` y `RefreshTokenRepository` comparten el mismo `UsersDbContext` Scoped. Si en el futuro uno de los dos se mueve a un DbContext distinto (e.g. write/read split), la atomicidad se pierde silenciosamente. Documentar el invariante o hacerlo explícito con `IDbContextTransaction`. | Medium | 1.3 | Hardening de infraestructura |
| D-20 | **`DELETE /api/v1/users/{id}` sin auditoría**: La desactivación no registra quién la ejecutó (admin que hizo la acción) ni en qué timestamp. Si se requiere auditoría en el futuro, agregar `deactivated_by` (Guid?) y `deactivated_at` (redundante con `deleted_at` pero semánticamente más claro). | Low | 1.3 | Epic de auditoría |
| D-21 | **Sin reactivación de usuarios**: La spec define desactivación unidireccional por decisión de diseño. Si se requiere reactivación (`User.Reactivate()`, quitar `deleted_at`), debe negociarse como historia separada con criterios de autorización. | Low | 1.3 | Story de reactivación |
| D-22 | **`[Authorize(Roles)]` solo aplica a `DELETE /users/{id}`**: Otros endpoints futuros bajo `/api/v1/users` (PATCH, GET list) necesitarán sus propias declaraciones de rol. Considerar policy-based authorization centralizada en lugar de `AuthorizeAttribute` inline para escalar sin repetición. | Low | 1.3 | Cuando se agreguen endpoints de Users |

## From Story 1.2 Scope Split

| # | Finding | Severity | Source Story | Suggested Story |
|---|---------|----------|--------------|-----------------|
| D-11 | **Recuperación de contraseña (Goal B)**: `POST /auth/forgot-password` (link único TTL 1h, respuesta 200 siempre), `POST /auth/reset-password` (aplica nueva contraseña, invalida token), tabla `password_reset_tokens`. Separado de login/tokens porque es independientemente shippable. | High | 1.2 scope split | Story 1.2b o Story 1.3 |
