# DAY_ONE.md — AI Wear Studio

> Guía de arranque para el agente Developer. Ejecutar en este orden exacto antes de iniciar Story 1.2.
> Ningún BC puede avanzar sin que los gates de esta guía estén en verde.

---

## Contexto Rápido

- **Stack:** .NET 10 (C#) + React 19 + Vite + PostgreSQL 17 + Redis 7 + MinIO
- **Arquitectura:** Monolito modular · Clean Architecture Híbrida (Opción C)
- **19 proyectos:** 12 source + 7 test
- **Multi-tenancy:** `tenant_id` row-level + `HasQueryFilter` global desde el primer schema
- **Invariante #1:** Zero-Reinterpretation — DesignSnapshot + OutboxMessage en una `SaveChangesAsync()`
- **Artefacto de referencia:** `_bmad-output/planning-artifacts/epics.md` → Story 1.1

---

## Fase 0 — Antes de Escribir Código

### 0.1 Repositorio y rama

```bash
git init ai-wear-studio
cd ai-wear-studio
git checkout -b main
```

### 0.2 `.env.example` — commiteado al repo

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aiwearstudio
POSTGRES_USER=aiwear
POSTGRES_PASSWORD=changeme_dev

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_DESIGNS=designs
MINIO_BUCKET_ASSETS=assets

# JWT
JWT_SECRET=dev_secret_min_32_chars_changeme!!
JWT_ISSUER=ai-wear-studio
JWT_AUDIENCE=ai-wear-studio-clients
JWT_TTL_MINUTES=60

# Gemini
GEMINI_API_KEY=your_gemini_key_here

# Hangfire
HANGFIRE_DASHBOARD_ENABLED=true

# Twilio (mock en dev)
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_FROM_NUMBER=+15005550006

# Platform admin seed
PLATFORM_ADMIN_EMAIL=admin@aiwearstudio.local
PLATFORM_ADMIN_PASSWORD=Admin1234!

# Tenant seed
SEED_TENANT_ID=00000000-0000-0000-0000-000000000001
SEED_COMPANY_NAME=Demo Taller
```

> ⚠️ Copiar a `.env` local (en `.gitignore`). Nunca commitear el `.env` real.

---

## Fase 1 — Infraestructura Local

### 1.1 `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]

volumes:
  pgdata:
  miniodata:
```

### 1.2 `docker-compose.test.yml`

```yaml
services:
  postgres-test:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: aiwearstudio_test
      POSTGRES_USER: aiwear_test
      POSTGRES_PASSWORD: test_password
    ports: ["5433:5432"]

  redis-test:
    image: redis:7-alpine
    ports: ["6380:6379"]
```

### 1.3 Script `init-buckets.sh` (ejecutar una vez post-MinIO)

```bash
#!/bin/bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/designs --ignore-existing
mc mb local/assets --ignore-existing
echo "✅ Buckets inicializados"
```

### 1.4 `Makefile`

```makefile
.PHONY: dev test migrate

dev:
	docker-compose up -d
	cd src/backend && dotnet run --project AiWearStudio.Api

test:
	docker-compose -f docker-compose.test.yml up -d
	cd src/backend && dotnet test
	docker-compose -f docker-compose.test.yml down

migrate:
	cd src/backend && dotnet ef database update --project modules/Users/AiWearStudio.Users.Infrastructure
	cd src/backend && dotnet ef database update --project modules/CompanyAdmin/AiWearStudio.CompanyAdmin
	cd src/backend && dotnet ef database update --project modules/Catalog/AiWearStudio.Catalog
	cd src/backend && dotnet ef database update --project modules/DesignEngine/AiWearStudio.DesignEngine.Infrastructure
	cd src/backend && dotnet ef database update --project modules/Orders/AiWearStudio.Orders.Infrastructure
	cd src/backend && dotnet ef database update --project modules/ProductionQueue/AiWearStudio.ProductionQueue
```

---

## Fase 2 — Scaffold de Solución .NET

Ejecutar desde `src/backend/`:

```bash
# Solución raíz
dotnet new sln -n AiWearStudio

# ─── SharedKernel ───────────────────────────────────────────────
dotnet new classlib -n AiWearStudio.SharedKernel -o infrastructure/AiWearStudio.SharedKernel
dotnet sln add infrastructure/AiWearStudio.SharedKernel

