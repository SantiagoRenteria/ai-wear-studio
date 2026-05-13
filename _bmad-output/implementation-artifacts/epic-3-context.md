# Epic 3 Context: Canvas de Diseño y Asistencia IA

<!-- Compilado desde planning artifacts. Editar libremente. -->

## Goal

Permitir a un cliente crear un diseño completo multi-vista sobre la prenda seleccionada: posicionar/escalar/rotar elementos, generar imágenes con IA, agregar texto, cargar imágenes con remoción de fondo automática, ver alertas de calidad en tiempo real, y generar un try-on fotorrealista (no consume cuota). El resultado se persiste como `DesignDraft` con concurrencia optimista (ETag) y se serializa al `DesignSnapshot` para el checkout.

**Decisiones de producto (Party Mode 2026-05-07):**
- Try-on (FR21): no consume cuota — es "probador virtual". TTL 24h.
- Crédito en error de Gemini: siempre se devuelve, sin excepciones visibles al usuario.
- Reset de cuota mensual: billing anniversary (fecha de activación del plan), no fecha fija.
- Feature flag `tryon-feature` = false por defecto; gate: P95 de Story 3.3 < 8s en staging.

## Stories

- Story 3.1: Port del Canvas y Contrato de Diseño Multi-Vista
- Story 3.2: Herramientas de Texto e Imagen Propia
- Story 3.3: Generación de Imágenes con IA y Gestión de Cuota
- Story 3.4: Validador de Calidad de Impresión
- Story 3.5: Try-on Fotorrealista (Feature Gated — requiere P95 Story 3.3 < 8s en staging)

## Requirements & Constraints

- El canvas corre 100% en cliente (Konva + Zustand). Ninguna llamada síncrona a API bloquea interacciones del canvas.
- `DesignSnapshotSchema` (Zod) es el contrato inamovible entre frontend y backend. Definido en Story 3.1 antes de cualquier endpoint de pedido (ARCH-03).
- `ViewId = 'front' | 'back' | 'left' | 'right'` — cuatro vistas independientes, cada una con su propio arreglo de elementos.
- `IRateLimitPolicy` vive en `SharedKernel/Common/` — la implementación Redis está en `DesignEngine.Infrastructure`. Dirección de dependencia: Infrastructure → SharedKernel, nunca inversa (ARCH-05, ARCH-15).
- BC DesignEngine NO puede hacer JOIN cross-schema con Users ni CompanyAdmin. TenantId viene siempre del JWT.
- Concurrencia optimista: `PATCH /api/v1/designs/{designId}` requiere `If-Match: {ETag}`. 412 si obsoleto.
- Generación IA es asíncrona: `POST /api/ai/generate` → 202 + jobId; polling `GET /api/ai/jobs/{jobId}` cada 2s.
- Idempotency key de generación: `sha256("${userId}:${designId}:${Math.floor(Date.now() / 60000)}").slice(0, 32)` — mismo jobId dentro del mismo minuto sin consumir crédito (ARCH-10).
- Cuota: Demo = 20 generaciones totales (lifetime); SaaS/LP = pool mensual reseteado en billing anniversary.
- Hard timeout de generación IA: 45s. Crédito siempre devuelto en caso de error (FR23b).
- PrintQualityValidator: re-evalúa en ≤ 500ms (debounce 300ms). Solo actualiza panel lateral, no causa re-render del canvas.
- Quality log `POST /api/v1/designs/{designId}/quality-events` — authn: API key service-to-service, rate limit 100/min, retención 90 días (ADR-007).

## Technical Decisions

**BC DesignEngine — dual-project:** `AiWearStudio.DesignEngine.Core` (Domain + Application) y `AiWearStudio.DesignEngine.Infrastructure`. Patrón idéntico al de Users y CompanyAdmin.

**DesignDraft entity:**
- `DesignDraft(Id, TenantId, UserId, SnapshotJson, ETag, CreatedAt, UpdatedAt)`
- `ETag` se genera como `Guid.NewGuid().ToString("N")` en cada upsert
- Hard-delete (sin soft-delete) — el draft se destruye al confirmar el pedido

**Endpoints de draft:**
- `GET /api/v1/designs/{designId}` → 200 con `ETag` header; 404 si no existe o cross-tenant
- `PATCH /api/v1/designs/{designId}` → body: `{ snapshot: DesignSnapshotJson }`, header `If-Match: {etag}` requerido; 412 si ETag no coincide; crea si no existe (upsert)

**Auto-save:**
- Fase 1 (Story 3.1): localStorage clave `design:{designId}:{viewId}`, debounce 5s — pérdida máxima 5s
- Fase 2 (post-MVP): sync periódico al endpoint de draft (actualmente fuera de alcance)

**DesignSnapshotSchema (Zod):**
```ts
ViewId = z.enum(['front', 'back', 'left', 'right'])
ViewState = z.object({ elements: z.array(ElementSchema), canvasTransform: TransformSchema, qualityValidation: ValidationResultSchema.optional() })
DesignSnapshotSchema = z.object({ id: z.string().uuid(), designId: z.string().uuid(), timestamp: z.number(), activeViewId: ViewId, views: z.record(ViewId, ViewState), globalMetadata: z.object({ colorPalette: z.array(ColorSchema), appliedTextiles: z.array(TextileRefSchema) }) })
```

**Tests de arquitectura (NetArchTest):**
- `AiWearStudio.Architecture.Tests` — ya tiene NetArchTest 1.3.2 instalado
- Agregar referencias a DesignEngine.Core e Infrastructure
- Regla: `IRateLimitPolicy` reside en namespace `AiWearStudio.SharedKernel.*`
- Regla: implementación de `IRateLimitPolicy` no reside en `AiWearStudio.SharedKernel.*`

## Cross-Story Dependencies

- Story 3.1 (canvas + schema) es prerequisito para 3.2, 3.3, 3.4, 3.5.
- Story 3.2 (bg removal) requiere benchmark en PNG 4K antes del sprint — si P95 > 2000ms, invertir lógica de fallback (Gemini primero).
- Story 3.3 (generación IA) requiere `IRateLimitPolicy` implementada en DesignEngine.Infrastructure (Redis).
- Story 3.4 (quality validator) requiere quality-events endpoint del BC DesignEngine.
- Story 3.5 (try-on) tiene gate de entrada: P95 Story 3.3 < 8s en staging.
- Epic 4 (checkout) requiere `DesignSnapshot` en estado confirmed — lee `DesignDraft` y lo convierte a snapshot inmutable.
