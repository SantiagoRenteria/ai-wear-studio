---
title: 'Story 1.7 — Verificación de Email, Preview Anónimo de Logo y Guard de IA'
type: 'feature'
created: '2026-05-12'
status: 'done'
baseline_commit: '53bd457'
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/prd.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El sistema no tiene mecanismo para prevenir la creación masiva de cuentas falsas y el costo real de IA generativa está expuesto a cualquier usuario autenticado. Además, no existe una experiencia de preview anónimo (logo sobre prenda) que sirva como primera impresión antes del registro, lo que obliga a los usuarios a comprometerse antes de ver el valor.

**Approach:**
- Añadir `EmailVerified` (bool, default false) + `EmailVerifiedAt` (DateTime?) a `User` + migración DB.
- En `RegisterCustomerCommandHandler`: después de guardar el user, generar token hex (256-bit, TTL 24h en Redis clave `email:verify:{token}` → userId) y enviar email de verificación vía `IEmailSender.SendVerificationEmailAsync`. El JWT se emite con claim `email_verified: false` — acceso parcial inmediato al catálogo y preview de logo.
- `JwtTokenService`: incluir claim `email_verified` desde `user.EmailVerified` en todos los access tokens. El claim se actualiza automáticamente en el siguiente `POST /auth/refresh` tras la verificación.
- `VerifyEmailCommandHandler`: consume el token Redis (un solo uso) → actualiza user en DB (`VerifyEmail()`) → retorna 200. El frontend llama `POST /auth/refresh` para obtener JWT actualizado con `email_verified: true`.
- `ResendVerificationEmailCommandHandler`: rate limit (3/15min en Redis clave `resend:limit:{email}`) → invalida token anterior → genera nuevo → reenvía email.
- `IEmailVerificationTokenService` (interfaz en Users.Core) + `RedisEmailVerificationTokenService` (impl en Users.Infrastructure) encapsula toda la lógica Redis de verificación y resend.
- `RequireVerifiedEmail` policy en `Program.cs`: `RequireAuthenticatedUser().RequireClaim("email_verified", "true")`. Story 3.3 la aplica en endpoints de IA.
- `IAiRateLimiter` (SharedKernel) + `RedisAiRateLimiter` (Users.Infrastructure): Lua atómico INCR+EXPIRE, clave `rate_limit:ai:{userId}`, límite 10/24h. Se registra en DI en esta historia; Story 3.3 lo inyecta en los handlers.
- `POST /api/v1/preview/logo`: endpoint anónimo, valida MIME type + magic bytes + tamaño (PNG/JPEG/SVG ≤5MB), almacena en MinIO bucket `ai-wear-previews/temp/{guid}/{sanitizedName}`, retorna `{ previewUrl, expiresAt }`. Rate limit: 10 req/min por IP.
- `IEmailSender`: añadir `SendVerificationEmailAsync`. `LoggingEmailSender`: implementar con logging a consola (placeholder de dev — SMTP/SendGrid es historia posterior).
- Frontend: `useAuthStore` con campo `emailVerified: boolean` inicializado desde claims JWT. Eliminar cualquier `user.id = 'guest_123'` o credencial hardcodeada.

## Boundaries & Constraints

**Always:**
- Token Redis consumido es eliminado inmediatamente — nunca reutilizable. Si no existe la clave Redis → `DomainException("EMAIL_VERIFICATION_TOKEN_INVALID")`.
- `RegisterCustomerCommandHandler`: el envío de email es fire-and-forget tolerante a fallos — un error de email no revierte el registro ni bloquea el JWT. El error se loguea como Warning.
- El claim `email_verified` en el JWT refleja el estado en el momento del login/refresh; no se modifica el token activo en tiempo real. TTL del access token es 60min — aceptable para MVP.
- `ResendVerificationEmailCommandHandler`: al generar nuevo token, el token anterior en Redis se invalida (DEL + SET nuevo). Máx 3 intentos por email en 15 min.
- `RedisAiRateLimiter.CheckAndIncrementAsync`: usa Lua script — `local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('EXPIRE', KEYS[1], 86400) end; return c`. Retorna -1 si `c > limit` antes del INCR (verifica primero: `if current >= limit return -1`). Clave: `rate_limit:ai:{userId}`, TTL 24h rolling.
- `POST /api/v1/preview/logo`: MIME type validado desde Content-Type del request AND desde magic bytes del archivo (no confiar solo en extensión). Formatos: `image/png` (magic: `89 50 4E 47`), `image/jpeg` (magic: `FF D8 FF`), `image/svg+xml` (magic: verificar `<svg` en primeros 512 bytes tras strip de BOM/whitespace).
- Preview files: no se crean registros en ninguna tabla de BD. El cleanup es responsabilidad de MinIO lifecycle policy (bucket `ai-wear-previews`, TTL 2h). El bucket debe existir al startup; crearlo si no existe.
- `RequireVerifiedEmail` policy: se DEFINE y REGISTRA en esta historia. NO se aplica a ningún endpoint en esta historia. Story 3.3 la usa en los endpoints de IA.
- AC-VERIFY-SCOPE: `VerifyEmailCommandHandler` solo actualiza al usuario cuyo `userId` coincide con el valor almacenado en Redis bajo el token — nunca toma userId de otro origen.