# ─── BC Users (2 proyectos) ────────────────────────────────────
dotnet new classlib -n AiWearStudio.Users.Core    -o modules/Users/AiWearStudio.Users.Core
dotnet new classlib -n AiWearStudio.Users.Infrastructure -o modules/Users/AiWearStudio.Users.Infrastructure
dotnet sln add modules/Users/AiWearStudio.Users.Core
dotnet sln add modules/Users/AiWearStudio.Users.Infrastructure

# ─── BC DesignEngine (2 proyectos) ────────────────────────────
dotnet new classlib -n AiWearStudio.DesignEngine.Core    -o modules/DesignEngine/AiWearStudio.DesignEngine.Core
dotnet new classlib -n AiWearStudio.DesignEngine.Infrastructure -o modules/DesignEngine/AiWearStudio.DesignEngine.Infrastructure
dotnet sln add modules/DesignEngine/AiWearStudio.DesignEngine.Core
dotnet sln add modules/DesignEngine/AiWearStudio.DesignEngine.Infrastructure

# ─── BC Orders (2 proyectos) ──────────────────────────────────
dotnet new classlib -n AiWearStudio.Orders.Core    -o modules/Orders/AiWearStudio.Orders.Core
dotnet new classlib -n AiWearStudio.Orders.Infrastructure -o modules/Orders/AiWearStudio.Orders.Infrastructure
dotnet sln add modules/Orders/AiWearStudio.Orders.Core
dotnet sln add modules/Orders/AiWearStudio.Orders.Infrastructure

# ─── BCs simples (1 proyecto c/u) ─────────────────────────────
dotnet new classlib -n AiWearStudio.CompanyAdmin    -o modules/CompanyAdmin/AiWearStudio.CompanyAdmin
dotnet new classlib -n AiWearStudio.Catalog         -o modules/Catalog/AiWearStudio.Catalog
dotnet new classlib -n AiWearStudio.ProductionQueue -o modules/ProductionQueue/AiWearStudio.ProductionQueue
dotnet sln add modules/CompanyAdmin/AiWearStudio.CompanyAdmin
dotnet sln add modules/Catalog/AiWearStudio.Catalog
dotnet sln add modules/ProductionQueue/AiWearStudio.ProductionQueue

# ─── Notifications (módulo infraestructura, no BC) ────────────
dotnet new classlib -n AiWearStudio.Notifications -o AiWearStudio.Notifications
dotnet sln add AiWearStudio.Notifications

# ─── API entry point ──────────────────────────────────────────
dotnet new webapi -n AiWearStudio.Api -o AiWearStudio.Api --no-openapi
dotnet sln add AiWearStudio.Api

# ─── Test projects ────────────────────────────────────────────
dotnet new xunit -n AiWearStudio.Users.Tests          -o tests/AiWearStudio.Users.Tests
dotnet new xunit -n AiWearStudio.DesignEngine.Tests    -o tests/AiWearStudio.DesignEngine.Tests
dotnet new xunit -n AiWearStudio.Orders.Tests          -o tests/AiWearStudio.Orders.Tests
dotnet new xunit -n AiWearStudio.Catalog.Tests         -o tests/AiWearStudio.Catalog.Tests
dotnet new xunit -n AiWearStudio.CompanyAdmin.Tests    -o tests/AiWearStudio.CompanyAdmin.Tests
dotnet new xunit -n AiWearStudio.ProductionQueue.Tests -o tests/AiWearStudio.ProductionQueue.Tests
dotnet new xunit -n AiWearStudio.Architecture.Tests    -o tests/AiWearStudio.Architecture.Tests
dotnet sln add tests/AiWearStudio.Users.Tests
dotnet sln add tests/AiWearStudio.DesignEngine.Tests
dotnet sln add tests/AiWearStudio.Orders.Tests
dotnet sln add tests/AiWearStudio.Catalog.Tests
dotnet sln add tests/AiWearStudio.CompanyAdmin.Tests
dotnet sln add tests/AiWearStudio.ProductionQueue.Tests
dotnet sln add tests/AiWearStudio.Architecture.Tests
```

**Verificar totales:** `dotnet sln list | wc -l` → debe mostrar 19 proyectos.

---

## Fase 3 — Referencias entre Proyectos

### Reglas de dependencia (inmutables)

```
SharedKernel        → sin dependencias salientes
BC.Core             → SharedKernel únicamente
BC.Infrastructure   → BC.Core + SharedKernel + NuGet externos
Notifications       → SharedKernel
Api                 → todos los .Core (tipos) + todos los .Infrastructure (DI)
BC.Core → BC.Core   → PROHIBIDO
```

### Comandos de referencia

```bash
# BC Users
dotnet add modules/Users/AiWearStudio.Users.Core reference infrastructure/AiWearStudio.SharedKernel
dotnet add modules/Users/AiWearStudio.Users.Infrastructure reference modules/Users/AiWearStudio.Users.Core
dotnet add modules/Users/AiWearStudio.Users.Infrastructure reference infrastructure/AiWearStudio.SharedKernel

