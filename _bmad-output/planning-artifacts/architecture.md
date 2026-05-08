---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-05-07'
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/product-brief-ai-wear-studio-distillate.md"
  - "docs/architecture.md"
  - "docs/data-models.md"
  - "docs/api-contracts.md"
  - "docs/component-inventory.md"
  - "docs/project-overview.md"
  - "docs/development-guide.md"
workflowType: 'architecture'
project_name: 'ai-wear-studio'
user_name: 'Santiago'
date: '2026-05-07'
---

# Architecture Decision Document — AI Wear Studio

_Este documento se construye de forma colaborativa paso a paso. Las secciones se agregan a medida que tomamos decisiones arquitectónicas juntos._

---

## Project Context Analysis

### Resumen del Proyecto

AI Wear Studio es una plataforma web **brownfield** de personalización textil con dos portales diferenciados (B2C cliente + B2B taller) sobre un backend .NET 10 monolito modular. El prototipo React 19 + Konva tiene lógica de negocio validada que se porta — no se reescribe. El backend es nuevo en su totalidad.

**Escala y complejidad:** Media-alta. El canvas de diseño (Konva) es el componente más complejo y ya está implementado en el prototipo. La complejidad del backend proviene del modelo multi-tenant, la transacción atómica del submit, y la gestión asíncrona de IA.

---

### Análisis de Requisitos Funcionales

**54 FRs organizados en 8 áreas de capacidad:**

| Área | FRs | Implicación arquitectónica principal |
|------|-----|--------------------------------------|
| Autenticación y RBAC (FR1–FR8) | 8 | JWT stateless + índices parciales B2C/B2B + revocación inmediata |
| Catálogo de Prendas (FR9–FR13) | 5 | BC `Catalog` — datos migrados desde prototipo como seeds SQL |
| Herramientas de Diseño (FR14–FR23b) | 11 | Canvas 100% frontend (Konva) + proxy Gemini en backend |
| Pedidos y Checkout (FR24–FR31b) | 9 | Transacción ACID atómica: DesignSnapshot + ProductionQueue |
| Cola de Producción (FR32–FR36b) | 6 | BC `ProductionQueue` — portal taller con estado actualizable |
| Notificaciones (FR37–FR39b) | 4 | `INotificationService` — SMS Twilio en Fase 1, extensible |
| Company Admin (FR40–FR45c) | 8 | Módulo `CompanyAdmin` — plans, feature flags, audit trail |
| Modo Presencial (FR46–FR48) | 3 | Flujo presencial → misma cola que digital; UI tablet-first |

**Transacciones críticas que definen la arquitectura:**

1. **Submit de pedido:** `DesignSnapshot` (write-once) + entrada en `ProductionQueue` en una ACID atómica. Si falla cualquiera, ambas revierten. Este es el invariante más importante del sistema y el sostén técnico del Zero-Reinterpretation Guarantee.
2. **Idempotencia del submit:** Header `Idempotency-Key` + tabla `ProcessedRequests` previenen pedidos duplicados en reintentos de red.

> ⚠️ **Decisión pendiente (Party Mode — Winston):** Con múltiples `DbContext` en EF Core (`DesignEngineDbContext` y `ProductionQueueDbContext` en schemas separados), la transacción atómica cross-schema requiere una estrategia explícita. PostgreSQL lo soporta en la misma conexión, pero EF Core con múltiples DbContext no lo garantiza out-of-the-box. Esta decisión debe documentarse antes del Sprint de Orders.

---

### Análisis de Requisitos No Funcionales

**41 NFRs en 8 categorías — los que más impactan la arquitectura:**

- **Performance:** API CRUD P95 < 500ms → índices diseñados desde el schema inicial. Generación IA P99 < 30s + hard timeout 45s → **Gemini calls obligatoriamente asíncronos** (no bloquear hilo HTTP). Canvas rendering < 100ms/interacción → canvas permanece 100% cliente (Konva + Zustand local).
- **Seguridad:** AC-RBAC-CROSS-TENANT: operario de Tenant A solicitando recurso de Tenant B → **404** (no 403). `HasQueryFilter` global en EF Core para tenant isolation — opt-out explícito, no opt-in. JWT TTL ≤ 60 min + refresh rotation + revocación inmediata.
- **Confiabilidad:** Uptime 99.0% Fase 1 / 99.5% Fase 2. Auto-save canvas cada 5s (Zustand → API periodic sync en Fase 2; localStorage en Fase 1).
- **Accesibilidad:** WCAG 2.1 AA — obligación legal en Argentina (Ley 26.653).
- **Observabilidad:** `GET /health` < 200ms con dependency checks (DB + S3 + Gemini reachability), logs JSON estructurados, métricas P95/P99, billable events por tenant.
- **Errores:** RFC 7807 `application/problem+json` como contrato de errores en todos los endpoints.

---

### Contexto Brownfield — Activos del Prototipo

**Lo que se porta directamente:**

| Activo del prototipo | Acción en la nueva arquitectura |
|---------------------|--------------------------------|
| Canvas Konva (CanvasEngine.tsx, ~22 componentes) | Port directo; sigue 100% cliente en Zustand |
| Catálogo (catalog.ts) — 10 prendas, 23 zonas, 5 técnicas | Migrar como seeds SQL en BC `Catalog` |
| PrintQualityValidator (printQuality.ts) | Port al frontend; log del evento vía API; backend debe reimplementar umbrales para server-side validation (evitar bypass vía requests directas) |
| BG Removal (bgRemoval.ts) — flood-fill BFS + Gemini fallback | Port al frontend; Gemini call proxied por backend. ⚠️ Benchmark obligatorio en 4K PNG antes del sprint de DesignEngine — si BFS > 2s P95, invertir la lógica de fallback (Gemini primero) |
| AddressValidation (addressValidation.ts) | Port directo al frontend |
| Layer model (types.ts) | Fuente de verdad para el schema del `DesignSnapshot` |

**Lo que se reemplaza o migra al backend:**

| Elemento del prototipo | Solución arquitectónica |
|-----------------------|------------------------|
| API key Gemini en bundle del cliente | Proxy backend: `POST /api/ai/generate`, `/api/ai/remove-bg`, `/api/ai/try-on` |
| localStorage como persistencia | Auth + BC `Users`; canvas draft en Zustand Fase 1, endpoint `/drafts/{userId}` en Fase 2.0 |
| Rate limiting por fingerprint de device | Rate limiting server-side atado a `tenant_id` + plan activo (`IRateLimitPolicy`) |

> ⚠️ **Acción pre-sprint (Party Mode — Amelia):** Definir `DesignSnapshotSchema` (Zod) como contrato fronted/backend **antes** de portar el canvas. Si el store shape de Zustand muta durante el port y el schema se define después, hay retrabajo garantizado en el endpoint `POST /orders/confirm`. Este schema es el contrato inamovible del DesignSnapshot.

---

### Bounded Contexts Identificados

**6 bounded contexts para el monolito modular** (revisado de 7 — `Notifications` reclasificado):

```
[Users]           → Identity-only: autenticación, JWT, roles, invitaciones, revocación
                    Nota: Users NO tiene conocimiento del tenant. Es identity pura.
[CompanyAdmin]    → Tenant-membership: Companies, planes, feature flags, audit trail
                    Nota: CompanyAdmin gestiona la relación usuario↔tenant (quien pertenece a qué)
[Catalog]         → Prendas, colores, zonas de impresión, técnicas (datos del prototipo → seeds)
                    Nota: DesignEngine necesita snapshot desnormalizado de datos de catálogo
                    para el hot path del canvas (no cruzar boundary en cada interacción)
[DesignEngine]    → Proxy IA (Gemini), DesignSnapshot write-once, blob storage, PrintQuality log
[Orders]          → Ciclo de vida del pedido, submit atómico, historial, cancelación
[ProductionQueue] → Cola por técnica, estados de producción, incidencias
```

**`Notifications` reclasificado como módulo de infraestructura transversal:**
- No tiene aggregate root propio → no es bounded context
- Implementación: `INotificationService` con `SmsChannel` (Twilio) en Fase 1, extensible a `WhatsAppChannel`
- Vive en la capa de infraestructura, consumido por `Orders` y `ProductionQueue`

**Límite crítico Users ↔ CompanyAdmin (Party Mode — Winston):**
`Users` es identity-only. `CompanyAdmin` es tenant-membership. Un email puede ser `customer` O usuario interno (no ambos) — esta regla la enforcea la DB con índices parciales, pero la responsabilidad de la lógica de membresía vive en `CompanyAdmin`, no en `Users`.

---

### Preocupaciones Transversales (Cross-Cutting Concerns)

| Concern | Descripción | Impacto | Gaps identificados |
|---------|-------------|---------|-------------------|
| **Multi-tenancy** | `tenant_id` en TODA tabla de dominio; `ITenantContext` con 3 ciclos de vida | Todos los BCs | Riesgo captive dependency: `Singleton` que inyecta `ITenantContext` directamente bypasea el filtro silenciosamente. Requiere `IStartupFilter` de validación en startup. |
| **Audit logging** | Cambios de plan, acciones de platform_admin, cambios de estado | `CompanyAdmin`, `ProductionQueue` | — |
| **Rate limiting IA** | Por plan: Demo (20 total), SaaS/LP (pool mensual). Interface: `IRateLimitPolicy` | `DesignEngine`, `CompanyAdmin` | Interface debe definirse en Sprint 1 aunque la impl. llegue después |
| **Async AI ops** | Gemini no bloquea hilo HTTP; polling o SSE para progress | `DesignEngine` | Mecanismo concreto pendiente (polling vs websocket vs SSE) |
| **Idempotencia** | `Idempotency-Key` + `ProcessedRequests` en submit | `Orders` | — |
| **Error contract** | RFC 7807 `application/problem+json` en todos los endpoints | API middleware global | — |
| **Observabilidad** | `/health` con dep. checks, logs JSON, métricas P95/P99, billable events | Infraestructura global | Health endpoint debe incluir Gemini reachability, no solo "proceso vivo" |
| **Soft-delete / data retention** | `deleted_at` en tablas de dominio; política de retención para DesignSnapshots | Todos los BCs | **No estaba en la lista inicial (Party Mode — Winston).** Debe decidirse antes de la primera migración — cambiar después es costoso. |
| **Optimistic concurrency** | Version/ETag en borradores de diseño para conflictos multi-pestaña | `DesignEngine` | **No estaba en la lista inicial (Party Mode — Winston).** `ETag + 412 Precondition Failed` en endpoints de draft. |
| **Job scheduler** | Mecanismo concreto para background jobs con `ITenantContext` Case 2 | `Notifications`, `Orders` | **No estaba en la lista inicial (Party Mode — Winston).** ¿Hangfire + PostgreSQL? ¿Worker Service con canales? Debe decidirse — afecta modelo de deployment. |

---

### Evaluación de Escala y Complejidad

