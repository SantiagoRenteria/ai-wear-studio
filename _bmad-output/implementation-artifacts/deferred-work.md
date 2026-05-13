# Deferred Work

Issues found during review but explicitly out of scope for the story that surfaced them. Revisit in targeted hardening or future stories.

---

## Cache Stampede / Thundering Herd
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `GetCatalogGarmentsQueryHandler.cs`
**Detail:** Concurrent requests to a cold cache trigger multiple simultaneous DB reads. Under traffic spikes or TTL expiry waves, N requests fire N identical queries. Consider a distributed lock (Redis SETNX) or stale-while-revalidate pattern.

---

## Cache Invalidation Exception Propagates out of SaveChangesAsync
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `CatalogDbContext.cs:SaveChangesAsync`
**Detail:** If `cache.InvalidateGarmentsAsync` throws after a successful DB commit, the exception propagates to the caller, which may retry and produce a duplicate write. A `try-catch` around the invalidation loop (logging the error and continuing) would make the operation resilient. Skipped because the spec's design notes show this code without exception handling.

---

## Redis Integration Tests
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `CatalogQueryTests.cs`
**Detail:** `Testcontainers.Redis` is incompatible with `Testcontainers.PostgreSql 4.11.0` (MissingMethodException on ContainerConfiguration). Until the version conflict is resolved, `RedisCatalogCache` (JSON corruption path, TTL behavior, concurrent invalidation) is untested at the integration level. Track Testcontainers.Redis release compatible with 4.11.x.

---

## Cache Invalidation for Global Entity Changes
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `CatalogDbContext.cs:SaveChangesAsync`
**Detail:** Only `TenantGarmentStatus` changes trigger cache invalidation. Admin mutations to `Garment`, `GarmentColorVariant`, `PrintZone`, etc. leave the cache stale until TTL expires. Story 2.3 (admin endpoints) should extend the SaveChangesAsync override to detect changes to global catalog entities and broadcast invalidation to all active tenant keys.

---

## From Story 1.4 Scope Split

| # | Finding | Severity | Source Story | Suggested Story |
|---|---------|----------|--------------|-----------------|
| D-23 | **Suspensión de compañías (Story 1.4b)**: `SuspendCompany` command + `ITenantAccessRevocationService` en SharedKernel (implementado en Users.Infrastructure, revoca todos los refresh tokens del tenant via join users+refresh_tokens por TenantId) + `CompanySuspensionMiddleware` (IServiceScopeFactory, lee claim `tenant_id`, busca Company, si `PlanStatus=Suspended` → 403 RFC 7807). Split de Story 1.4 por tamaño (~900 tokens). | High | 1.4 scope split | Story 1.4b |

## From Story 1.4b Review

| # | Finding | Severity | Source Story | Suggested Story |
|---|---------|----------|--------------|-----------------|
| D-24 | **Sin caché en CompanySuspensionMiddleware**: Cada request autenticada con `tenant_id` genera un SELECT a CompanyAdminDbContext. Con alto tráfico, agregar caché distribuida (Redis) con TTL ≤ TTL del access token (60 min) y evict on suspend. | Medium | 1.4b | Hardening de multi-tenancy |
| D-25 | **Revocación de tokens no atómica con suspensión**: CompanyAdminDbContext y UsersDbContext son transacciones separadas. Si `TenantAccessRevocationService` falla, el tenant está suspendido pero los tokens permanecen válidos hasta su TTL (≤ 60 min). Aceptado por diseño — el middleware bloquea igual. Documentar SLA. | Low | 1.4b | Hardening de infraestructura |
| D-26 | **`Company.Suspend()` sobreescribe `ActivatedBy/ActivatedAt`**: Semánticamente incorrecto — estos campos representan la activación del plan, no la suspensión. Agregar `SuspendedBy` (Guid?) y `SuspendedAt` (DateTime?) si se requiere auditoría granular de suspensiones. | Low | 1.4b | Epic de auditoría |
| D-27 | **Sin test HTTP para CompanySuspensionMiddleware**: AC-SUSPEND-E2E prueba handler + service directo, no el pipeline HTTP. Agregar test de integración con `WebApplicationFactory` que envíe request con JWT de tenant suspendido y afirme respuesta 403 RFC 7807. | Medium | 1.4b | Hardening de tests |
| D-28 | **Handler COMPANY_SUSPENDED muerto en GlobalExceptionMiddleware**: El middleware detecta PlanStatus=Suspended antes de llegar al handler — la excepción `DomainException("COMPANY_SUSPENDED:...")` nunca se lanza desde un handler. El `catch` en GlobalExceptionMiddleware es dead code. Evaluar si se elimina o se mantiene como safety net. | Low | 1.4b | Refactor de exception handling |
| D-29 | **Sin test de arquitectura para aislamiento CompanyAdmin→Users**: No hay ArchUnit/.NET Architect test que prevenga regresiones de la regla "CompanyAdmin no puede referenciar Users.Core ni Users.Infrastructure". | Low | 1.4b | Hardening de arquitectura |

## From Story 1.5 Scope Split