# BC DesignEngine
dotnet add modules/DesignEngine/AiWearStudio.DesignEngine.Core reference infrastructure/AiWearStudio.SharedKernel
dotnet add modules/DesignEngine/AiWearStudio.DesignEngine.Infrastructure reference modules/DesignEngine/AiWearStudio.DesignEngine.Core
dotnet add modules/DesignEngine/AiWearStudio.DesignEngine.Infrastructure reference infrastructure/AiWearStudio.SharedKernel

# BC Orders
dotnet add modules/Orders/AiWearStudio.Orders.Core reference infrastructure/AiWearStudio.SharedKernel
dotnet add modules/Orders/AiWearStudio.Orders.Infrastructure reference modules/Orders/AiWearStudio.Orders.Core
dotnet add modules/Orders/AiWearStudio.Orders.Infrastructure reference infrastructure/AiWearStudio.SharedKernel

# BCs simples
dotnet add modules/CompanyAdmin/AiWearStudio.CompanyAdmin reference infrastructure/AiWearStudio.SharedKernel
dotnet add modules/Catalog/AiWearStudio.Catalog reference infrastructure/AiWearStudio.SharedKernel
dotnet add modules/ProductionQueue/AiWearStudio.ProductionQueue reference infrastructure/AiWearStudio.SharedKernel

# Notifications
dotnet add AiWearStudio.Notifications reference infrastructure/AiWearStudio.SharedKernel

# API → todos
dotnet add AiWearStudio.Api reference modules/Users/AiWearStudio.Users.Core
dotnet add AiWearStudio.Api reference modules/Users/AiWearStudio.Users.Infrastructure
dotnet add AiWearStudio.Api reference modules/DesignEngine/AiWearStudio.DesignEngine.Core
dotnet add AiWearStudio.Api reference modules/DesignEngine/AiWearStudio.DesignEngine.Infrastructure
dotnet add AiWearStudio.Api reference modules/Orders/AiWearStudio.Orders.Core
dotnet add AiWearStudio.Api reference modules/Orders/AiWearStudio.Orders.Infrastructure
dotnet add AiWearStudio.Api reference modules/CompanyAdmin/AiWearStudio.CompanyAdmin
dotnet add AiWearStudio.Api reference modules/Catalog/AiWearStudio.Catalog
dotnet add AiWearStudio.Api reference modules/ProductionQueue/AiWearStudio.ProductionQueue
dotnet add AiWearStudio.Api reference AiWearStudio.Notifications
```

---

## Fase 4 — Paquetes NuGet Base

### SharedKernel

```bash
cd infrastructure/AiWearStudio.SharedKernel
dotnet add package MediatR
dotnet add package FluentValidation
```

### Todos los BC.Infrastructure + BCs simples

```bash
# Repetir para cada Infrastructure y BC simple:
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design  # solo en Infrastructure
```

### BC Users.Infrastructure

```bash
dotnet add package Microsoft.AspNetCore.Cryptography.KeyDerivation  # PasswordHasher
dotnet add package System.IdentityModel.Tokens.Jwt
```

### DesignEngine.Infrastructure

```bash
dotnet add package StackExchange.Redis
dotnet add package AWSSDK.S3  # MinIO es S3-compatible
dotnet add package Polly
```

### API

```bash
cd AiWearStudio.Api
dotnet add package MediatR.Extensions.Microsoft.DependencyInjection
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Console
dotnet add package Hangfire.Core
dotnet add package Hangfire.PostgreSql
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.Extensions.Diagnostics.HealthChecks
dotnet add package HealthChecks.NpgSql
dotnet add package HealthChecks.Redis
```

### Test projects

```bash
# Architecture tests
cd tests/AiWearStudio.Architecture.Tests
dotnet add package NetArchTest.Rules

