# Epic 1 Context: Identidad, Acceso y Gestión de Plataforma

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Establecer la infraestructura de identidad, seguridad y multi-tenancy que hace posible toda la plataforma. Al completar el epic, cualquier usuario puede registrarse, autenticarse y operar con el rol correcto; un platform_admin puede crear talleres y asignar planes; un workshop_admin puede configurar su compañía e invitar operarios; y el aislamiento de datos por tenant está activo y validado con tests de integración contra DB real. Este epic es el prerequisito bloqueante de todos los demás — ningún otro BC puede avanzar sin él.

## Stories

- Story 1.1: Fundación Arquitectónica y Registro de Cliente
- Story 1.2: Autenticación Completa — Login, Tokens y Recuperación
- Story 1.3: Revocación de Acceso y Suspensión de Usuarios
- Story 1.4: Gestión de Compañías, Planes y Audit Trail
- Story 1.5: Planes, Feature Flags e Invitación de Usuarios Internos
- Story 1.6: Configuración del Taller

## Requirements & Constraints

**Autenticación y RBAC (FR1–FR8, FR40–FR44):**
- Registro público para clientes (`customer`); usuarios internos solo por invitación con token de 48h.
- Login retorna access token (TTL ≤ 60 min) + refresh token rotativo. Refresh token vive en tabla `refresh_tokens`; rotación en cada uso; eliminación en logout o desactivación.
- Recuperación de contraseña: link de un solo uso (TTL 1h); respuesta 200 independientemente de si el email existe.
- Un mismo email no puede ser `customer` Y usuario interno simultáneamente — enforceado con índices parciales en DB (`uix_email_b2c`, `uix_email_b2b`); violación retorna 409.
- Revocación inmediata: desactivar usuario elimina todos sus refresh tokens; exposición máxima = TTL del access token vigente (≤ 60 min).
- Suspender compañía: todos los refresh tokens del tenant eliminados; rutas retornan 403 excepto soporte; pedidos activos quedan congelados en estado actual.

**Multi-tenancy:**
- `tenant_id` en todas las tablas de dominio desde el primer deploy.
- `HasQueryFilter` global en cada `DbContext` — opt-out explícito, nunca opt-in por repositorio.
- Tres ciclos de vida de `ITenantContext`: HTTP (desde JWT), background job (parámetro explícito del job, nunca inferido de HTTP), platform_admin (`RequiresTenantFilter = false`).
- Cross-tenant: operario de Tenant A accediendo recurso de Tenant B → **404**, no 403 (AC-RBAC-CROSS-TENANT).
- JWT sin `tenant_id` Y sin `scope: "platform"` → `SecurityException` inmediata en middleware.

**Roles y JWT claims:**
- `customer`: `{ sub, role: "customer" }` sin `tenant_id`.
- Usuarios internos: `{ sub, tenant_id, role: "operator"|"workshop_admin" }`.
- Platform admin: `{ sub, scope: "platform", role: "platform_admin" }` — acceso cross-tenant.

**Seguridad (NFR-SEC-01–08):**
- HTTPS/TLS 1.2+ obligatorio; sin endpoints HTTP en producción.
- Contraseñas con bcrypt cost ≥ 12.
- Secrets (Gemini API key, DB credentials) en variables de entorno; nunca en código ni en `appsettings.json`.
- Logs de auditoría para cambios de plan, acciones de platform_admin y actualizaciones de feature flags.
- Errores en formato RFC 7807 (`application/problem+json`) en todos los endpoints.

**Compañías y planes:**
- Entidad `Company`: id (UUID), name, slug (único), plan (Demo|SaaS|LicenciaPermanente), plan_status (Active|Suspended|Expired|Trial), trial_ends_at, activated_by, activated_at, created_at, settings (jsonb).
- `CompanyFeatureFlags`: (tenant_id, feature_key) PK, enabled bool, updated_at, updated_by — siempre accedido vía `IFeatureFlagService`, nunca directo desde el dominio.
- Plan Demo: 20 generaciones IA totales (no mensuales). SaaS/LP: pool mensual configurable.
- Todo cambio de plan registrado en `plan_audit_log` con admin_id, planes anterior/nuevo, timestamp y motivo (FR44).
- Seed inicial: tenant_id = 1, cuenta platform_admin configurada por variables de entorno.

**Integridad de datos (NFR-INT-06):** RFC 7807 distingue errores de validación (4xx con detalle de campo) de errores de infraestructura (5xx genérico).

## Technical Decisions