- **Complejidad general:** Media-alta
- **Dominio técnico primario:** Full-stack web (SPA + REST API + PostgreSQL + blob storage)
- **Componente más complejo:** Canvas de diseño (Konva) — ya implementado en el prototipo
- **Riesgo arquitectónico #1:** Aislamiento de tenants (data leak silencioso es bloqueante legal)
- **Riesgo arquitectónico #2:** Transacción atómica cross-schema (DesignSnapshot + ProductionQueue)
- **Concurrencia Fase 1:** 50 usuarios simultáneos (escala vertical)
- **Concurrencia Fase 2:** 500 usuarios simultáneos (escala vertical → horizontal cuando lo justifique)

---

### Tensión Arquitectónica Identificada (Party Mode — John vs Winston/Amelia)

**Multi-tenancy desde Día 1 vs. Walking Skeleton primero.**

John señala que con un único taller en Fase 1 y un gate de 3 clientes para Fase 2, la inversión en multi-tenancy completo en Sprint 1 optimiza para completitud técnica, no para velocidad de aprendizaje. La primera orden real no ocurre hasta Sprint 4.

Winston y Amelia responden que el `tenant_id` en el schema desde el inicio tiene costo bajo (es solo un campo) pero el costo de agregarlo después en producción con datos reales es alto.

**Resolución propuesta:** Multi-tenancy de datos (tenant_id en todas las tablas + `HasQueryFilter`) se implementa desde Sprint 1 porque el costo es bajo. La UI de gestión multi-tenant (CompanyAdmin UI completa, onboarding automatizado) se difiere a Fase 2.0 tal como está en el PRD. La diferencia es: infraestructura de datos = sí desde día 1; producto de gestión = no hasta que haya clientes.

---

### Acciones Pre-Sprint Identificadas (Party Mode — Amelia)

Antes del Sprint 1 formal, resolver:

1. **`DesignSnapshotSchema` (Zod)** — contrato frontend/backend del DesignSnapshot. Inmutable una vez definido.
2. **Testcontainers setup** en el test project + `docker-compose.test.yml`. Requerido para AC-ATOMIC-01/02 y AC-RBAC-CROSS-TENANT-03.
3. **Benchmark `bgRemoval.ts`** con PNG 4K — si BFS > 2s P95, invertir fallback (Gemini primero).
4. **`IRateLimitPolicy` interface** definida antes del sprint de DesignEngine (aunque la impl. llegue después).
5. **Estrategia de transacción cross-schema** — cómo EF Core maneja la ACID entre `DesignEngineDbContext` y `ProductionQueueDbContext`.

---

*Análisis de contexto validado con análisis multi-agente (Winston — Arquitecto, Amelia — Ingeniería, John — PM). Incorpora: reclasificación de Notifications, límite Users/CompanyAdmin, 3 cross-cutting concerns nuevos (soft-delete, optimistic concurrency, job scheduler), tensión multi-tenancy resuelta, y acciones pre-sprint.*

---

## Starter Template y Estructura de Solución

### Decisión: Clean Architecture en Monolito Modular (Opción Híbrida)

**Backend:** Estructura manual (no template de Ardalis — su v2-beta4 no genera proyectos separados por BC). Se aplica Clean Architecture con **Opción C — Híbrida**: los 3 BCs más complejos tienen 2 proyectos cada uno (`.Core` = Domain+Application, `.Infrastructure`), los 3 restantes arrancan con 1 proyecto con carpetas internas y escalan cuando la complejidad lo justifique.

**Frontend:** Prototipo React 19 + Vite migrado, no reescrito. Canvas Konva se mantiene intacto. Estimado de migración: 3-4 días (cambios en `services/gemini.ts`, `services/persistence.ts`, `CheckoutPage.tsx`).

---

### Estructura de Solución

```
ai-wear-studio/
├── src/
│   ├── backend/
│   │   ├── infrastructure/
│   │   │   └── AiWearStudio.SharedKernel/
│   │   │       ├── Domain/
│   │   │       │   ├── Entity.cs               ← Clase base con Id y DomainEvents
│   │   │       │   ├── AggregateRoot.cs
│   │   │       │   ├── ValueObject.cs
│   │   │       │   ├── IDomainEvent.cs
│   │   │       │   └── DomainException.cs
│   │   │       ├── Application/
│   │   │       │   ├── ICommand.cs / IQuery.cs ← Markers para MediatR
│   │   │       │   ├── Result.cs               ← Result<T> pattern
│   │   │       │   └── IEventDispatcher.cs
│   │   │       └── Common/
│   │   │           ├── ITenantContext.cs
│   │   │           └── IUnitOfWork.cs
│   │   │
│   │   ├── modules/
│   │   │   │
│   │   │   ├── Users/                          ← 2 proyectos (auth transversal y sensible)
│   │   │   │   ├── AiWearStudio.Users.Core/
│   │   │   │   │   ├── Domain/
│   │   │   │   │   │   ├── Entities/
│   │   │   │   │   │   ├── ValueObjects/
│   │   │   │   │   │   ├── Events/
│   │   │   │   │   │   └── Repositories/       ← Interfaces únicamente
│   │   │   │   │   └── Application/
│   │   │   │   │       ├── Commands/
│   │   │   │   │       ├── Queries/
│   │   │   │   │       ├── DTOs/
│   │   │   │   │       ├── Validators/         ← FluentValidation
│   │   │   │   │       └── AssemblyMarker.cs
│   │   │   │   └── AiWearStudio.Users.Infrastructure/
│   │   │   │       ├── Persistence/
│   │   │   │       │   ├── UsersDbContext.cs
│   │   │   │       │   ├── Configurations/
│   │   │   │       │   ├── Repositories/
│   │   │   │       │   └── Migrations/
│   │   │   │       └── DependencyInjection.cs  ← AddUsersModule()
│   │   │   │
│   │   │   ├── DesignEngine/                   ← 2 proyectos (Gemini + MinIO lo justifican)
│   │   │   │   ├── AiWearStudio.DesignEngine.Core/
│   │   │   │   │   ├── Domain/
│   │   │   │   │   └── Application/
│   │   │   │   │       ├── Commands/           ← GenerateDesignCommand, RemoveBgCommand
│   │   │   │   │       ├── Interfaces/
│   │   │   │   │       │   ├── IGeminiService.cs  ← Port hacia Gemini (en Application, no Domain)
│   │   │   │   │       │   └── IAssetStorage.cs   ← Port hacia MinIO
│   │   │   │   │       └── AssemblyMarker.cs
│   │   │   │   └── AiWearStudio.DesignEngine.Infrastructure/
│   │   │   │       ├── Adapters/
│   │   │   │       │   ├── GeminiHttpClient.cs ← HttpClient + Polly retry/circuit-breaker
│   │   │   │       │   └── MinioAssetStorage.cs
│   │   │   │       ├── Persistence/
│   │   │   │       └── DependencyInjection.cs  ← AddDesignEngineModule()
│   │   │   │
│   │   │   ├── Orders/                         ← 2 proyectos (lógica ACID compleja)
│   │   │   │   ├── AiWearStudio.Orders.Core/
│   │   │   │   └── AiWearStudio.Orders.Infrastructure/
│   │   │   │
│   │   │   ├── AiWearStudio.CompanyAdmin/       ← 1 proyecto (expandir si crece)
│   │   │   │   ├── Domain/
│   │   │   │   ├── Application/
│   │   │   │   └── Infrastructure/             ← Carpetas, no csproj separado
│   │   │   │
│   │   │   ├── AiWearStudio.Catalog/            ← 1 proyecto (datos relativamente estáticos)
│   │   │   └── AiWearStudio.ProductionQueue/    ← 1 proyecto (expandir si añade integraciones)
│   │   │
│   │   ├── AiWearStudio.Notifications/          ← INotificationService impl (Twilio SMS)
│   │   │                                           No es BC — módulo de infraestructura transversal
│   │   │
│   │   ├── AiWearStudio.Api/                    ← Entry point: Minimal API, middleware, DI root
│   │   │   └── Program.cs
│   │   │       └── builder.Services
│   │   │           .AddUsersModule()
│   │   │           .AddDesignEngineModule()
│   │   │           .AddOrdersModule()
│   │   │           .AddCatalogModule()
│   │   │           .AddCompanyAdminModule()
│   │   │           .AddProductionQueueModule()
│   │   │
│   │   └── tests/
│   │       ├── AiWearStudio.Users.Tests/
│   │       ├── AiWearStudio.DesignEngine.Tests/
│   │       ├── AiWearStudio.Orders.Tests/
│   │       ├── AiWearStudio.Catalog.Tests/
│   │       ├── AiWearStudio.CompanyAdmin.Tests/
│   │       ├── AiWearStudio.ProductionQueue.Tests/
│   │       └── AiWearStudio.Architecture.Tests/ ← NetArchTest: enforce dirección de deps.
│   │
│   └── frontend/                               ← React 19 + Vite (migrado del prototipo)
│
├── docker-compose.yml                          ← PostgreSQL + MinIO (con bucket init script)
├── docker-compose.test.yml                     ← Mínimo para CI (postgres:17-alpine + minio)
├── Makefile                                    ← make dev / make test / make migrate
└── .env.example                                ← Committeado; .env real en .gitignore
```

**Totales:** 12 proyectos source + 7 proyectos test = **19 proyectos**. Los 3 BCs de 1 proyecto escalan a 2 cuando lo justifique la complejidad.

---

### Reglas de Dependencia (Inmutables)

```
SharedKernel              → (sin dependencias salientes — nunca referencia ningún módulo)
BC.Core                   → SharedKernel únicamente
BC.Infrastructure         → BC.Core + SharedKernel + paquetes NuGet externos
AiWearStudio.Notifications → SharedKernel (implementa INotificationService de SharedKernel)
AiWearStudio.Api          → BC.Core (tipos) + BC.Infrastructure (DI wiring) + Notifications
BC.Core → otro BC.Core    → PROHIBIDO (comunicación solo vía Domain Events)
```