# Integration tests (Testcontainers)
dotnet add package Testcontainers
dotnet add package Testcontainers.PostgreSql
dotnet add package Microsoft.EntityFrameworkCore.InMemory  # para unit tests puros
```

---

## Fase 5 — SharedKernel: Tipos Base

Crear en `infrastructure/AiWearStudio.SharedKernel/`:

### `Domain/Entity.cs`

```csharp
namespace AiWearStudio.SharedKernel.Domain;

public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    private readonly List<IDomainEvent> _domainEvents = [];
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();
    protected void AddDomainEvent(IDomainEvent @event) => _domainEvents.Add(@event);
    public void ClearDomainEvents() => _domainEvents.Clear();
}
```

### `Domain/AggregateRoot.cs`

```csharp
namespace AiWearStudio.SharedKernel.Domain;

public abstract class AggregateRoot : Entity { }
```

### `Domain/ValueObject.cs`

```csharp
namespace AiWearStudio.SharedKernel.Domain;

public abstract class ValueObject
{
    protected abstract IEnumerable<object> GetEqualityComponents();
    public override bool Equals(object? obj) =>
        obj is ValueObject vo && GetEqualityComponents().SequenceEqual(vo.GetEqualityComponents());
    public override int GetHashCode() =>
        GetEqualityComponents().Aggregate(0, HashCode.Combine);
}
```

### `Domain/IDomainEvent.cs`

```csharp
using MediatR;
namespace AiWearStudio.SharedKernel.Domain;

public interface IDomainEvent : INotification { }
```

### `Domain/DomainException.cs`

```csharp
namespace AiWearStudio.SharedKernel.Domain;

public class DomainException(string message) : Exception(message) { }
```

### `Application/ICommand.cs` y `IQuery.cs`

```csharp
using MediatR;
namespace AiWearStudio.SharedKernel.Application;

public interface ICommand<TResponse> : IRequest<TResponse> { }
public interface IQuery<TResponse> : IRequest<TResponse> { }
```

### `Application/Result.cs`

```csharp
namespace AiWearStudio.SharedKernel.Application;

public class Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsSuccess { get; }

    private Result(T value) { Value = value; IsSuccess = true; }
    private Result(string error) { Error = error; IsSuccess = false; }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error) => new(error);
}
```

### `Common/ITenantContext.cs`

```csharp
namespace AiWearStudio.SharedKernel.Common;

public interface ITenantContext
{
    Guid? TenantId { get; }           // null para platform_admin
    bool RequiresTenantFilter { get; }  // false para platform_admin
    bool IsAuthenticated { get; }
}
```

### `Common/IAssetStorage.cs`

```csharp
namespace AiWearStudio.SharedKernel.Common;

public interface IAssetStorage
{
    Task<string> UploadAsync(string bucket, string key, Stream content, string contentType, CancellationToken ct = default);
    Task<Stream> DownloadAsync(string bucket, string key, CancellationToken ct = default);
    Task DeleteAsync(string bucket, string key, CancellationToken ct = default);
}
```

### `Common/IRateLimitPolicy.cs`

```csharp
namespace AiWearStudio.SharedKernel.Common;

public interface IRateLimitPolicy
{
    Task<bool> TryConsumeAsync(Guid tenantId, Guid userId, string plan, string feature, CancellationToken ct = default);
    Task<int> GetRemainingAsync(Guid tenantId, Guid userId, string plan, string feature, CancellationToken ct = default);
    Task RefundAsync(Guid tenantId, Guid userId, string plan, string feature, CancellationToken ct = default);
}
```

> ⚠️ **ARCH-05:** `IRateLimitPolicy` se define aquí en SharedKernel aunque la implementación Redis llegue en el sprint de DesignEngine. Cualquier BC puede declarar una dependencia sobre esta interface hoy.

---

## Fase 6 — MediatR Pipeline (en `AiWearStudio.Api`)

El pipeline MediatR tiene un orden inmutable:

```
IdempotencyBehavior → LoggingBehavior → ValidationBehavior → Handler
```

### Behaviors a crear en `AiWearStudio.Api/Behaviors/` (o en SharedKernel si son genéricos):

```csharp
// IdempotencyBehavior — va PRIMERO; bloquea duplicados antes de cualquier log o validación
public class IdempotencyBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICommand<TResponse>
{
    // Verifica Redis con Idempotency-Key del HttpContext
    // Si key ya existe: retorna respuesta almacenada
    // Si no existe: ejecuta y almacena resultado con TTL configurable
}