**Ask First:**
- Nada. Todos los edge-cases están definidos en la I/O Matrix.

**Never:**
- Implementar SMTP, SendGrid ni ningún proveedor real de email en esta historia.
- Almacenar tokens de verificación en la tabla `users` ni en ninguna otra tabla de BD — siempre Redis.
- Aceptar `tenant_id` de query string ni headers para el endpoint de preview anónimo.
- Guardar datos binarios del archivo en Redis — solo el mapeo `{token} → {userId}`.
- Emitir un nuevo JWT desde el endpoint de verify-email — el frontend obtiene el JWT actualizado llamando `POST /auth/refresh`.
- Implementar la aplicación del `RequireVerifiedEmail` policy en endpoints de IA — eso es Story 3.3.

## I/O & Edge-Case Matrix

| Scenario | Input / Estado | Comportamiento Esperado | Error Code |
|----------|---------------|------------------------|-----------|
| Registro nuevo | `POST /auth/register { email, password }` | 201; `user.EmailVerified=false`; token Redis TTL 24h; email logueado en consola; JWT con `email_verified: false` | — |
| Verificar email — token válido | `GET /auth/verify-email?token={válido}` | 200 `{ message: "Email verificado." }`; `user.EmailVerified=true`; `user.EmailVerifiedAt=now()`; token Redis eliminado | — |
| Verificar email — token expirado | `GET /auth/verify-email?token={expirado}` | 400 RFC 7807 | `EMAIL_VERIFICATION_TOKEN_INVALID` |
| Verificar email — token ya usado | `GET /auth/verify-email?token={consumido}` | 400 RFC 7807 | `EMAIL_VERIFICATION_TOKEN_INVALID` |
| Verificar email — token inexistente | `GET /auth/verify-email?token={garbage}` | 400 RFC 7807 | `EMAIL_VERIFICATION_TOKEN_INVALID` |
| Refresh post-verificación | `POST /auth/refresh` tras verificar email | JWT nuevo con `email_verified: true` | — |
| Reenviar verificación — 1er intento | `POST /auth/resend-verification { email }` | 200; token anterior invalidado; nuevo token Redis TTL 24h; email logueado | — |
| Reenviar verificación — límite excedido | 4to intento en 15 minutos | 429 RFC 7807 | `RESEND_LIMIT_EXCEEDED` |
| AI rate limiter — dentro del límite | `CheckAndIncrementAsync(userId)` cuando count < 10 | Retorna count actual (1–10); clave Redis tiene TTL ~24h | — |
| AI rate limiter — límite alcanzado | `CheckAndIncrementAsync(userId)` cuando count ≥ 10 | Retorna -1; clave Redis no se modifica | — |
| AI rate limiter — concurrente | 10 requests simultáneos para el mismo userId | Exactamente ≤10 retornan count positivo; resto retornan -1 (Lua garantiza atomicidad) | — |
| Preview logo — válido, anónimo | `POST /preview/logo` PNG 2MB sin JWT | 200 `{ previewUrl: string, expiresAt: ISO8601 }`; sin registro en BD | — |
| Preview logo — tipo inválido | `POST /preview/logo` con .PDF | 400 RFC 7807 | `INVALID_FILE_TYPE` |
| Preview logo — tamaño excedido | `POST /preview/logo` con PNG 6MB | 400 RFC 7807 | `FILE_TOO_LARGE` |
| Preview logo — magic bytes falseados | Archivo .exe con Content-Type image/png | 400 RFC 7807 | `INVALID_FILE_TYPE` |
| Preview logo — rate limit | Request 11 en 1 minuto, misma IP | 429 | — |