**Regla crítica de MediatR:** Cada `.Core` expone un `AssemblyMarker` interno. El `Program.cs` registra explícitamente por assembly:

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblies(
        typeof(Users.Core.AssemblyMarker).Assembly,
        typeof(DesignEngine.Core.AssemblyMarker).Assembly,
        typeof(Orders.Core.AssemblyMarker).Assembly,
        // ... demás BCs
    );
});
```

---

### Decisiones de Base de Datos y Almacenamiento

| Componente | Decisión |
|---|---|
| PostgreSQL | Un schema por BC en el mismo servidor. Nunca JOINs cross-schema en EF Core. |
| EF Core DbContext | Un DbContext derivado por BC. No existe `AppDbContext` global. |
| Migraciones | Por módulo — carpeta de migrations por Infrastructure project. |
| Blob storage | MinIO (S3-compatible). Accedido exclusivamente via `IAssetStorage` en SharedKernel. |
| Queries cross-BC | Prohibidas en Infrastructure. Requieren la API pública del módulo origen. |

---

### Regla de Expansión: Cuándo Separar un BC de 1→2 Proyectos

Un BC de 1 proyecto merece separación a `.Core` + `.Infrastructure` cuando cumple al menos una condición:

1. Integración con servicio externo (HTTP, SMS, cloud storage)
2. Configuraciones de mapeo EF Core complejas (herencia, owned entities, many-to-many custom)
3. Background jobs o caché específicos del módulo

---

*Step 3 validado con análisis multi-agente (Winston — Arquitecto, Amelia — Ingeniería). Incorpora: Clean Architecture Opción C Híbrida, SharedKernel explícito, separación pragmática 3 BCs×2 proyectos + 3 BCs×1 proyecto, reglas de dependencia inmutables, tests por BC + ArchTests.*

---

## Decisiones Arquitectónicas Centrales

### Decisiones Críticas (Bloquean Implementación)

| ID | Decisión | Elección | Afecta |
|----|----------|----------|--------|
| D1 | Soft-delete | Selectivo: `deleted_at` en Orders, DesignSnapshot, Users. Hard-delete en Catalog y entidades de configuración. | Primera migración — no cambiar después |
| D3 | Autenticación | JWT custom con `PasswordHasher<T>` de ASP.NET Core. Sin ASP.NET Core Identity (sus tablas no encajan con el modelo multi-tenant custom). | BC `Users`, toda la API |
| D4 | Refresh tokens | Tabla `refresh_tokens` en schema del BC `Users`. Rotación en cada uso + revocación inmediata. | BC `Users` |
| D5 | Cross-BC Events | MediatR in-process (`IPublisher.Publish`). Dispatch post-`SaveChangesAsync`. Migrable a Outbox en Fase 2 si aparecen problemas de confiabilidad. | Todos los BCs |
| D6 | Background jobs | **Hangfire + PostgreSQL** — persiste jobs en la misma DB, UI web incluida, retry automático, compatible con `ITenantContext`. | `Orders`, `Notifications`, `ProductionQueue` |

### Decisiones Importantes (Moldean la Arquitectura)

| ID | Decisión | Elección | Notas |
|----|----------|----------|-------|
| D2 | Caching | **Redis** — en `docker-compose.yml` desde Fase 1. Doble propósito: caché de datos (Catalog) + implementación de `IRateLimitPolicy` por tenant/plan. | Redis elimina la necesidad de `IMemoryCache` separado y resuelve el rate limiting sin infraestructura adicional |
| D7 | Async AI progress | **Polling** — `POST /ai/generate` devuelve `{ jobId }`. Frontend hace `GET /ai/jobs/{jobId}` cada 2s. Migrable a SSE en Fase 2 si UX lo requiere. | P99 < 30s + timeout 45s hace polling suficiente en Fase 1 |
| D8 | API client frontend | **TanStack Query v5** + `fetch` nativo — server state, cache automático, loading/error states, optimistic updates. | Estándar 2026 para React |
| D9 | Routing frontend | **React Router v7** — estándar, loaders/actions, code splitting. | |
| D10 | Logging | **Serilog** + sink `Console` en JSON estructurado. OpenTelemetry se evalúa en Fase 2 cuando haya observability backend (Grafana). | Aplica en todos los proyectos del backend |
| D11 | Cloud provider | **Microsoft Azure** — Azure Blob Storage (producción), Azure Database for PostgreSQL Flexible Server, Azure Container Apps. | `IAssetStorage` abstrae el swap MinIO→Azure Blob entre dev y prod |
| D12 | CI/CD | **GitHub Actions** — repo pendiente de migrar a GitHub (tarea externa). | |

### Decisiones Diferidas (Post-MVP)

| Decisión | Razón del diferimiento |
|----------|----------------------|
| OpenTelemetry + tracing distribuido | Sin valor hasta tener múltiples instancias o carga real |
| Redis como almacenamiento de refresh tokens | La tabla DB es suficiente para Fase 1 |
| SSE / WebSocket para AI progress | Polling es suficiente con P99 < 30s |
| Outbox pattern para domain events | MediatR in-process es suficiente para monolito |
| Azure Service Bus | Solo necesario si se extraen BCs a microservicios |

---

### Arquitectura de Datos

**PostgreSQL:**
- Un schema por BC en el mismo servidor (dev: Docker Compose `postgres:17-alpine`, prod: Azure Database for PostgreSQL Flexible Server)
- Cada BC tiene su propio `DbContext` derivado. No existe `AppDbContext` global.
- Migraciones por módulo en carpeta `Persistence/Migrations/` de cada `.Infrastructure` project
- `HasQueryFilter` en cada DbContext para `tenant_id` (multi-tenancy) y `deleted_at IS NULL` (soft-delete) donde aplica
- **Regla absoluta:** Nunca JOINs cross-schema en EF Core. Queries cross-BC requieren la API pública del módulo origen.

**Soft-delete:**
```csharp
// Solo en entidades que lo requieren por negocio o compliance
public class Order : AggregateRoot
{
    public DateTime? DeletedAt { get; private set; }
    // HasQueryFilter: WHERE deleted_at IS NULL
}
```

**Redis (docker-compose en dev, Azure Cache for Redis en prod):**
- Caché de datos del Catalog (TTL configurable, invalidación al modificar catálogo)
- Implementación de `IRateLimitPolicy` por `(tenant_id, plan, feature)` — contadores con TTL mensual/diario
- Interfaz: `IRateLimitPolicy` en SharedKernel, implementación Redis en cada BC que la consume

**MinIO / Azure Blob:**
- Dev: MinIO en docker-compose (S3-compatible, bucket init script al levantar)
- Prod: Azure Blob Storage
- Abstracción: `IAssetStorage` en SharedKernel — el swap es solo un adaptador en `DesignEngine.Infrastructure`

---

### Autenticación y Seguridad

**JWT custom:**
```csharp
// JwtSettings via IOptions<JwtSettings>
// - TTL: 60 min (access token)
// - Refresh: tabla refresh_tokens en schema users, rotación en cada uso
// - Revocación: eliminar refresh_token de la tabla (efecto inmediato en próximo refresh)
// - Algoritmo: HS256 con clave de 256+ bits en variables de entorno
```

**Roles y claims:**
- `role`: `customer` | `operator` | `admin` | `platform_admin`
- `tenant_id`: claim en el JWT (excepto `platform_admin` que puede operar cross-tenant)
- `ITenantContext`: resuelto desde el JWT en requests HTTP, inyectable en handlers

**RBAC y multi-tenancy:**
- `HasQueryFilter` aplica `tenant_id` globalmente — opt-out explícito, no opt-in
- Cross-tenant: Operario de Tenant A solicitando recurso de Tenant B → **404** (no 403)
- `IStartupFilter` de validación en startup para detectar Singletons que capturen `ITenantContext` directamente

---

### API y Patrones de Comunicación

**REST con Minimal API (.NET 10):**
- Endpoints registrados por módulo via `IEndpointDefinition` o extension methods en `Program.cs`
- Versionado: URL path (`/api/v1/`) en Fase 1. Header-based en Fase 2 si se necesita.
- Error contract: RFC 7807 `application/problem+json` en todos los endpoints via middleware global
- Idempotencia: Header `Idempotency-Key` + tabla `ProcessedRequests` en `POST /orders/confirm`

**Cross-BC communication (Domain Events):**
```
Orders publica OrderConfirmedDomainEvent
    → Handler en Notifications (dispara SMS via INotificationService)
    → Handler en ProductionQueue (crea entrada en cola)
Nunca: Orders.Core → Notifications directamente
```

**Async AI (Polling):**
```
POST /api/ai/generate        → 202 Accepted + { jobId: "uuid" }
GET  /api/ai/jobs/{jobId}    → { status: "pending|processing|done|failed", resultUrl? }
```

**Rate limiting IA (`IRateLimitPolicy`):**
- Interface en SharedKernel, implementación Redis en `DesignEngine.Infrastructure`
- Límites por plan: Demo (20 generaciones totales), SaaS/LP (pool mensual configurable)
- Bypass permanente post-confirmación de pedido

---

### Infraestructura y Observabilidad

**Logging:**
- Serilog con sink `Console` JSON estructurado en todas las fases
- Campos mínimos: `timestamp`, `level`, `message`, `tenant_id`, `user_id`, `correlation_id`, `bc`
- Billable events: log estructurado con `event_type: "ai_generation_used"` + `tenant_id` para billing en Fase 2

**Health check:**
- `GET /health` < 200ms con checks: PostgreSQL reachability, Redis reachability, MinIO/Azure Blob reachability, Gemini reachability (HTTP HEAD o lightweight ping)
- Usa `Microsoft.Extensions.Diagnostics.HealthChecks`

**Background jobs (Hangfire):**
- Storage: PostgreSQL (mismo servidor, schema `hangfire`)
- Dashboard: habilitado solo en entornos no-production o con auth
- `ITenantContext` en jobs: Case 2 (job conoce `tenant_id` explícitamente, no lo infiere de HTTP)

**Docker Compose (desarrollo):**
```yaml
services:
  postgres:     # postgres:17-alpine, esquemas por BC
  redis:        # redis:7-alpine
  minio:        # minio/minio con script init-buckets.sh