// LoggingBehavior — va segundo; loguea input y output de cada comando
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
{
    // Log estructurado: { command_type, tenant_id, user_id, correlation_id, duration_ms }
}

// ValidationBehavior — va tercero; FluentValidation antes del handler
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICommand<TResponse>
{
    // Si hay errores de validación: throw ValidationException (mapeada a 400 por middleware)
}
```

### Registro en `Program.cs`:

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblies(
        typeof(Users.Core.AssemblyMarker).Assembly,
        typeof(DesignEngine.Core.AssemblyMarker).Assembly,
        typeof(Orders.Core.AssemblyMarker).Assembly,
        typeof(CompanyAdmin.AssemblyMarker).Assembly,
        typeof(Catalog.AssemblyMarker).Assembly,
        typeof(ProductionQueue.AssemblyMarker).Assembly
    );
    cfg.AddOpenBehavior(typeof(IdempotencyBehavior<,>));
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});
```

---

## Fase 7 — `IStartupFilter` de Validación de Captive Dependency

```csharp
// Detecta Singletons que capturan ITenantContext directamente (anti-pattern)
public class TenantContextCaptureValidationFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        ValidateSingletonsCaptureNoTenantContext();
        return next;
    }

    private static void ValidateSingletonsCaptureNoTenantContext()
    {
        // Inspeccionar descriptores de DI y lanzar InvalidOperationException
        // si un Singleton tiene ITenantContext como dependencia directa
    }
}

// Registro en Program.cs:
builder.Services.AddTransient<IStartupFilter, TenantContextCaptureValidationFilter>();
```

---

## Fase 8 — Testcontainers: Suite de Tests Críticos

Estos tests deben existir y pasar **antes de iniciar Story 1.2**.

Ubicación: `tests/AiWearStudio.Architecture.Tests/` o `tests/AiWearStudio.Users.Tests/`

### AC-RBAC-CROSS-TENANT

```csharp
[Fact]
public async Task OperatorFromTenantA_CannotAccessResourceOfTenantB_Returns404()
{
    // Arrange: crear Tenant A + Tenant B, crear operario en Tenant A
    // Act: operario de A solicita recurso de B
    // Assert: 404 — no 403, no 200
}
```

### AC-ATOMIC-01

```csharp
[Fact]
public async Task OrderConfirm_WhenOutboxWriteFails_RollsBackDesignSnapshot()
{
    // Arrange: simular fallo en escritura de OutboxMessage post-DesignSnapshot
    // Act: ejecutar POST /orders/confirm
    // Assert: ningún registro en orders, design_snapshots, ni outbox_messages
}
```

### AC-ATOMIC-02

```csharp
[Fact]
public async Task OrderConfirm_WhenDesignSnapshotWriteFails_RollsBackOrder()
{
    // Arrange: simular fallo en escritura de DesignSnapshot
    // Act: ejecutar POST /orders/confirm
    // Assert: ningún registro en orders ni outbox_messages
}
```

---

## Fase 9 — Pre-Sprints Obligatorios (Gates de Entrada)

Estas acciones tienen gate: no se puede iniciar la historia relacionada sin completarlas.

| # | Acción | Gate de | Archivo de resultado |
|---|--------|---------|---------------------|
| 1 | ✅ Testcontainers setup + AC-RBAC-CROSS-TENANT, AC-ATOMIC-01/02 en verde | Todas las historias | (este documento — Fase 8) |
| 2 | Benchmark `bgRemoval.ts` en PNG 4K (P95 en ms) | Story 3.2 | `_bmad-output/planning-artifacts/bg-removal-benchmark.md` |
| 3 | `IRateLimitPolicy` definida en SharedKernel | Story 3.3 | ✅ Fase 5 de este documento |
| 4 | `DesignSnapshotSchema.ts` (Zod, multi-vista) definida en `src/frontend/src/schemas/` | Story 3.1 | Ver schema en epics.md §Story 3.1 |
| 5 | `cross-schema-transaction-strategy.md` documentada | Story 4.3 | `_bmad-output/planning-artifacts/cross-schema-transaction-strategy.md` |

### Benchmark bgRemoval (acción #2)