</frozen-after-approval>

## Code Map

**SharedKernel — nuevo:**
- `infrastructure/AiWearStudio.SharedKernel/Common/IAiRateLimiter.cs`
  - `Task<int> CheckAndIncrementAsync(Guid userId, CancellationToken ct = default)` — retorna count (1–N) o -1 si límite excedido

**BC Users.Core — modificados:**
- `modules/Users/AiWearStudio.Users.Core/Domain/Entities/User.cs`
  - Añadir: `public bool EmailVerified { get; private set; } = false;`
  - Añadir: `public DateTime? EmailVerifiedAt { get; private set; }`
  - Añadir método: `public void VerifyEmail() { EmailVerified = true; EmailVerifiedAt = DateTime.UtcNow; }`
- `infrastructure/AiWearStudio.SharedKernel/Common/IEmailSender.cs`
  - Añadir: `Task SendVerificationEmailAsync(string toEmail, string token, CancellationToken ct = default);`

**BC Users.Core — nuevos:**
- `modules/Users/AiWearStudio.Users.Core/Application/Services/IEmailVerificationTokenService.cs`
  - `Task<string> CreateTokenAsync(Guid userId, CancellationToken ct)` — genera token, invalida el anterior si existe, guarda en Redis TTL 24h
  - `Task<Guid?> ConsumeTokenAsync(string token, CancellationToken ct)` — retorna userId o null; elimina la clave Redis
  - `Task<bool> CheckAndIncrementResendAsync(string email, CancellationToken ct)` — retorna true si puede reenviar; false si límite excedido; incrementa counter
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/VerifyEmail/VerifyEmailCommand.cs` — `record(string Token) : ICommand<Unit>`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/VerifyEmail/VerifyEmailCommandHandler.cs`
  - Inyecta: `IEmailVerificationTokenService`, `IUserRepository`
  - Flujo: `ConsumeTokenAsync(token)` → si null: `DomainException("EMAIL_VERIFICATION_TOKEN_INVALID")` → `userRepository.FindByIdAsync(userId)` → `user.VerifyEmail()` → `userRepository.SaveChangesAsync()`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/VerifyEmail/VerifyEmailCommandValidator.cs` — Token no vacío ni whitespace
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/ResendVerificationEmail/ResendVerificationEmailCommand.cs` — `record(string Email) : ICommand<Unit>`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/ResendVerificationEmail/ResendVerificationEmailCommandHandler.cs`
  - Inyecta: `IEmailVerificationTokenService`, `IUserRepository`, `IEmailSender`
  - Flujo: `FindByEmailAsync(email)` → si no existe: silencioso (no revelar si email existe) → `CheckAndIncrementResendAsync(email)` → si false: `DomainException("RESEND_LIMIT_EXCEEDED")` → `CreateTokenAsync(userId)` → `SendVerificationEmailAsync(email, token)`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/ResendVerificationEmail/ResendVerificationEmailCommandValidator.cs` — Email válido (FluentValidation `EmailAddress()`)