```

**CI/CD (GitHub Actions — pendiente migración de repo):**
- Pipeline backend: build → test (unit) → test (integration con Testcontainers) → docker build → deploy Azure Container Apps
- Pipeline frontend: build → lint → test → deploy Azure Static Web Apps o Container Apps
- Triggers independientes por cambios en `src/backend/**` y `src/frontend/**`

**Azure (producción):**
- Compute: Azure Container Apps (escala a cero en Fase 1, escala horizontal en Fase 2)
- DB: Azure Database for PostgreSQL Flexible Server
- Storage: Azure Blob Storage (via `IAssetStorage` — mismo adaptador, distinto endpoint)
- Cache: Azure Cache for Redis
- Jobs: Hangfire en la misma Container App del backend

---

*Step 4 completado. Decisiones validadas colaborativamente. Incorpora: 12 decisiones arquitectónicas centrales, Redis para caché + rate limiting, JWT custom multi-tenant, MediatR in-process para domain events, Hangfire + PostgreSQL para background jobs, polling para AI async, TanStack Query + React Router v7 para frontend, Azure como cloud provider de producción.*

---

## Patrones de Implementación y Reglas de Consistencia

### Naming Patterns

**Base de datos (PostgreSQL — snake_case universal):**

| Elemento | Convención | Ejemplo |
|---|---|---|
| Schemas | `snake_case` | `design_engine`, `production_queue`, `company_admin` |
| Tablas | `snake_case` plural | `orders`, `design_snapshots`, `refresh_tokens` |
| Columnas | `snake_case` | `tenant_id`, `created_at`, `deleted_at` |
| PKs | `id` UUID | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| FKs | `{tabla_singular}_id` | `order_id`, `user_id` |
| Índices | `ix_{tabla}_{columna(s)}` | `ix_orders_tenant_id` |
| Índices únicos | `ux_{tabla}_{columna(s)}` | `ux_users_email_tenant_id` |

EF Core usa `UseSnakeCaseNamingConvention()` — el mapeo PascalCase ↔ snake_case es automático.

**API endpoints:**

```
GET    /api/v1/orders                    ← colección
GET    /api/v1/orders/{orderId}          ← recurso individual (camelCase param)
POST   /api/v1/orders/confirm            ← acción
PATCH  /api/v1/orders/{orderId}/status   ← sub-recurso
GET    /api/v1/production-queue          ← recurso compuesto: kebab-case
POST   /api/ai/generate                  ← dominio ai, acción
GET    /api/ai/jobs/{jobId}
```

**C# backend:**

| Elemento | Convención | Ejemplo |
|---|---|---|
| Clases / Records | `PascalCase` | `ConfirmOrderCommand`, `OrderDto` |
| Interfaces | `I` + `PascalCase` | `IOrderRepository`, `IGeminiService` |
| Métodos | `PascalCase` | `HandleAsync`, `GetByIdAsync` |
| Campos privados | `_camelCase` | `_orderRepository` |
| Parámetros / vars locales | `camelCase` | `tenantId`, `orderId` |
| Commands | `{Acción}{Entidad}Command` | `ConfirmOrderCommand`, `RegisterUserCommand` |
| Queries | `Get{Entidad}ByXxxQuery` / `List{Entidades}Query` | `GetOrderByIdQuery` |
| Handlers | sufijo `Handler` | `ConfirmOrderCommandHandler` |
| DTOs | sufijo `Dto` | `OrderDto`, `DesignSnapshotDto` |
| **DomainEvents (intra-BC)** | `{Entidad}{AcciónPasado}DomainEvent` | `OrderLinedAddedDomainEvent` |
| **IntegrationEvents (cross-BC)** | `{Entidad}{AcciónPasado}IntegrationEvent` | `OrderConfirmedIntegrationEvent` |
| Repository interfaces | `I{Entidad}Repository` | `IOrderRepository` |
| DbContexts | `{BC}DbContext` | `OrdersDbContext` |

> ⚠️ **Regla crítica — DomainEvent vs IntegrationEvent:**
> - `DomainEvent` = intra-BC, MediatR in-process, mismo request HTTP
> - `IntegrationEvent` = cross-BC, vía Outbox Pattern, entrega durable
> - Mezclarlos produce acoplamiento accidental o pérdida de atomicidad

**TypeScript / React frontend:**

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | `PascalCase` | `CanvasEditor`, `OrderStatusBadge` |
| Archivos de componentes | `PascalCase.tsx` | `CanvasEditor.tsx` |
| Hooks custom | `useX` | `useOrderStatus`, `useDesignStore` |
| Stores Zustand | `useXStore` | `useDesignStore` |
| Query key factories | `{feature}Keys` | `orderKeys`, `catalogKeys` |
| API hooks (TanStack Query) | `useX` | `useOrders`, `useOrderById` |
| Constantes globales | `UPPER_SNAKE_CASE` | `AI_POLL_INTERVAL_MS` |
| Archivos no-componentes | `camelCase.ts` | `orderApi.ts`, `queryKeys.ts` |

---

### Format Patterns

**API responses:**

```json
// Recurso individual — objeto directo (sin wrapper)
{ "id": "uuid", "status": "pending", "tenantId": "uuid", "createdAt": "2026-05-07T14:30:00Z" }

// Colección paginada
{
  "items": [...],
  "pagination": { "pageNumber": 1, "pageSize": 20, "total": 47 }
}

// Error — RFC 7807
{
  "type": "https://aiwearstudio.com/errors/order-not-found",
  "title": "Order Not Found",
  "status": 404,
  "detail": "Order 'uuid' does not exist in this tenant.",
  "instance": "/api/v1/orders/uuid"
}

// Job async AI
{ "jobId": "uuid", "status": "pending|processing|done|failed", "resultUrl": "..." }
```

**Paginación — contrato en SharedKernel:**

```csharp
// SharedKernel/Application/PaginationParams.cs
public record PaginationParams(int PageNumber = 1, int PageSize = 20);

// SharedKernel/Application/PagedResult.cs
public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int PageNumber, int PageSize);
```

Query params exactos en URL: `?pageNumber=1&pageSize=20&sortBy=createdAt&sortDirection=desc`

**JSON field naming:** `camelCase` en API (requests y responses). `snake_case` en DB (EF Core lo convierte).

**Fechas:** ISO 8601 UTC — `"2026-05-07T14:30:00Z"`. C#: `DateTimeOffset`. TypeScript: `string`.

---

### Communication Patterns

**DomainEvent vs IntegrationEvent — regla de entrega:**

```
DomainEvent (intra-BC):
  → INotificationHandler<T> in-process
  → MediatR IPublisher.Publish() dentro del mismo request
  → Mismo aggregate, mismo BC

IntegrationEvent (cross-BC):
  → SIEMPRE vía Outbox Pattern
  → Persistido en misma transacción que el aggregate que lo origina
  → Procesado por Outbox Worker (Hangfire job)
  → Handler en BC destino es IDEMPOTENTE (check por IdempotencyKey)
```

**Outbox Pattern — obligatorio para cross-BC con atomicidad:**

```csharp
// outbox_messages en el mismo schema del BC origen
// Columnas: id, type, payload (jsonb), tenant_id, occurred_at, processed_at (null = pendiente)

// En el handler del comando (misma transacción):
await _dbContext.OutboxMessages.AddAsync(new OutboxMessage
{
    Id = Guid.NewGuid(),
    Type = nameof(OrderConfirmedIntegrationEvent),
    Payload = JsonSerializer.Serialize(integrationEvent),
    TenantId = command.TenantId,  // ← TenantId SIEMPRE serializado en el mensaje
    OccurredAt = DateTimeOffset.UtcNow
});
await _dbContext.SaveChangesAsync(ct);  // atómico con el aggregate

// Outbox Worker (Hangfire): publica IntegrationEvents pendientes
// Handler destino: verifica IdempotencyKey antes de procesar
```

> ⚠️ **El TenantId se serializa en el Outbox message** — el Outbox Worker corre como background job sin `IHttpContextAccessor`. El `TenantId` nunca se resuelve en tiempo de ejecución del worker, siempre viene del mensaje persistido.

**MediatR Pipeline — orden obligatorio:**

```
Request → IdempotencyBehavior → LoggingBehavior → ValidationBehavior → Handler
```

`IdempotencyBehavior` va primero: si el request ya fue procesado, retorna el resultado cacheado sin loguear ni validar de nuevo. Store: Redis con TTL configurable por tipo de comando.

**Módulo Registration (patrón estándar):**

```csharp
public static IServiceCollection AddOrdersModule(
    this IServiceCollection services, IConfiguration config)
{
    services.AddDbContext<OrdersDbContext>(opt =>
        opt.UseNpgsql(config.GetConnectionString("Orders"))
           .UseSnakeCaseNamingConvention());
    services.AddScoped<IOrderRepository, EfOrderRepository>();
    services.AddMediatR(cfg =>
        cfg.RegisterServicesFromAssembly(typeof(AssemblyMarker).Assembly));
    services.AddValidatorsFromAssembly(typeof(AssemblyMarker).Assembly);
    return services;
}
```

**Read models cross-BC — sin queries cross-schema:**

Cuando un BC necesita mostrar datos de otro BC (ej: `Orders` muestra nombre del producto de `Catalog`):
- `Orders` mantiene una **copia read-optimizada** de los campos que necesita (denormalizada)
- La copia se actualiza vía `IntegrationEvent` del BC origen (`ProductUpdatedIntegrationEvent`)
- Nunca un JOIN cross-schema en EF Core

---

### Process Patterns

**Error handling — tabla de conversión ExceptionHandlerMiddleware:**

| Origen | Tipo | HTTP Status |
|---|---|---|
| `FluentValidation.ValidationException` | 422 Unprocessable Entity | problem+json con `errors` por campo |
| `Result.Failure` (negocio) | 400 Bad Request / 404 / 409 Conflict | según el error code |
| `DomainException` | 422 / 409 según invariante | problem+json |
| Infraestructura externa | 500 Internal Server Error | problem+json genérico (no exponer detalle) |

**Regla de infraestructura externa:** Los adaptadores de servicios externos (`GeminiHttpClient`, `MinioAssetStorage`, `TwilioSmsChannel`) **siempre retornan `Result<T>`**, nunca lanzan excepciones. Las excepciones de red/timeout se capturan internamente y se convierten en `Result.Failure`.

```csharp
// ✅ Correcto
public async Task<Result<GenerationResult>> GenerateAsync(PromptSpec prompt, CancellationToken ct)
{
    try { /* HTTP call */ return Result.Success(result); }
    catch (HttpRequestException ex) { return Result.Failure<GenerationResult>("GEMINI_UNAVAILABLE"); }
}

// ❌ Prohibido
public async Task<GenerationResult> GenerateAsync(...) { /* puede lanzar */ }
```

**Validación — dos capas, backend es autoritativo:**

| Capa | Framework | Propósito |
|---|---|---|
| Frontend | Zod | UX: feedback inmediato, `DesignSnapshotSchema` es contrato compartido |
| Backend | FluentValidation en `ValidationBehavior` | Autoritativo: invariantes y reglas de negocio |

No duplicar lógica de negocio — el frontend valida para UX, el backend es la fuente de verdad.

**Tenant isolation — enforcement:**

- Toda entidad de dominio con datos DEBE tener `TenantId` como property obligatorio
- `HasQueryFilter` en cada DbContext para `tenant_id` y `deleted_at IS NULL`
- `IgnoreQueryFilters()` requiere comentario explicativo con justificación
- `NetArchTest` verifica que ningún `.Core` referencie `.Infrastructure`

---

### Frontend Patterns

**Estructura de features (template copiable):**

```
src/
  features/
    orders/
      api/
        orderApi.ts          ← fetch functions (usadas por TanStack Query hooks)
        queryKeys.ts         ← key factory tipada
        useOrders.ts         ← useQuery hooks
        useConfirmOrder.ts   ← useMutation hooks
      components/
        OrderCard.tsx
        OrderStatusBadge.tsx
      pages/
        OrdersPage.tsx       ← conecta todo; importa hooks y componentes
      store/
        orderStore.ts        ← Zustand slice (solo si hay estado local del feature)
      types/
        order.types.ts       ← tipos TS del dominio frontend
      index.ts               ← barrel: solo exporta lo que otros features necesitan
    catalog/                 ← misma estructura
    design-engine/
    production-queue/
```

**TanStack Query key factory — pattern obligatorio por feature:**

```typescript
// features/orders/api/queryKeys.ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
}