| # | Finding | Severity | Source Story | Suggested Story |
|---|---------|----------|--------------|-----------------|
| D-30 | **Invitación de Usuarios Internos (Story 1.5b)**: tabla `user_invitations` (token UUID, tenant_id, role, invited_by, expires_at 48h, consumed_at), estado `pending_activation` en User, `POST /api/v1/invitations` (platform_admin → workshop_admin; workshop_admin → operator propio tenant), `POST /api/v1/auth/accept-invitation` (consume token, activa cuenta, retorna JWT), email via Notifications module, AC-RBAC-INVITE-SCOPE (workshop_admin no puede invitar fuera de su tenant → 403). Split de Story 1.5 por tamaño. | High | 1.5 scope split | Story 1.5b |
| D-31 | **Límite Demo de IA (20 generaciones totales)**: Enforcement de cuota Demo en el tier de generación IA. Requiere DesignEngine BC + contador de uso en `company_feature_flags` o tabla dedicada. Sin infraestructura en Epic 1 para contarlo. Deferir a Epic 3. | High | 1.5 scope split | Story 3.3 o adyacente |

## From Story 1.5a Review

| # | Finding | Severity | Source Story | Suggested Story |
|---|---------|----------|--------------|-----------------|
| D-32 | **Race condition en `SetFlagAsync`**: Read-modify-write sin concurrencia optimista — dos requests simultáneas sobre la misma `(companyId, featureKey)` pueden colisionar en el insert. Agregar `[ConcurrencyCheck]` o manejo de `DbUpdateConcurrencyException`. | Low | 1.5a | Hardening de infraestructura |
| D-33 | **`SeedForPlanAsync` no atómico con creación de compañía**: La compañía persiste en un `SaveChangesAsync` y los flags en otro. Si la app muere entre ambos, la compañía queda sin flags. El guard de idempotencia en SeedForPlanAsync permite re-seed manual, pero no hay recovery automático. | Low | 1.5a | Hardening de infraestructura |
| D-34 | **Clock abstraction en entidades de dominio**: `DateTime.UtcNow` llamado directamente en `CompanyFeatureFlag.Create` y `SetEnabled`. Dificulta tests determinísticos de timestamps. Inyectar `TimeProvider` (disponible en .NET 8+). | Low | 1.5a | Hardening de tests |

## From Story 1.2 Scope Split

---

## CancellationToken Passthrough in Redis Operations
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `RedisCatalogCache.cs`
**Detail:** `ICatalogCache` methods accept `CancellationToken` but `IDatabase` (StackExchange.Redis 2.x) does not expose CT overloads on `StringGetAsync`, `StringSetAsync`, `KeyDeleteAsync`. Operations cannot be cancelled mid-flight. When StackExchange.Redis adds CT support or if upgrading to a future version, wire the tokens through.

---

## From code review of spec-1-7 (2026-05-12)

- **Refresh token no persiste en DB/Redis** — `RegisterCustomerCommandHandler` genera `refreshToken` pero no lo almacena; cualquier refresh requiere que el token esté en BD o Redis; pre-existing desde Story 1.2, no introducido por Story 1.7. Resolver en hardening de auth.
- **VerifyEmail silencioso si entidad no tracked** — `VerifyEmailCommandHandler` llama `user.VerifyEmail()` + `SaveChangesAsync`; si `FindByIdAsync` usa `AsNoTracking`, la modificación no persiste. Verificar `UserRepository.FindByIdAsync` usa tracking para comandos.
- **useAuthStore descarta refreshToken** — el parámetro `_refreshToken` en `login()` es descartado; si los tokens viajan por httpOnly cookies el frontend no necesita almacenarlo, pero si viajan en body se pierde. Confirmar estrategia final de cookies vs body en Story auth hardening.
- **ConnectionMultiplexer.Connect síncrono** — `ConnectionMultiplexer.Connect(redisConn)` en `Program.cs` es síncrono y no tiene `abortConnect=false`; si Redis no está disponible al startup, la app no arranca. Pre-existing desde Story 2.1. Resolver en hardening de infraestructura.
- **Resend rate limit sin scope de tenant** — clave `resend:limit:{email}` es global; si un email existe como Customer B2C y usuario interno B2B en distintos tenants comparten el mismo contador. No aplica para MVP. Evaluar al implementar multi-tenant strict email reuse.
- **Usuarios existentes con email_verified=false post-migración** — todos los usuarios previos (PlatformAdmin, WorkshopAdmin, Operator) tendrán `email_verified=false` tras la migración. `RequireVerifiedEmail` no se aplica en Story 1.7, pero Story 3.3 debe implementar exención de rol para usuarios internos o flujo alternativo de verificación para invitados.

---

## Tenant Claim Silent Failure Observability
**Surfaced in:** Story 2.1 — Backend del Catálogo con Seeds del Prototipo
**File:** `CatalogEndpoints.cs:TryGetTenantId`
**Detail:** When `tenant_id` JWT claim is absent or non-GUID, the endpoint returns 401 but logs nothing. Add a structured log entry (`catalog.auth.invalid_tenant_claim path={Path}`) to aid debugging of auth integration issues.

---

## Deferred from: code review of spec-3-2 (2026-05-13)

- **`fetch` en `assetsApi.ts` sin timeout** — `uploadAsset` no establece `AbortController` + timeout; si el backend no responde, `setUploading(true)` nunca se limpia. Pre-existing pattern del proyecto; resolver en hardening de frontend o cuando se adopte axios/ky globalmente. [`assetsApi.ts`]
- **Endpoint POST `/assets` sin atributo `[Authorize]`** — El endpoint usa `TryGetTenantAndUser` para verificar autenticación (efectivamente un 401 manual), pero no está decorado con `[Authorize]`. Funcionalmente equivalente para el MVP; mejora arquitectural para consistencia y futuro soporte de middleware de auditoría. [`DesignEngineEndpoints.cs`]