**BC Users.Core — modificado:**
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/RegisterCustomer/RegisterCustomerCommandHandler.cs`
  - Inyectar adicionalmente: `IEmailVerificationTokenService`, `IEmailSender`
  - Después de `userRepository.SaveChangesAsync(ct)`: `var token = await tokenService.CreateTokenAsync(user.Id, ct)`; `_ = emailSender.SendVerificationEmailAsync(user.Email, token, ct)` (fire-and-forget — no await, atrapar excepción con logger.LogWarning)
  - JWT se emite igual que antes — `JwtTokenService` añade claim `email_verified: false` automáticamente desde `user.EmailVerified`

**BC Users.Infrastructure — modificados:**
- `modules/Users/AiWearStudio.Users.Infrastructure/Services/LoggingEmailSender.cs`
  - Implementar: `Task SendVerificationEmailAsync(string toEmail, string token, CancellationToken ct)` → `logger.LogInformation("VERIFICATION_EMAIL to={Email} token={Token}", toEmail, token); return Task.CompletedTask;`
- `modules/Users/AiWearStudio.Users.Infrastructure/Services/JwtTokenService.cs`
  - En el método de generación de access token, añadir claim: `new Claim("email_verified", user.EmailVerified.ToString().ToLower())`
  - El método de generación debe recibir el `User` completo (o un DTO que incluya `EmailVerified`) — verificar que ya tiene acceso a la entidad completa
- `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/UsersDbContext.cs`
  - En `OnModelCreating`, en la configuración de `User`: `b.Property(u => u.EmailVerified).HasColumnName("email_verified").HasDefaultValue(false);` + `b.Property(u => u.EmailVerifiedAt).HasColumnName("email_verified_at");`
- `modules/Users/AiWearStudio.Users.Infrastructure/DependencyInjection.cs`
  - Registrar: `services.AddScoped<IEmailVerificationTokenService, RedisEmailVerificationTokenService>();`
  - Registrar: `services.AddSingleton<IAiRateLimiter, RedisAiRateLimiter>();`
  - Nota: `IConnectionMultiplexer` debe estar registrado como Singleton a nivel de app (verificar si ya lo hace CatalogModule; si no, moverlo a `Program.cs` o registrarlo aquí si ConnectionString Users == Catalog Redis)

**BC Users.Infrastructure — nuevos:**
- `modules/Users/AiWearStudio.Users.Infrastructure/Services/RedisEmailVerificationTokenService.cs`
  - Inyecta: `IConnectionMultiplexer`
  - `CreateTokenAsync`: token = `Convert.ToHexString(RandomNumberGenerator.GetBytes(32))` (64 chars); clave activa del usuario: `email:verify:user:{userId}` → token anterior (para invalidar); luego SET `email:verify:{newToken}` → userId, EX 86400; SET `email:verify:user:{userId}` → newToken, EX 86400
  - `ConsumeTokenAsync`: GET `email:verify:{token}` → userId; DEL `email:verify:{token}`; DEL `email:verify:user:{userId}`; retorna userId parseado o null
  - `CheckAndIncrementResendAsync`: Lua: INCR `resend:limit:{email}` → si == 1: EXPIRE 900 → retorna count ≤ 3 = true, count > 3 = false
- `modules/Users/AiWearStudio.Users.Infrastructure/Services/RedisAiRateLimiter.cs`
  - Inyecta: `IConnectionMultiplexer`, `IOptions<AiRateLimiterOptions>` (default limit: 10, TTL: 86400)
  - Lua script: `local c = tonumber(redis.call('GET', KEYS[1]) or 0); if c >= tonumber(ARGV[1]) then return -1 end; local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end; return n`
  - `CheckAndIncrementAsync(userId)`: clave `rate_limit:ai:{userId}`; ejecuta script con limit y TTL
- Migración `AddEmailVerification`:
  - `ALTER TABLE users.users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;`
  - `ALTER TABLE users.users ADD COLUMN email_verified_at TIMESTAMPTZ NULL;`

**API — modificados:**
- `AiWearStudio.Api/Endpoints/AuthEndpoints.cs`
  - Añadir: `GET /api/v1/auth/verify-email?token={token}` → `VerifyEmailCommand(token)` → 200 `{ message: "Email verificado. Inicia sesión o refresca tu token para activar las herramientas de IA." }`
  - Añadir: `POST /api/v1/auth/resend-verification` con body `{ email: string }` → `ResendVerificationEmailCommand(email)` → 200 `{ message: "Si el email existe en el sistema, recibirás un nuevo enlace." }` (respuesta uniforme — no revelar si el email existe)
- `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs`
  - Añadir: `"EMAIL_VERIFICATION_TOKEN_INVALID"` → 400
  - Añadir: `"RESEND_LIMIT_EXCEEDED"` → 429
- `AiWearStudio.Api/Program.cs`
  - En `AddAuthorization`: añadir policy `"RequireVerifiedEmail"` con `RequireAuthenticatedUser().RequireClaim("email_verified", "true")`
  - Añadir: `app.MapPreviewEndpoints();`
  - Verificar que `IConnectionMultiplexer` está registrado como Singleton (si solo está en CatalogModule, moverlo a nivel app aquí)

**API — nuevo:**
- `AiWearStudio.Api/Endpoints/PreviewEndpoints.cs`
  - `POST /api/v1/preview/logo` — `[AllowAnonymous]`, acepta `IFormFile logo`
  - Validación: Content-Type debe ser `image/png`, `image/jpeg`, o `image/svg+xml`; leer primeros 512 bytes para verificar magic bytes; tamaño ≤ 5MB (5_242_880 bytes); errores: `INVALID_FILE_TYPE` → 400, `FILE_TOO_LARGE` → 400
  - Almacenamiento: generar `Guid previewId`; sanitizar nombre de archivo; subir a MinIO bucket `ai-wear-previews`, objeto `temp/{previewId}/{sanitizedFileName}`; retornar URL pública
  - Rate limiting por IP: usar `AspNetCoreRateLimit` (ya configurado en el proyecto) o middleware custom simple de Redis con clave `preview:rate:{ip}`, límite 10/60s
  - Response: `200 { previewUrl: string, expiresAt: DateTime.UtcNow.AddHours(2).ToString("o") }`
  - Nota de startup: verificar/crear bucket `ai-wear-previews` en MinIO al iniciar la app (en el bloque `IsDevelopment()` de Program.cs, junto a las migraciones)

**Frontend — modificado:**
- `useAuthStore` (Zustand store de autenticación del portal B2C)
  - Añadir campo `emailVerified: boolean` al estado de autenticación
  - Inicializar desde el claim JWT `email_verified` al hacer login o refresh: `emailVerified: payload.email_verified === 'true'`
  - Estado inicial (sin sesión): `{ user: null, accessToken: null, isAuthenticated: false, emailVerified: false }`
  - **NUNCA** `user.id = 'guest_123'` ni credenciales hardcodeadas — si existe en el prototipo, eliminarlo
  - El campo `emailVerified` se usa en el frontend para mostrar el banner "Confirma tu email para activar la IA →" cuando `isAuthenticated = true` y `emailVerified = false`

**Tests:**
- `tests/AiWearStudio.Users.Tests/Integration/EmailVerificationTests.cs` — 6 tests Testcontainers + Redis (usar el mismo patrón de `WebApplicationFactory` + `ContainerFixture` que los tests existentes)

## Tasks & Acceptance

**Execution:**
- [x] `User.cs` — añadir `EmailVerified`, `EmailVerifiedAt`, `VerifyEmail()`
- [x] `IEmailSender.cs` — añadir `SendVerificationEmailAsync`
- [x] `LoggingEmailSender.cs` — implementar `SendVerificationEmailAsync`
- [x] `IAiRateLimiter.cs` — nueva interfaz en SharedKernel
- [x] `IEmailVerificationTokenService.cs` — nueva interfaz en Users.Core
- [x] `VerifyEmailCommand.cs` + `VerifyEmailCommandHandler.cs` + `VerifyEmailCommandValidator.cs`
- [x] `ResendVerificationEmailCommand.cs` + `ResendVerificationEmailCommandHandler.cs` + `ResendVerificationEmailCommandValidator.cs`
- [x] `RegisterCustomerCommandHandler.cs` — inyectar y llamar token service + email sender (fire-and-forget)
- [x] `JwtTokenService.cs` — añadir claim `email_verified`
- [x] `RedisEmailVerificationTokenService.cs` — nueva implementación con Redis
- [x] `RedisAiRateLimiter.cs` — nueva implementación con Lua script
- [x] `UsersDbContext.cs` — configurar `email_verified` + `email_verified_at`
- [x] Migración `AddEmailVerification`
- [x] `Users.Infrastructure/DependencyInjection.cs` — registrar nuevos servicios
- [x] `Program.cs` — policy `RequireVerifiedEmail` + `MapPreviewEndpoints()` + bucket MinIO al startup
- [x] `AuthEndpoints.cs` — añadir `/verify-email` + `/resend-verification`
- [x] `GlobalExceptionMiddleware.cs` — añadir handlers `EMAIL_VERIFICATION_TOKEN_INVALID` + `RESEND_LIMIT_EXCEEDED`
- [x] `PreviewEndpoints.cs` — nuevo endpoint `POST /api/v1/preview/logo`
- [x] `useAuthStore` (frontend) — añadir `emailVerified`, eliminar `guest_123`
- [x] `EmailVerificationTests.cs` — 6 tests de integración

**Acceptance Criteria:**
- Dado `POST /auth/register { email, password }` exitoso, entonces el usuario en DB tiene `email_verified = false`, existe una clave Redis `email:verify:{token}` con TTL próximo a 86400s, el log contiene `"VERIFICATION_EMAIL"`, y el JWT retornado tiene claim `email_verified = "false"`.
- Dado token válido en Redis, cuando `GET /auth/verify-email?token={token}`, entonces `user.email_verified = true` en DB, `user.email_verified_at` tiene valor, la clave Redis fue eliminada, y el endpoint retorna 200.
- Dado token inexistente o expirado en Redis, cuando `GET /auth/verify-email?token={inválido}`, entonces el endpoint retorna 400 con código `EMAIL_VERIFICATION_TOKEN_INVALID`.
- Dado usuario con `email_verified = true` en DB, cuando `POST /auth/refresh` con refresh token válido, entonces el nuevo access token JWT tiene claim `email_verified = "true"`.
- Dado cuatro solicitudes de reenvío en 15 minutos para el mismo email, cuando el cuarto intento llega al handler, entonces el endpoint retorna 429 con código `RESEND_LIMIT_EXCEEDED`.
- Dado archivo PNG de 2MB sin JWT en el request, cuando `POST /api/v1/preview/logo`, entonces el endpoint retorna 200 con `previewUrl` no vacío y `expiresAt` con valor ~2h futuro, sin registro en BD.
- Dado 10 llamadas concurrentes a `RedisAiRateLimiter.CheckAndIncrementAsync` para el mismo userId (límite=10), entonces exactamente 10 retornan un valor positivo (1–10) y ninguna supera 10; cualquier llamada adicional retorna -1.

### Review Findings

**Decision-needed → resueltos:**
- [x] [Review][Patch] Registration resiliente ante fallo de Redis — try/catch en CreateTokenAsync; si Redis falla, retorna 201 igualmente; usuario puede usar /resend-verification [RegisterCustomerCommandHandler.cs:40]

**Patch — todos aplicados:**
- [x] [Review][Patch] CreateTokenAsync no es atómico — Lua script atómico (GET+DEL+SET+SET) [RedisEmailVerificationTokenService.cs:CreateTokenAsync]
- [x] [Review][Patch] SVG XSS almacenado — SVG rechazado completamente en preview anónimo para MVP [PreviewEndpoints.cs:ValidateFile]
- [x] [Review][Patch] stream.Position = 0 en stream no-seekable — copiado a MemoryStream [PreviewEndpoints.cs]
- [x] [Review][Patch] IP rate limit no funciona detrás de proxy — UseForwardedHeaders en Program.cs [Program.cs]
- [x] [Review][Patch] SanitizeFileName preserva extensión del cliente — extensión derivada de contentType validado [PreviewEndpoints.cs:SanitizeFileName]
- [x] [Review][Patch] ConsumeTokenAsync no es atómico — Lua script GET+DEL atómico [RedisEmailVerificationTokenService.cs:ConsumeTokenAsync]
- [x] [Review][Patch] Bucket MinIO no se crea en producción — creación movida fuera de IsDevelopment() [Program.cs]
- [x] [Review][Patch] MinIO config sin validación al startup — throw InvalidOperationException si MinIO:Endpoint vacío [Program.cs]
- [x] [Review][Patch] ResendVerification sin guard de email ya verificado — early-return si user.EmailVerified == true [ResendVerificationEmailCommandHandler.cs:28]
- [x] [Review][Patch] Rate limit de preview consumido aunque MinIO falle — catch en PutObjectAsync retorna 503 [PreviewEndpoints.cs]

**Deferred:**
- [x] [Review][Defer] Refresh token no persiste en DB/Redis [pre-existing Story 1.2] — pre-existing, pre-existente desde Story 1.2; no introducido por este diff
- [x] [Review][Defer] VerifyEmail silencioso si entidad no está tracked por EF Core [VerifyEmailCommandHandler.cs:Handle] — deferred, pre-existing; casi certero que es tracking dado que es un command handler; verificar UserRepository.FindByIdAsync
- [x] [Review][Defer] useAuthStore descarta refreshToken silenciosamente [useAuthStore.ts:login] — deferred, pre-existing; si tokens son httpOnly cookies, el frontend no necesita persistir el refreshToken; arquitectura a confirmar en Story auth hardening
- [x] [Review][Defer] ConnectionMultiplexer.Connect síncrono sin abortConnect=false [Program.cs] — deferred, pre-existing desde Story 2.1; añadir en hardening de infraestructura
- [x] [Review][Defer] Resend rate limit sin scope de tenant — posible agotamiento cruzado B2C/B2B si mismo email existe en ambos; no aplica para MVP con email único por sistema
- [x] [Review][Defer] Usuarios existentes con email_verified=false post-migración — RequireVerifiedEmail no se aplica en esta historia; Story 3.3 debe eximir a usuarios internos (PlatformAdmin/WorkshopAdmin/Operator) de la política

## Design Notes

**Redis compartido entre módulos:** `IConnectionMultiplexer` debe registrarse como Singleton a nivel app (`Program.cs`), no dentro de cada módulo por separado. Si `CatalogModule.AddCatalogModule()` actualmente lo registra, moverlo a `Program.cs` antes del `AddCatalogModule()` y pasar la instancia. Ambos Users y Catalog necesitan el mismo Singleton.

**Clave de token activo por usuario (`email:verify:user:{userId}`):** Esta clave secundaria permite invalidar el token anterior cuando se hace resend. Sin ella, múltiples tokens podrían estar activos simultáneamente. Al hacer resend: DEL el token anterior (si existe) → SET nuevo token. Al verificar: DEL clave principal + DEL clave de usuario.

**JWT claim `email_verified` y re-login:** El claim en el JWT solo se actualiza cuando el usuario hace login o refresh. El access token tiene TTL 60min. Flujo de usuario típico: verifica email desde su inbox (puede pasar en segundos si está esperando) → vuelve al portal → `POST /auth/refresh` → JWT nuevo con `email_verified: true` → acceso a IA desbloqueado. El frontend puede llamar `/auth/refresh` automáticamente después de la verificación exitosa mostrando un toast "¡Email verificado! Activando acceso a IA...".

**Preview endpoint y MinIO:** Usar el mismo MinIO ya configurado en `docker-compose.yml`. Al startup en `IsDevelopment()`, añadir creación de bucket `ai-wear-previews` (igual que se crean schemas de migración). La lifecycle policy de 2h en MinIO no es obligatoria para el MVP — los archivos huérfanos son cleanup posterior; lo importante es que el endpoint funciona y retorna URLs válidas.

**Magic bytes validation para SVG:** SVG es XML — no tiene magic bytes binarios fijos. Leer los primeros 512 bytes como UTF-8 (ignorando BOM), hacer `.TrimStart()`, verificar que contiene `<svg` (case-insensitive). Content-Type debe ser `image/svg+xml`. Rechazar archivos que pasen como SVG pero contengan `<script>` (XSS básico).

**`LoggingEmailSender` para dev:** El token de verificación se loguea a consola. El developer llama `GET /auth/verify-email?token={copiar_del_log}` manualmente para verificar. En producción, `LoggingEmailSender` debe ser reemplazado por `SendGridEmailSender` (historia separada — Story 6.x o como parte de preparación para producción).

**`IAiRateLimiter` en esta historia:** `RedisAiRateLimiter` se implementa y registra en DI aquí. Story 3.3 inyecta `IAiRateLimiter` en `GenerateImageCommandHandler` y llama `CheckAndIncrementAsync(userId)` antes de llamar a Gemini. Si retorna -1 → 429. Si retorna positivo → procede. Esto evita refactor en Story 3.3.

**Usuarios existentes y email_verified:** Los usuarios ya creados (Seeds de platform_admin, workshop_admin de pruebas) tendrán `email_verified = false` tras la migración. Para operaciones de desarrollo, hacer login y llamar `/verify-email` con el token del log, o actualizar directamente en BD de desarrollo: `UPDATE users.users SET email_verified = true WHERE email = 'admin@...';`

## Verification

**Commands:**
- `dotnet build AiWearStudio.slnx` — expected: 0 errores, 0 warnings
- `dotnet test tests/AiWearStudio.Users.Tests --filter Category=Integration` — expected: ~39 tests pasan (~33 anteriores + 6 nuevos AC-EMAIL-*)

## Dev Agent Record

### Implementation Plan
Implementación secuencial de 20 tareas. Redis movido de CatalogModule a nivel app (Program.cs) como Singleton compartido. Catalog DI actualizado para no registrar IConnectionMultiplexer. Minio SDK añadido al Api.csproj. StackExchange.Redis añadido a Users.Infrastructure.csproj. Microsoft.Extensions.Logging.Abstractions añadido a Users.Core.csproj.

### Debug Log
- Error CS0234: Microsoft.Extensions.Logging no referenciado en Users.Core → añadido `Microsoft.Extensions.Logging.Abstractions 9.*` al csproj
- Error CS1503: LuaScript.Prepare() no compatible con ScriptEvaluateAsync directamente → reemplazado con scripts string inline
- Error CS0121: Guid.TryParse ambiguo con RedisValue en .NET 10 → cast explícito a `(string?)`
- Error NU1605: Package downgrade de Microsoft.Extensions.Logging.Abstractions en tests → cambiado a `10.*`
- Error CS0246: JwtSettings no encontrado en tests → añadido `using AiWearStudio.Users.Infrastructure;`

### Completion Notes
- Todas las 20 tareas implementadas y verificadas
- Build: 0 errores, 0 warnings
- Tests: 39 passed (33 anteriores + 6 nuevos AC-EMAIL-01..06) — 0 failed
- `RequireVerifiedEmail` policy definida y registrada en Program.cs; Story 3.3 la aplica a endpoints IA
- `IAiRateLimiter` / `RedisAiRateLimiter` implementados; Story 3.3 inyecta y usa
- Preview endpoint anónimo: valida PNG magic bytes (89 50 4E 47), JPEG (FF D8 FF), SVG (<svg en primeros 512 bytes + rechazo de <script>); rate limit 10/min por IP vía Redis Lua
- `useAuthStore.ts` creado con `emailVerified` inicializado desde claim JWT; `guest_123` eliminado de `useStore.ts`

## File List
**Backend — modificados:**
- `src/backend/modules/Users/AiWearStudio.Users.Core/Domain/Entities/User.cs`
- `src/backend/infrastructure/AiWearStudio.SharedKernel/Common/IEmailSender.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Services/LoggingEmailSender.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/RegisterCustomer/RegisterCustomerCommandHandler.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Services/JwtTokenService.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Persistence/UsersDbContext.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/DependencyInjection.cs`
- `src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/DependencyInjection.cs`
- `src/backend/AiWearStudio.Api/Program.cs`
- `src/backend/AiWearStudio.Api/Endpoints/AuthEndpoints.cs`
- `src/backend/AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs`
- `src/backend/AiWearStudio.Api/AiWearStudio.Api.csproj`
- `src/backend/AiWearStudio.Api/appsettings.json`
- `src/backend/AiWearStudio.Api/appsettings.Development.json`
- `src/backend/modules/Users/AiWearStudio.Users.Core/AiWearStudio.Users.Core.csproj`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/AiWearStudio.Users.Infrastructure.csproj`
- `src/backend/tests/AiWearStudio.Users.Tests/AiWearStudio.Users.Tests.csproj`
- `docker-compose.yml`