// Uso en hooks:
queryKey: orderKeys.detail(orderId)
// Invalidación:
queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
```

Este patrón hace que el compilador TypeScript detecte keys incorrectas. **Es el patrón con mayor riesgo de drift sin enforcement** — la factory tipada es la única defensa.

**Routing (React Router v7 — declarativo centralizado):**

```typescript
// src/router.tsx — único punto de verdad
const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    path: '/design',
    lazy: () => import('./features/design-engine/pages/DesignPage'),
  },
  {
    path: '/orders',
    lazy: () => import('./features/orders/pages/OrdersPage'),
  },
  // ...
])
```

Lazy loading por feature/page — no por componente individual.

**Errores de API → campos de formulario:**

```typescript
// helper: mapea RFC 7807 errors[] a react-hook-form setError()
function applyServerErrors<T>(
  error: ProblemDetails,
  setError: UseFormSetError<T>
) {
  error.errors?.forEach(({ field, message }) =>
    setError(field as Path<T>, { message })
  )
}
```

---

### Testing Patterns

**Unit tests — handlers MediatR:**

```csharp
// Dependencias mockeadas con NSubstitute (no levantar DI)
public class ConfirmOrderCommandHandlerTests
{
    private readonly IOrderRepository _repo = Substitute.For<IOrderRepository>();
    private readonly IEventDispatcher _events = Substitute.For<IEventDispatcher>();
    private readonly ITenantContext _tenant = Substitute.For<ITenantContext>();
    private readonly ConfirmOrderCommandHandler _sut;