```bash
# Ejecutar desde src/frontend/ con una imagen PNG 4K de prueba:
node --experimental-vm-modules scripts/benchmark-bg-removal.js \
  --input test-assets/sample-4k.png \
  --runs 10

# Criterio de decisión:
# P95 ≤ 2000ms → mantener bgRemoval.ts como primario, Gemini como fallback (default)
# P95 > 2000ms  → invertir: Gemini primero, bgRemoval.ts como fallback
#                  Documentar la decisión en bg-removal-benchmark.md
```

### DesignSnapshotSchema.ts (acción #4)

```typescript
// src/frontend/src/schemas/designSnapshot.ts
import { z } from 'zod'

const ViewIdSchema = z.enum(['front', 'back', 'left', 'right'])

const ElementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['text', 'image', 'shape']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  // ... propiedades específicas por tipo
})

const ViewStateSchema = z.object({
  elements: z.array(ElementSchema),
  canvasTransform: z.object({ x: z.number(), y: z.number(), scale: z.number() }),
  qualityValidation: z.optional(z.object({
    alerts: z.array(z.object({
      type: z.enum(['contrast', 'font_size', 'image_scale']),
      severity: z.enum(['warning', 'error']),
      elementId: z.string().uuid().optional(),
    })),
    confirmedWithWarnings: z.boolean(),
  })),
})

export const DesignSnapshotSchema = z.object({
  id: z.string().uuid(),
  designId: z.string().uuid(),
  timestamp: z.number(),
  activeViewId: ViewIdSchema,
  views: z.record(ViewIdSchema, ViewStateSchema),
  globalMetadata: z.object({
    colorPalette: z.array(z.string()),
    appliedTextiles: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
})

export type DesignSnapshot = z.infer<typeof DesignSnapshotSchema>
export type ViewId = z.infer<typeof ViewIdSchema>
export type ViewState = z.infer<typeof ViewStateSchema>
```

> ⚠️ **ARCH-03:** Este schema es el contrato inamovible frontend/backend. Una vez que Story 3.1 empieza, no se modifica sin un ADR que documente el breaking change.

---

## Fase 10 — Definición de "Day 1 Done"

Story 1.1 está **completa** cuando:

- [ ] `dotnet build` pasa sin warnings en los 19 proyectos
- [ ] `make dev` levanta PostgreSQL + Redis + MinIO sin errores
- [ ] `dotnet run` en `AiWearStudio.Api` arranca en < 5s sin excepciones
- [ ] `GET /health` retorna 200 con todos los subsistemas `ok`
- [ ] `POST /api/v1/auth/register` crea un usuario con rol `customer` y retorna JWT
- [ ] AC-RBAC-CROSS-TENANT pasa en Testcontainers (operario Tenant A → recurso Tenant B = 404)
- [ ] `IStartupFilter` lanza `InvalidOperationException` cuando un Singleton captura `ITenantContext`
- [ ] `dotnet test tests/AiWearStudio.Architecture.Tests` pasa (NetArchTest: dirección de dependencias)
- [ ] `DesignSnapshotSchema.ts` existe y pasa `npx tsc --noEmit` en el frontend

Cuando todos los checks son verdes: **iniciar Story 1.2**.

---

## Referencia Rápida de Sprints

| Epic | Primera historia | Gate de entrada |
|------|-----------------|-----------------|
| Epic 1 | Story 1.1 — Fundación | Este documento completo |
| Epic 2 | Story 2.1 — Backend Catálogo | Story 1.1 done |
| Epic 3 | Story 3.1 — Canvas + Schema | Story 2.1 done + `DesignSnapshotSchema.ts` definida |
| Epic 3 | Story 3.3 — IA + Cuota | Story 3.2 done + benchmark bgRemoval documentado |
| Epic 3 | Story 3.5 — Try-on | Story 3.3 done + P95(FR14) < 8s en staging |
| Epic 4 | Story 4.1 — Resumen precio | Story 3.1 done |
| Epic 4 | Story 4.3 — Confirmación atómica | `cross-schema-transaction-strategy.md` documentado |
| Epic 5 | Story 5.1 — Cola producción | Story 4.3 done |
| Epic 6 | Story 6.1 — Notificaciones SMS | Story 5.3 done (OutboxMessages producidos) |

---

*Generado: 2026-05-08 · Fuentes: `architecture.md`, `epics.md` (Story 1.1) · Versión: 1.0*