**Backend — nuevos:**
- `src/backend/infrastructure/AiWearStudio.SharedKernel/Common/IAiRateLimiter.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Services/IEmailVerificationTokenService.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/VerifyEmail/VerifyEmailCommand.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/VerifyEmail/VerifyEmailCommandHandler.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/VerifyEmail/VerifyEmailCommandValidator.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/ResendVerificationEmail/ResendVerificationEmailCommand.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/ResendVerificationEmail/ResendVerificationEmailCommandHandler.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Core/Application/Commands/ResendVerificationEmail/ResendVerificationEmailCommandValidator.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Services/RedisEmailVerificationTokenService.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Services/RedisAiRateLimiter.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Migrations/20260512171223_AddEmailVerification.cs`
- `src/backend/modules/Users/AiWearStudio.Users.Infrastructure/Migrations/20260512171223_AddEmailVerification.Designer.cs`
- `src/backend/AiWearStudio.Api/Endpoints/PreviewEndpoints.cs`
- `src/backend/tests/AiWearStudio.Users.Tests/Integration/EmailVerificationTests.cs`

**Frontend — modificados:**
- `src/frontend/store/useStore.ts`

**Frontend — nuevos:**
- `src/frontend/store/useAuthStore.ts`

## Change Log
- 2026-05-12: Story 1.7 implementada completamente — verificación de email, preview anónimo de logo y guard de IA. 20 tareas completadas, 39/39 tests pasan.
- 2026-05-12: Code review aplicado — 11 patches resueltos: atomicidad Redis (CreateTokenAsync + ConsumeTokenAsync via Lua), registration resiliente ante Redis caído, SVG rechazado en preview, MemoryStream para streams no-seekables, ForwardedHeaders middleware, extensión de archivo desde contentType, bucket MinIO en todos los entornos, validación MinIO al startup, guard EmailVerified en Resend, 503 explícito para fallos de MinIO.

## Status
done