**Arquitectura — Clean Architecture Híbrida (19 proyectos):**
- BC `Users` y BC `CompanyAdmin` son los dos bounded contexts de este epic.
- `Users` = identity pura (autenticación, JWT, roles, invitaciones, revocación). **No conoce tenants.**
- `CompanyAdmin` = tenant-membership (Companies, planes, feature flags, audit trail, relación usuario↔tenant).
- `Users` tiene 2 proyectos (`.Core` + `.Infrastructure`) — auth es transversal y sensible.
- `CompanyAdmin` arranca con 1 proyecto (carpetas internas Domain/Application/Infrastructure); escala a 2 si crece.
- `SharedKernel` no tiene dependencias salientes. `BC.Core` → solo SharedKernel. `BC.Infrastructure` → BC.Core + SharedKernel + NuGet. Nunca BC.Core → otro BC.Core.

**JWT custom sin ASP.NET Identity:**
- `PasswordHasher<T>` de ASP.NET Core. Sin ASP.NET Identity (sus tablas no encajan con multi-tenant custom).
- Algoritmo HS256, clave 256+ bits en variables de entorno. Configuración vía `IOptions<JwtSettings>`.

**Multi-tenancy — implementación:**
- `ITenantContext` en `SharedKernel/Common/`. Resuelto desde JWT claim en HTTP requests.
- `IStartupFilter` de validación en startup: detecta Singletons que capturen `ITenantContext` directamente y lanza `InvalidOperationException` al iniciar (captive dependency risk — falla en startup, no en runtime).
- `HasQueryFilter` aplica `WHERE tenant_id = @currentTenant` AND `WHERE deleted_at IS NULL` (donde aplica).

**MediatR Pipeline (orden obligatorio):**
```
Request → IdempotencyBehavior → LoggingBehavior → ValidationBehavior → Handler
```
`IdempotencyBehavior` primero: si el request ya fue procesado retorna resultado cacheado desde Redis sin loguear ni validar.

**Soft-delete selectivo (D1 — debe decidirse antes de la primera migración):**
- `deleted_at` en: Orders, DesignSnapshot, Users.
- Hard-delete en: Catalog y entidades de configuración.

**Testcontainers obligatorio antes de Sprint 1:**
- `docker-compose.test.yml` + suite AC-RBAC-CROSS-TENANT, AC-RBAC-EMAIL-CONFLICT, AC-RBAC-ADMIN-BYPASS, AC-RBAC-INVITE-SCOPE, AC-RBAC-SUSPENSION.
- Tests de integración contra DB real — no mocks. Ningún otro BC puede avanzar sin este prerequisito.

**Docker Compose stack (desarrollo):**
```
postgres:17-alpine  — schemas por BC
redis:7-alpine      — caché Catalog + IRateLimitPolicy
minio/minio         — blob storage con script init-buckets.sh
```

**Naming DB:** snake_case universal. PKs: UUID con `gen_random_uuid()`. Índices: `ix_{tabla}_{col}` / `ux_{tabla}_{col}`. EF Core usa `UseSnakeCaseNamingConvention()`.

**`IRateLimitPolicy` interface:** definida en `SharedKernel/Common/` en Sprint 1 aunque la implementación Redis llegue en el sprint de DesignEngine (ARCH-05). No se usa en Epic 1 pero el contrato debe existir para que NetArchTest valide la dirección de dependencias.

**NetArchTest:** `AiWearStudio.Architecture.Tests` enforcea dirección de dependencias desde Sprint 1.

## Cross-Story Dependencies

Story 1.1 es el gate de todo el epic: hasta que la infraestructura (scaffolding, Docker Compose, MediatR pipeline, Testcontainers, índices parciales, HasQueryFilter) esté en pie y los tests AC-RBAC-CROSS-TENANT pasen, ninguna otra story puede iniciarse.

- Story 1.2 requiere 1.1 (tabla `refresh_tokens`, endpoints de auth funcionales).
- Story 1.3 requiere 1.2 (flujo de revocación opera sobre tokens activos).
- Story 1.4 requiere 1.1 (BC CompanyAdmin necesita infraestructura base + seeds de tenant inicial).
- Story 1.5 requiere 1.4 (feature flags y lógica de invitación dependen de que Companies exista).
- Story 1.6 requiere 1.4 (configuración del taller opera sobre el registro Company creado en 1.4).

Stories 1.2 y 1.4 pueden ejecutarse en paralelo una vez completada 1.1. Stories 1.3, 1.5 y 1.6 pueden paralelizarse entre sí una vez completados sus prerrequisitos respectivos.