    public ConfirmOrderCommandHandlerTests()
    {
        _sut = new ConfirmOrderCommandHandler(_repo, _events, _tenant);
    }
    // Tests verifican: lógica de negocio, Result correcto, eventos publicados
}
```

**Integration tests — endpoints:**

```csharp
// WebApplicationFactory + Testcontainers (PostgreSQL + Redis reales)
// Regla: lógica de dominio y handlers → unit tests (rápidos, <10s total)
//        endpoints + DB + cache → integration tests (lentos, ~2min en CI)
public class OrdersEndpointTests : IClassFixture<AiWearStudioWebApplicationFactory>
{
    // Usa base de datos real vía Testcontainers
    // Verifica: HTTP status, payload, efectos en DB
}
```

**`AiWearStudio.Architecture.Tests` (NetArchTest):**

```csharp
// Verifica las reglas de dependencia en tiempo de CI
[Fact] void Core_Should_Not_Reference_Infrastructure() { ... }
[Fact] void Domain_Should_Not_Reference_Application_Services() { ... }
[Fact] void No_CrossBC_Direct_References() { ... }
```

---

*Step 5 validado con análisis multi-agente (Winston — Arquitecto, Amelia — Ingeniería). Incorpora: Outbox Pattern para cross-BC atómico, distinción DomainEvent/IntegrationEvent, TenantId serializado en Outbox, pipeline MediatR actualizado con IdempotencyBehavior, tabla de conversión ExceptionHandlerMiddleware, contrato de paginación en SharedKernel, estructura de features frontend, TanStack Query key factory, read models cross-BC, regla de infraestructura Result&lt;T&gt;, patrones de testing.*

---

## Estructura del Proyecto y Límites Arquitectónicos

> ⚠️ **Correcciones críticas validadas con análisis multi-agente (Party Mode):**
> - `DesignSnapshot` se mueve a `OrdersDbContext` — el ACID atómico requiere un solo DbContext
> - `OutboxMessage` pertenece a Infrastructure, no a Domain
> - `IAssetStorage` pertenece a `DesignEngine.Core/Application/Interfaces/`, no a SharedKernel
> - `CatalogSnapshot` + `PrintZoneSnapshot` son value objects obligatorios en Orders para congelar datos del catálogo al confirmar

### Estructura Completa del Proyecto

```
ai-wear-studio/
│
├── .github/
│   └── workflows/
│       ├── backend.yml        ← CI: build → unit → integration (Testcontainers) → docker → Azure
│       └── frontend.yml       ← CI: build → lint → vitest → deploy Azure Static Web Apps
│
├── src/
│   │
│   ├── backend/
│   │   ├── AiWearStudio.sln
│   │   │
│   │   ├── infrastructure/
│   │   │   └── AiWearStudio.SharedKernel/
│   │   │       ├── AiWearStudio.SharedKernel.csproj
│   │   │       ├── Domain/
│   │   │       │   ├── Entity.cs
│   │   │       │   ├── AggregateRoot.cs       ← colecta DomainEvents, los despacha post-save
│   │   │       │   ├── ValueObject.cs
│   │   │       │   ├── IDomainEvent.cs        ← intra-BC, MediatR in-process
│   │   │       │   ├── IIntegrationEvent.cs   ← cross-BC, vía Outbox
│   │   │       │   └── DomainException.cs
│   │   │       ├── Application/
│   │   │       │   ├── ICommand.cs
│   │   │       │   ├── IQuery.cs
│   │   │       │   ├── Result.cs              ← Result<T> pattern
│   │   │       │   ├── PaginationParams.cs    ← record(PageNumber=1, PageSize=20)
│   │   │       │   ├── PagedResult.cs         ← record(Items, TotalCount, PageNumber, PageSize)
│   │   │       │   └── IEventDispatcher.cs
│   │   │       └── Common/
│   │   │           ├── ITenantContext.cs
│   │   │           └── IUnitOfWork.cs
│   │   │           ← NOTA: IAssetStorage NO está aquí — pertenece a DesignEngine
│   │   │
│   │   ├── modules/
│   │   │   │
│   │   │   ├── Users/                         ← FR1–FR8: Auth, RBAC, JWT, invitaciones
│   │   │   │   ├── AiWearStudio.Users.Core/
│   │   │   │   │   ├── Domain/
│   │   │   │   │   │   ├── Entities/
│   │   │   │   │   │   │   └── User.cs        ← id, email, role, tenant_id, deleted_at
│   │   │   │   │   │   ├── ValueObjects/
│   │   │   │   │   │   │   ├── Email.cs
│   │   │   │   │   │   │   ├── UserId.cs
│   │   │   │   │   │   │   └── TenantId.cs
│   │   │   │   │   │   ├── Events/
│   │   │   │   │   │   │   └── UserRegisteredDomainEvent.cs
│   │   │   │   │   │   └── Repositories/
│   │   │   │   │   │       └── IUserRepository.cs
│   │   │   │   │   └── Application/
│   │   │   │   │       ├── Commands/
│   │   │   │   │       │   ├── RegisterUser/
│   │   │   │   │       │   ├── LoginUser/
│   │   │   │   │       │   ├── RefreshToken/
│   │   │   │   │       │   ├── RevokeToken/
│   │   │   │   │       │   └── InviteOperator/  ← FR6
│   │   │   │   │       ├── Queries/
│   │   │   │   │       │   └── GetUserById/
│   │   │   │   │       ├── DTOs/
│   │   │   │   │       │   ├── UserDto.cs
│   │   │   │   │       │   └── TokenDto.cs
│   │   │   │   │       ├── Validators/
│   │   │   │   │       ├── Behaviors/           ← pipeline MediatR (compartido o por BC)
│   │   │   │   │       │   ├── IdempotencyBehavior.cs
│   │   │   │   │       │   ├── LoggingBehavior.cs
│   │   │   │   │       │   └── ValidationBehavior.cs
│   │   │   │   │       └── AssemblyMarker.cs
│   │   │   │   └── AiWearStudio.Users.Infrastructure/
│   │   │   │       ├── Persistence/
│   │   │   │       │   ├── UsersDbContext.cs    ← schema: users
│   │   │   │       │   ├── Configurations/
│   │   │   │       │   ├── Repositories/
│   │   │   │       │   └── Migrations/
│   │   │   │       ├── Auth/
│   │   │   │       │   ├── JwtTokenService.cs
│   │   │   │       │   └── PasswordHasherService.cs
│   │   │   │       └── DependencyInjection.cs   ← AddUsersModule()
│   │   │   │
│   │   │   ├── CompanyAdmin/                   ← FR40–FR45c: Tenants, planes, memberships
│   │   │   │   └── AiWearStudio.CompanyAdmin/
│   │   │   │       ├── Domain/
│   │   │   │       │   ├── Entities/
│   │   │   │       │   │   ├── Company.cs
│   │   │   │       │   │   ├── CompanyMembership.cs ← relación usuario↔tenant
│   │   │   │       │   │   └── SubscriptionPlan.cs
│   │   │   │       │   └── Repositories/
│   │   │   │       ├── Application/
│   │   │   │       │   ├── Commands/
│   │   │   │       │   │   ├── CreateCompany/
│   │   │   │       │   │   ├── UpdatePlan/
│   │   │   │       │   │   └── AddMember/
│   │   │   │       │   └── Queries/
│   │   │   │       ├── Infrastructure/
│   │   │   │       │   ├── CompanyAdminDbContext.cs  ← schema: company_admin
│   │   │   │       │   ├── Configurations/
│   │   │   │       │   ├── Repositories/
│   │   │   │       │   └── Migrations/
│   │   │   │       └── DependencyInjection.cs
│   │   │   │
│   │   │   ├── Catalog/                        ← FR9–FR13: Prendas, zonas, técnicas
│   │   │   │   └── AiWearStudio.Catalog/
│   │   │   │       ├── Domain/
│   │   │   │       │   ├── Entities/
│   │   │   │       │   │   ├── Garment.cs      ← 10 prendas → seeds SQL
│   │   │   │       │   │   ├── PrintZone.cs    ← 23 combinaciones prenda+vista
│   │   │   │       │   │   └── PrintTechnique.cs ← DTG, ScreenPrint, Embroidery, DTF, HeatTransfer
│   │   │   │       │   └── Repositories/
│   │   │   │       ├── Application/
│   │   │   │       │   ├── Queries/
│   │   │   │       │   │   ├── ListGarments/
│   │   │   │       │   │   ├── GetGarmentById/
│   │   │   │       │   │   └── GetPrintZonesForGarment/
│   │   │   │       │   └── DTOs/
│   │   │   │       │       ├── GarmentDto.cs
│   │   │   │       │       └── PrintZoneDto.cs ← snapshot desnormalizado para canvas (hot path)
│   │   │   │       ├── Infrastructure/
│   │   │   │       │   ├── CatalogDbContext.cs ← schema: catalog
│   │   │   │       │   ├── Configurations/
│   │   │   │       │   ├── Repositories/
│   │   │   │       │   ├── Migrations/
│   │   │   │       │   └── Seeds/
│   │   │   │       │       ├── GarmentSeeds.cs
│   │   │   │       │       └── PrintZoneSeeds.cs
│   │   │   │       └── DependencyInjection.cs
│   │   │   │
│   │   │   ├── DesignEngine/                   ← FR14–FR23b: Proxy IA, snapshots, calidad
│   │   │   │   ├── AiWearStudio.DesignEngine.Core/
│   │   │   │   │   ├── Domain/
│   │   │   │   │   │   ├── Entities/
│   │   │   │   │   │   │   └── DesignDraft.cs  ← borrador editable (pre-confirmación)
│   │   │   │   │   │   │   ← NOTA: DesignSnapshot NO está aquí — vive en OrdersDbContext
│   │   │   │   │   │   ├── ValueObjects/
│   │   │   │   │   │   │   ├── DesignLayer.cs  ← tipado desde types.ts del prototipo
│   │   │   │   │   │   │   └── PromptSpec.cs
│   │   │   │   │   │   └── Repositories/
│   │   │   │   │   │       └── IDesignDraftRepository.cs
│   │   │   │   │   └── Application/
│   │   │   │   │       ├── Commands/
│   │   │   │   │       │   ├── GenerateAiImage/
│   │   │   │   │       │   ├── RemoveBackground/
│   │   │   │   │       │   └── GenerateTryOn/
│   │   │   │   │       ├── Queries/
│   │   │   │   │       │   └── GetAiJobStatus/
│   │   │   │   │       ├── Interfaces/
│   │   │   │   │       │   ├── IGeminiService.cs    ← port en Application (no en Domain)
│   │   │   │   │       │   ├── IAssetStorage.cs     ← port aquí (no en SharedKernel)
│   │   │   │   │       │   └── IPrintQualityValidator.cs
│   │   │   │   │       ├── DTOs/
│   │   │   │   │       │   └── AiJobDto.cs          ← { jobId, status, resultUrl? }
│   │   │   │   │       └── AssemblyMarker.cs
│   │   │   │   └── AiWearStudio.DesignEngine.Infrastructure/
│   │   │   │       ├── Adapters/
│   │   │   │       │   ├── GeminiHttpClient.cs      ← HttpClient + Polly retry + 45s timeout
│   │   │   │       │   ├── MinioAssetStorage.cs     ← IAssetStorage impl (dev)
│   │   │   │       │   └── AzureBlobAssetStorage.cs ← IAssetStorage impl (prod)
│   │   │   │       ├── Persistence/
│   │   │   │       │   ├── DesignEngineDbContext.cs ← schema: design_engine (solo drafts)
│   │   │   │       │   ├── Configurations/
│   │   │   │       │   ├── Repositories/
│   │   │   │       │   └── Migrations/
│   │   │   │       ├── Jobs/
│   │   │   │       │   └── AiGenerationJob.cs       ← Hangfire: ejecuta llamada a Gemini
│   │   │   │       └── DependencyInjection.cs       ← AddDesignEngineModule()
│   │   │   │
│   │   │   ├── Orders/                         ← FR24–FR31b: Submit, checkout, historial
│   │   │   │   ├── AiWearStudio.Orders.Core/
│   │   │   │   │   ├── Domain/
│   │   │   │   │   │   ├── Entities/
│   │   │   │   │   │   │   ├── Order.cs        ← aggregate root, ciclo de vida, deleted_at
│   │   │   │   │   │   │   ├── OrderLine.cs
│   │   │   │   │   │   │   └── DesignSnapshot.cs ← write-once, inmutable post-confirm
│   │   │   │   │   │   │     ← RAZÓN: mismo DbContext = ACID atómico garantizado
│   │   │   │   │   │   ├── ValueObjects/
│   │   │   │   │   │   │   ├── OrderStatus.cs
│   │   │   │   │   │   │   ├── ShippingAddress.cs
│   │   │   │   │   │   │   ├── IdempotencyKey.cs
│   │   │   │   │   │   │   ├── CatalogSnapshot.cs  ← congela datos del catálogo al confirmar
│   │   │   │   │   │   │   │   (ProductId, ProductName, BasePrice, SnapshotTakenAt)
│   │   │   │   │   │   │   └── PrintZoneSnapshot.cs ← congela zonas de impresión
│   │   │   │   │   │   │       (ZoneId, ZoneName, WidthPx, HeightPx, AllowedTechniques[])
│   │   │   │   │   │   ├── Events/
│   │   │   │   │   │   │   └── OrderLineAddedDomainEvent.cs ← intra-BC
│   │   │   │   │   │   └── Repositories/
│   │   │   │   │   │       └── IOrderRepository.cs
│   │   │   │   │   └── Application/
│   │   │   │   │       ├── Commands/
│   │   │   │   │       │   ├── ConfirmOrder/
│   │   │   │   │       │   │   ├── ConfirmOrderCommand.cs
│   │   │   │   │       │   │   └── ConfirmOrderCommandHandler.cs
│   │   │   │   │       │   │     ← guarda Order + DesignSnapshot + OutboxMessage en
│   │   │   │   │       │   │       OrdersDbContext → un solo SaveChangesAsync() atómico
│   │   │   │   │       │   ├── CancelOrder/
│   │   │   │   │       │   └── UpdatePaymentStatus/
│   │   │   │   │       ├── Queries/
│   │   │   │   │       │   ├── GetOrderById/
│   │   │   │   │       │   └── ListOrdersByTenant/
│   │   │   │   │       ├── IntegrationEvents/
│   │   │   │   │       │   └── OrderConfirmedIntegrationEvent.cs ← cross-BC vía Outbox
│   │   │   │   │       └── AssemblyMarker.cs
│   │   │   │   └── AiWearStudio.Orders.Infrastructure/
│   │   │   │       ├── Persistence/
│   │   │   │       │   ├── OrdersDbContext.cs   ← schema: orders
│   │   │   │       │   │   mapea: orders, order_lines, design_snapshots, outbox_messages
│   │   │   │       │   ├── Configurations/
│   │   │   │       │   ├── Repositories/
│   │   │   │       │   ├── Migrations/
│   │   │   │       │   └── Outbox/
│   │   │   │       │       └── OutboxMessage.cs ← Infrastructure (no Domain)
│   │   │   │       ├── Jobs/
│   │   │   │       │   └── OutboxProcessorJob.cs ← Hangfire: publica IntegrationEvents
│   │   │   │       └── DependencyInjection.cs   ← AddOrdersModule()
│   │   │   │
│   │   │   └── ProductionQueue/                ← FR32–FR36b: Cola, estados, incidencias
│   │   │       └── AiWearStudio.ProductionQueue/
│   │   │           ├── Domain/
│   │   │           │   ├── Entities/
│   │   │           │   │   ├── ProductionJob.cs    ← creado al recibir OrderConfirmedIntegrationEvent
│   │   │           │   │   └── ProductionIncident.cs
│   │   │           │   ├── ValueObjects/
│   │   │           │   │   └── ProductionStatus.cs ← recibido→en_produccion→control_calidad→listo→enviado
│   │   │           │   └── Repositories/
│   │   │           ├── Application/
│   │   │           │   ├── Commands/
│   │   │           │   │   ├── UpdateJobStatus/
│   │   │           │   │   └── ReportIncident/
│   │   │           │   ├── Queries/
│   │   │           │   │   ├── ListJobsByTechnique/
│   │   │           │   │   └── GetJobById/
│   │   │           │   └── IntegrationEventHandlers/
│   │   │           │       └── OnOrderConfirmedHandler.cs ← crea ProductionJob
│   │   │           ├── Infrastructure/
│   │   │           │   ├── ProductionQueueDbContext.cs ← schema: production_queue
│   │   │           │   ├── Configurations/
│   │   │           │   ├── Repositories/
│   │   │           │   └── Migrations/
│   │   │           └── DependencyInjection.cs
│   │   │
│   │   ├── AiWearStudio.Notifications/         ← FR37–FR39b: SMS Twilio
│   │   │   ├── Channels/
│   │   │   │   └── TwilioSmsChannel.cs
│   │   │   ├── Templates/
│   │   │   │   ├── OrderConfirmedTemplate.cs
│   │   │   │   └── StatusChangedTemplate.cs
│   │   │   ├── EventHandlers/
│   │   │   │   └── OnOrderConfirmedNotifyCustomer.cs
│   │   │   └── DependencyInjection.cs
│   │   │
│   │   └── AiWearStudio.Api/
│   │       ├── Program.cs
│   │       ├── Endpoints/
│   │       │   ├── UsersEndpoints.cs
│   │       │   ├── CatalogEndpoints.cs
│   │       │   ├── DesignEngineEndpoints.cs
│   │       │   ├── OrdersEndpoints.cs
│   │       │   ├── ProductionQueueEndpoints.cs
│   │       │   └── CompanyAdminEndpoints.cs
│   │       ├── Middleware/
│   │       │   ├── ExceptionHandlerMiddleware.cs  ← Result<T>/Exception → RFC 7807
│   │       │   ├── TenantContextMiddleware.cs     ← resuelve ITenantContext desde JWT
│   │       │   └── IdempotencyMiddleware.cs
│   │       ├── Configuration/
│   │       │   ├── JwtSettings.cs
│   │       │   ├── GeminiSettings.cs
│   │       │   ├── StorageSettings.cs
│   │       │   └── HangfireSettings.cs
│   │       └── Health/
│   │           └── HealthChecksConfiguration.cs  ← /health: PostgreSQL + Redis + MinIO/Blob + Gemini
│   │
│   └── frontend/                               ← React 19 + Vite (migrado del prototipo)
│       ├── package.json
│       ├── vite.config.ts
│       ├── vitest.config.ts                    ← Vitest + jsdom + coverage
│       ├── vitest.setup.ts                     ← mock HTMLCanvasElement para Konva
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── index.html
│       ├── .env.example                        ← CRÍTICO: VITE_API_URL + variables comentadas
│       │
│       └── src/
│           ├── main.tsx
│           ├── router.tsx                       ← React Router v7, lazy loading por feature
│           ├── App.tsx
│           │
│           ├── features/
│           │   ├── auth/                        ← FR1–FR8
│           │   │   ├── api/
│           │   │   │   ├── authApi.ts
│           │   │   │   ├── queryKeys.ts
│           │   │   │   ├── useLogin.ts
│           │   │   │   └── useRegister.ts
│           │   │   ├── components/
│           │   │   │   ├── LoginForm.tsx
│           │   │   │   └── RegisterForm.tsx
│           │   │   ├── pages/
│           │   │   │   ├── LoginPage.tsx
│           │   │   │   └── RegisterPage.tsx
│           │   │   ├── store/
│           │   │   │   └── authStore.ts         ← accessToken, tenantId, user info
│           │   │   ├── types/
│           │   │   └── index.ts
│           │   │
│           │   ├── design-engine/              ← FR14–FR23b
│           │   │   ├── api/
│           │   │   │   ├── designApi.ts
│           │   │   │   ├── queryKeys.ts
│           │   │   │   ├── useGenerateAi.ts    ← polling de jobs (GET /ai/jobs/{jobId})
│           │   │   │   └── useRemoveBackground.ts
│           │   │   ├── components/
│           │   │   │   ├── canvas/             ← MIGRADO del prototipo — no reescribir
│           │   │   │   │   ├── CanvasEngine.tsx
│           │   │   │   │   ├── CanvasLayer.tsx
│           │   │   │   │   └── [~22 componentes Konva validados]
│           │   │   │   │   └── __tests__/
│           │   │   │   │       └── CanvasEngine.test.tsx ← requiere mock HTMLCanvasElement
│           │   │   │   ├── toolbar/
│           │   │   │   │   ├── AiGeneratorPanel.tsx
│           │   │   │   │   ├── TextToolPanel.tsx
│           │   │   │   │   └── ImageUploadPanel.tsx
│           │   │   │   └── PrintQualityAlert.tsx
│           │   │   ├── pages/
│           │   │   │   └── DesignStudioPage.tsx
│           │   │   ├── store/
│           │   │   │   └── designStore.ts      ← Zustand 5, layers, undo/redo 30 snapshots
│           │   │   ├── schemas/
│           │   │   │   └── designSnapshot.schema.ts ← DesignSnapshotSchema Zod — contrato inmutable
│           │   │   ├── types/
│           │   │   └── index.ts
│           │   │
│           │   ├── catalog/                    ← FR9–FR13
│           │   │   ├── api/
│           │   │   │   ├── catalogApi.ts
│           │   │   │   ├── queryKeys.ts
│           │   │   │   ├── useGarments.ts
│           │   │   │   └── usePrintZones.ts
│           │   │   ├── components/
│           │   │   │   ├── GarmentCard.tsx
│           │   │   │   ├── GarmentSelector.tsx
│           │   │   │   └── ColorPicker.tsx
│           │   │   ├── pages/
│           │   │   │   └── CatalogPage.tsx
│           │   │   ├── types/
│           │   │   └── index.ts
│           │   │
│           │   ├── checkout/                   ← FR24–FR31b
│           │   │   ├── api/
│           │   │   │   ├── orderApi.ts
│           │   │   │   ├── queryKeys.ts
│           │   │   │   └── useConfirmOrder.ts
│           │   │   ├── components/
│           │   │   │   ├── CheckoutForm.tsx
│           │   │   │   ├── AddressInput.tsx
│           │   │   │   └── OrderSummary.tsx
│           │   │   ├── pages/
│           │   │   │   └── CheckoutPage.tsx
│           │   │   ├── schemas/
│           │   │   │   └── checkout.schema.ts  ← Zod
│           │   │   ├── types/
│           │   │   └── index.ts
│           │   │
│           │   ├── orders/                     ← Historial + tracking
│           │   │   ├── api/
│           │   │   │   ├── queryKeys.ts
│           │   │   │   └── useOrderStatus.ts
│           │   │   ├── components/
│           │   │   │   └── OrderStatusTimeline.tsx
│           │   │   ├── pages/
│           │   │   │   └── OrderHistoryPage.tsx
│           │   │   └── index.ts
│           │   │
│           │   ├── production-queue/           ← FR32–FR36b (portal taller)
│           │   │   ├── api/
│           │   │   │   ├── queryKeys.ts
│           │   │   │   ├── useProductionJobs.ts
│           │   │   │   └── useUpdateJobStatus.ts
│           │   │   ├── components/
│           │   │   │   ├── ProductionJobCard.tsx
│           │   │   │   ├── ProductionQueue.tsx
│           │   │   │   └── DesignPreview.tsx
│           │   │   ├── pages/
│           │   │   │   └── ProductionDashboardPage.tsx
│           │   │   └── index.ts
│           │   │
│           │   ├── company-admin/              ← FR40–FR45c
│           │   │   ├── api/
│           │   │   ├── components/
│           │   │   ├── pages/
│           │   │   │   └── CompanyAdminPage.tsx
│           │   │   └── index.ts
│           │   │
│           │   └── presential/                ← FR46–FR48 (modo punto físico, tablet-first)
│           │       ├── api/
│           │       │   └── presentialApi.ts
│           │       ├── components/
│           │       │   └── PresentialOrderForm.tsx ← touch-first, sin hover states
│           │       ├── pages/
│           │       │   └── PresentialModePage.tsx
│           │       ├── types/
│           │       │   └── presentialSession.ts    ← token de quiosco (larga duración) vs sesión operador
│           │       └── index.ts
│           │       ← NOTA: auth mode (quiosco vs operador), offline handling,
│           │         y pago presencial requieren decisión antes de implementar FR46
│           │
│           ├── shared/
│           │   ├── components/
│           │   │   ├── ui/                    ← Button, Input, Badge, Modal, Skeleton
│           │   │   ├── layout/
│           │   │   │   ├── CustomerLayout.tsx
│           │   │   │   ├── WorkshopLayout.tsx
│           │   │   │   └── PresentialLayout.tsx ← landscape tablet, touch-first
│           │   │   └── error/
│           │   │       ├── ErrorBoundary.tsx
│           │   │       └── ErrorPage.tsx
│           │   ├── hooks/
│           │   │   ├── useToast.ts
│           │   │   └── usePagination.ts
│           │   ├── lib/
│           │   │   ├── apiClient.ts            ← fetch wrapper; ver especificación abajo
│           │   │   ├── serverErrorMapper.ts    ← RFC 7807 errors[] → react-hook-form setError()
│           │   │   └── queryClient.ts          ← TanStack Query config global
│           │   └── types/
│           │       └── api.types.ts            ← ProblemDetails, PagedResult<T>, etc.
│           │
│           └── config/
│               └── env.ts                      ← VITE_API_URL con tipos seguros
│
├── tests/
│   └── backend/
│       ├── AiWearStudio.Users.Tests/
│       ├── AiWearStudio.DesignEngine.Tests/
│       ├── AiWearStudio.Orders.Tests/
│       ├── AiWearStudio.Catalog.Tests/
│       ├── AiWearStudio.CompanyAdmin.Tests/
│       ├── AiWearStudio.ProductionQueue.Tests/
│       └── AiWearStudio.Architecture.Tests/    ← NetArchTest rules:
│           ← Core_Should_Not_Reference_Infrastructure
│           ← Domain_Should_Not_Reference_ApplicationServices
│           ← No_CrossBC_Direct_References
│           ← No_RawSql_Without_TenantWrapper (ExecuteSqlRawAsync prohibido)
│
├── docker-compose.yml                          ← dev (ver abajo)
├── docker-compose.override.yml                 ← dev overrides (puertos locales, hot reload)
├── docker-compose.test.yml                     ← CI mínimo (postgres + redis sin UI)
├── Dockerfiles/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── scripts/
│   └── init-minio-buckets.sh                  ← crea buckets: design-assets, order-snapshots
├── Makefile                                    ← make dev / make test / make migrate
└── .env.example                               ← CRÍTICO: committeado, .env real en .gitignore
```

---

### Especificación: `docker-compose.yml` (estructura mínima)

```yaml
services:
  postgres:
    image: postgres:17-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  minio:
    image: minio/minio
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]

  minio-init:                        # corre UNA VEZ y termina
    image: minio/mc
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: /bin/sh /scripts/init-minio-buckets.sh

  api:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio-init:
        condition: service_completed_successfully
```

---

### Especificación: `shared/lib/apiClient.ts` (contratos requeridos)

```typescript
// Requisitos mínimos no negociables:

// 1. Auth header automático
headers['Authorization'] = `Bearer ${accessToken}`;

// 2. Tenant context en header
headers['X-Tenant-Id'] = tenantId;

// 3. Correlation ID para trazabilidad
headers['X-Correlation-Id'] = crypto.randomUUID();

// 4. Refresh token con mutex (previene race condition con N requests paralelos)
// refreshPromise singleton: si hay refresh en curso, todos los requests en vuelo esperan
// NO retries independientes por request

// 5. Timeout diferenciado por tipo de endpoint
// CRUD / catálogo: 10s
// AI endpoints (/api/ai/*): 50s (mayor que el hard timeout 45s del backend)

// 6. RFC 7807 error parsing
// Todos los errores ≥400 se parsean como ProblemDetails
// 503 → mensaje user-friendly (no exponer detail interno)
```

---

### Flujo Crítico — Confirm Order (ACID corregido)

```
POST /api/v1/orders/confirm  (+ Idempotency-Key header)
  → ConfirmOrderCommandHandler
    1. Query a Catalog: obtener GarmentDto + PrintZoneDto
    2. Construir CatalogSnapshot (congela datos del catálogo)
    3. Construir DesignSnapshot (congela diseño con CatalogSnapshot embebido)
    4. Crear Order aggregate
    5. Crear OutboxMessage(OrderConfirmedIntegrationEvent) — en memoria
    6. OrdersDbContext.SaveChangesAsync()
       ← ATÓMICO: orders + design_snapshots + outbox_messages en schema orders
  ← 201 Created

[Hangfire OutboxProcessorJob — asíncrono, fuera del request]
  → Lee outbox_messages WHERE processed_at IS NULL
  → Publica OrderConfirmedIntegrationEvent (TenantId del mensaje)
    → OnOrderConfirmedHandler (ProductionQueue) → crea ProductionJob
    → OnOrderConfirmedNotifyCustomer (Notifications) → SMS Twilio
  → Marca outbox_message.processed_at = NOW()
```

---

### Mapeo FR → Estructura

| FR Category | Backend BC | Frontend Feature |
|---|---|---|
| FR1–FR8 Auth y RBAC | `modules/Users/` | `features/auth/` |
| FR9–FR13 Catálogo | `modules/Catalog/` (seeds del prototipo) | `features/catalog/` |
| FR14–FR23b Herramientas diseño | `modules/DesignEngine/` (proxy IA) | `features/design-engine/` (canvas) |
| FR24–FR31b Pedidos | `modules/Orders/` (ACID atómico) | `features/checkout/` + `features/orders/` |
| FR32–FR36b Cola producción | `modules/ProductionQueue/` | `features/production-queue/` |
| FR37–FR39b Notificaciones | `AiWearStudio.Notifications/` | — |
| FR40–FR45c Company Admin | `modules/CompanyAdmin/` | `features/company-admin/` |
| FR46–FR48 Modo presencial | mismo flujo Orders BC | `features/presential/` (tablet-first) |

---

*Step 6 validado con análisis multi-agente (Winston — Arquitecto, Amelia — Ingeniería). Correcciones críticas: DesignSnapshot en OrdersDbContext (ACID), OutboxMessage en Infrastructure, IAssetStorage en DesignEngine.Core, CatalogSnapshot+PrintZoneSnapshot como value objects. Agregados: apiClient.ts spec, Docker Compose healthchecks, vitest setup, presential session types, Architecture.Tests SQL rule.*

---

## Validación de Arquitectura

### Coherencia

**Compatibilidad tecnológica:** .NET 10 + EF Core + Npgsql + PostgreSQL 17 + Hangfire + Redis 7 + React 19 + TanStack Query v5 + Zustand 5 + React Router v7 + Zod + Azure Container Apps — todas con soporte activo, sin conflictos. ✅

**Consistencia de patrones:** RFC 7807 + ExceptionHandlerMiddleware, HasQueryFilter + ITenantContext, Outbox + Hangfire, DomainEvent/IntegrationEvent, pipeline MediatR — forman una cadena coherente sin contradicciones. ✅

**Alineación estructural:** 6 BCs backend ↔ 7 features frontend, DesignSnapshot en OrdersDbContext (ACID corregido), Outbox en Infrastructure, IAssetStorage en DesignEngine — todos los límites consistentes. ✅

---

### Cobertura de Requisitos

**54 FRs en 8 categorías:**

| FR Category | Cobertura | Estado |
|---|---|---|
| FR1–FR8 Auth y RBAC | `Users/` BC + JWT + `TenantContextMiddleware` + `HasQueryFilter` | ✅ |
| FR9–FR13 Catálogo | `Catalog/` BC + seeds SQL + `PrintZoneDto` hot path | ✅ |
| FR14–FR23b Diseño | `DesignEngine/` BC (proxy IA, drafts) + canvas Konva | ✅ |
| FR24–FR31b Pedidos | `Orders/` BC + ACID atómico + `CatalogSnapshot` + Outbox | ✅ |
| FR32–FR36b Cola | `ProductionQueue/` BC + `OnOrderConfirmedHandler` | ✅ |
| FR37–FR39b Notificaciones | `AiWearStudio.Notifications/` + Twilio | ✅ |
| FR40–FR45c Company Admin | `CompanyAdmin/` BC + planes + memberships + audit trail | ✅ |
| FR46–FR48 Presencial | `features/presential/` + flujo Orders (auth mode pendiente) | ⚠️ Parcial |

**NFRs clave:** NFR-PERF-01 (Redis + índices), NFR-PERF-01b (Hangfire + Polly 45s), NFR-SEC-01 (HasQueryFilter → 404), NFR-REL-01 (Azure Container Apps + health), NFR-OBS-01/02 (HealthChecks + Serilog), NFR-INT-05/06 (Idempotency + RFC 7807) — todos cubiertos. ✅

---

### Decisiones Críticas Adicionales (Party Mode — Winston)

**D13 — ICatalogReadService para ConfirmOrderCommandHandler**

El handler necesita datos del Catalog para construir `CatalogSnapshot`. La estrategia:

```csharp
// En Orders.Core/Application/Interfaces/
public interface ICatalogReadService
{
    Task<CatalogSnapshot?> GetSnapshotAsync(Guid garmentId, Guid colorVariantId, CancellationToken ct);
}

// Implementación en Orders.Infrastructure:
// Lee de un Redis read model publicado por Catalog vía sus propios IntegrationEvents
// Tolerancia: 30 segundos de lag — aceptable para confirmación de orden
// Si el read model no está disponible → Result.Failure("CATALOG_DATA_UNAVAILABLE")
```

**Flujo de actualización del read model:**
```
Catalog modifica garment/zone → publica CatalogUpdatedIntegrationEvent (Outbox)
  → Handler en Orders.Infrastructure actualiza Redis read model
  → ConfirmOrderCommandHandler siempre lee de Redis (nunca directamente de CatalogDbContext)
```

**D14 — Inmutabilidad de DesignSnapshot en el Aggregate (Zero-Reinterpretation Guarantee)**

```csharp
// Orders/Domain/Entities/Order.cs
public class Order : AggregateRoot
{
    private DesignSnapshot? _designSnapshot;

    public void AttachDesignSnapshot(DesignSnapshot snapshot)
    {
        if (Status != OrderStatus.Pending)
            throw new DomainException("DesignSnapshot cannot be replaced after order confirmation.");
        if (_designSnapshot != null)
            throw new DomainException("DesignSnapshot is already attached and immutable.");
        _designSnapshot = snapshot;
    }
    // Sin setter público. Sin método de mutación post-confirmación.
}
```

El invariante vive en el **Domain** (no solo en Application). Si solo vive en Application, es bypasseable.

**D15 — Versionado del schema de DesignSnapshot**

```json
{
  "schemaVersion": 1,
  "layers": [...],
  "canvasConfig": {...}
}
```

El JSON persisted en `design_snapshots.payload` incluye `schemaVersion`. Si el schema evoluciona, el deserializador en `ProductionQueue` usa un migration handler por versión. Sin esto, pedidos antiguos producen datos corruptos silenciosamente al deserializar con el schema nuevo.

```csharp
// Orders/Infrastructure/Persistence/
public class DesignSnapshotMigrationHandler
{
    public DesignSnapshotDto MigrateTo(int currentVersion, JsonDocument rawPayload)
    {
        return currentVersion switch
        {
            1 => DeserializeV1(rawPayload),
            // futuros: 2 => MigrateV1ToV2(rawPayload), ...
            _ => throw new InvalidOperationException($"Unknown schema version: {currentVersion}")
        };
    }
}
```

---

### Análisis de Gaps (actualizado)

**Gaps críticos — resueltos en este paso:**

| Gap | Solución |
|---|---|
| `ICatalogReadService` sin definir | Definido: Redis read model, interface en Orders.Core/Application/Interfaces |
| Inmutabilidad `DesignSnapshot` solo en Application | Corregido: invariante en Domain (Order aggregate) |
| Schema versioning de DesignSnapshot | Definido: `schemaVersion` en JSON + `DesignSnapshotMigrationHandler` |

**Gaps importantes (a resolver antes de sus sprints respectivos):**

| # | Gap | Sprint objetivo |
|---|---|---|
| G1 | `IRateLimitPolicy` — restaurar en SharedKernel/Common | Sprint 1 (pre-sprint) |
| G2 | `Version` field en `DesignDraft` para optimistic concurrency (ETag + 412) | Sprint de DesignEngine |
| G3 | `AuditEntry` entity en CompanyAdmin | Sprint de CompanyAdmin |

**Gaps menores (aceptables):**

| # | Gap | Nota |
|---|---|---|
| G4 | Presential auth strategy (quiosco vs operador) | Decidir antes de FR46 |
| G5 | `DesignSnapshotSchema.ts` contenido | Acción pre-sprint — definir después de que el aggregate esté frozen |

---

### Acciones Pre-Sprint (orden corregido)

El orden original tenía un riesgo: `DesignSnapshotSchema.ts` antes de que el dominio esté estabilizado produce reescritura doble. Orden correcto:

| # | Acción | Justificación del orden |
|---|---|---|
| 1 | **Testcontainers setup** + `docker-compose.test.yml` | Desbloquea TODOS los tests de integración. Sin esto, nada del backend se puede verificar. |
| 2 | **Test de integración crítico** (tenant isolation + Outbox + commit atómico) | Debe existir ANTES de escribir una línea de dominio. Descubrirlo en Sprint 2 es muy costoso. |
| 3 | **bgRemoval benchmark** en PNG 4K | Decisión técnica de alto riesgo — si BFS > 2s P95, invierte el fallback. Hacerlo temprano evita reescribir la integración Gemini. |
| 4 | **`IRateLimitPolicy` interface** | 15 minutos. Permite que DesignEngine y CompanyAdmin la referencien desde Sprint 1. |
| 5 | **`DesignSnapshotSchema.ts` (Zod)** | SOLO después de que el aggregate `DesignSnapshot` esté frozen. Si el modelo cambia, el schema debe reescribirse. |

---

### Checklist de Completitud Arquitectónica

**Análisis de Requisitos**
- [x] Contexto del proyecto analizado en profundidad (brownfield, dev único, Fase 1/2/3)
- [x] Escala y complejidad evaluadas (50→500 usuarios simultáneos)
- [x] Restricciones técnicas identificadas (monolito modular, Clean Architecture híbrida)
- [x] Cross-cutting concerns mapeados (10 concerns + 3 decisiones adicionales este paso)

**Decisiones Arquitectónicas**
- [x] Decisiones críticas documentadas con versiones (15 decisiones en Steps 4 + 7)
- [x] Stack tecnológico completamente especificado
- [x] Patrones de integración definidos (Outbox, MediatR, Polling, ICatalogReadService)
- [x] Consideraciones de performance abordadas

**Patrones de Implementación**
- [x] Convenciones de naming establecidas (snake_case DB, PascalCase C#, camelCase TS)
- [x] Patrones de estructura definidos (features/, modules/, Clean Architecture)
- [x] Patrones de comunicación especificados (DomainEvent/IntegrationEvent/Outbox)
- [x] Patrones de proceso documentados (error handling, validación, tenant isolation, testing)

**Estructura del Proyecto**
- [x] Estructura de directorios completa y específica (19 proyectos detallados)
- [x] Límites de componentes establecidos (reglas de dependencia inmutables)
- [x] Puntos de integración mapeados (ACID flow, Outbox flow, polling AI, CatalogReadService)
- [x] Mapeo FR → estructura completo (8 categorías de FR → ubicaciones físicas)

---

### Evaluación de Preparación Final

**Estado general: LISTO CON GAPS MENORES**

**Nivel de confianza:** Alto

**Walking skeleton Sprint 1 (scope mínimo viable):**
Un endpoint HTTP completo a través de todas las capas (Minimal API → MediatR → Handler → Repository → PostgreSQL) con autenticación JWT básica y un test de integración que pase en CI con Testcontainers. Ni Outbox ni canvas en Sprint 1. Solo que las capas hablen sin explotar.

**Fortalezas clave:**
- ACID atómico del submit resuelto estructuralmente (DesignSnapshot en OrdersDbContext)
- Zero-Reinterpretation Guarantee con invariante en Domain + schema versioning
- Outbox Pattern con idempotencia en destino elimina inconsistencia cross-BC
- Multi-tenancy desde el día 1 con bajo costo de implementación
- Todos los 54 FRs tienen ubicación arquitectónica definida

**Handoff a implementación:**

```bash
# Secuencia de arranque (scaffolding order)
# 1. Crear la solución backend
dotnet new sln -n AiWearStudio -o src/backend
dotnet new classlib -n AiWearStudio.SharedKernel -o src/backend/infrastructure/AiWearStudio.SharedKernel

# 2. Crear módulos (por BC, empezando por Users)
dotnet new classlib -n AiWearStudio.Users.Core -o src/backend/modules/Users/AiWearStudio.Users.Core
dotnet new classlib -n AiWearStudio.Users.Infrastructure -o src/backend/modules/Users/AiWearStudio.Users.Infrastructure

# 3. Crear proyecto API
dotnet new webapi -n AiWearStudio.Api -o src/backend/AiWearStudio.Api --no-openapi

# 4. Test crítico de arranque
dotnet new xunit -n AiWearStudio.Architecture.Tests -o tests/backend/AiWearStudio.Architecture.Tests

# 5. Frontend
cd src/frontend && npm install && npm run dev
```

**Guía de arranque completa:** artefacto `DAY_ONE.md` pendiente de crear — debe incluir los 5 comandos anteriores + verificación de que 3 tests pasan + configuración de `.env` desde `.env.example`.

---

*Step 7 completado con análisis multi-agente (Winston — Arquitecto, Amelia — Ingeniería). Incorpora: ICatalogReadService con Redis read model (D13), inmutabilidad de DesignSnapshot en Domain (D14), schema versioning con DesignSnapshotMigrationHandler (D15), orden corregido de acciones pre-sprint, test de integración crítico como prerequisito de Sprint 1, walking skeleton scope, y scaffolding order inicial.*
