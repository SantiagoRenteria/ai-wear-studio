---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
status: complete
completedAt: "2026-05-08"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
---

# AI Wear Studio - Epic Breakdown

## Overview

Este documento desglosa de forma completa las épicas e historias de usuario para AI Wear Studio, descomponiendo los requisitos del PRD y las decisiones de Arquitectura en historias implementables para el agente Desarrollador.

---

## Requirements Inventory

### Functional Requirements

**Área 1 — Autenticación y Gestión de Identidad (FR1–FR8)**

- FR1: Un cliente externo puede crear una cuenta con email y contraseña mediante registro público.
- FR2: Un usuario interno (operario, workshop_admin) puede acceder al sistema mediante invitación enviada por un administrador con permisos para ello.
- FR3: Todo usuario puede iniciar sesión con sus credenciales y recibir un token de acceso.
- FR4: El sistema impide que un mismo email exista como `customer` Y como `operator`/`workshop_admin`/`platform_admin` simultáneamente (índices parciales en DB).
- FR5: Un usuario puede recuperar el acceso a su cuenta mediante un enlace enviado a su email.
- FR6: El sistema revoca el acceso de un usuario desactivado de forma inmediata, incluyendo la invalidación de tokens activos sin requerir cierre de sesión.
- FR7: Un platform_admin puede crear, editar, activar y suspender cuentas de workshop_admin.
- FR8: Un workshop_admin puede invitar y desactivar cuentas de operario dentro de su compañía.

**Área 2 — Catálogo de Prendas (FR9–FR13)**

- FR9: Un cliente puede explorar el catálogo de prendas disponibles con sus variantes de color para la compañía activa.
- FR10: Un cliente puede seleccionar tipo de prenda, color, talla y cantidad de unidades antes de iniciar el diseño.
- FR11: El sistema muestra las zonas de impresión disponibles y la técnica recomendada para cada combinación prenda–vista seleccionada.
- FR12: El sistema presenta el diseño del cliente posicionado sobre la prenda seleccionada en cada vista disponible (frente, espalda, mangas, pecho).
- FR13: Un workshop_admin puede configurar qué prendas, colores y técnicas están disponibles para su compañía.

**Área 3 — Herramientas de Diseño (FR14–FR23b)**

- FR14: Un cliente puede generar imágenes mediante descripción en lenguaje natural con asistencia de IA generativa (Gemini). Cada solicitud consume un crédito del cuota del plan.
- FR15: Un cliente puede agregar texto a su diseño con opciones de tipografía, tamaño, color y efectos básicos.
- FR16: Un cliente puede cargar una imagen o logo propio como elemento de diseño (carga y remoción de fondo son asíncronas).
- FR17: El sistema puede remover automáticamente el fondo de una imagen cargada por el cliente.
- FR18: Un cliente puede diseñar de forma independiente en cada vista disponible de la prenda.
- FR19: Un cliente puede deshacer y rehacer acciones dentro de su sesión de diseño activa.
- FR20: El sistema evalúa el diseño en tiempo real y alerta sobre problemas de calidad de impresión (contraste texto/prenda, tamaño de fuente efectivo, escala de imagen) sin bloquear la confirmación. Registra si el cliente confirmó con advertencias activas.
- FR21: Un cliente puede solicitar la generación de un mockup fotorrealista de su diseño sobre un modelo antes de confirmar el pedido.
- FR22: Un cliente puede posicionar, escalar y rotar elementos de diseño dentro de la zona de impresión de cada vista.
- FR23: El sistema controla la cantidad de generaciones de imagen con IA disponibles según el plan activo (Demo: 20 totales; SaaS/LP: pool mensual).
- FR23b: Cuando una solicitud de generación IA falla por error del servicio externo, el sistema preserva el estado del diseño, informa al cliente y permite reintentar sin consumir crédito adicional.

**Área 4 — Pedidos y Checkout (FR24–FR31b)**

- FR24: Un cliente puede revisar un resumen completo antes de confirmar: diseño por vista, prenda y color, talla y cantidad, precio total, dirección de entrega.
- FR25: El sistema solicita y valida la dirección de entrega según el país (CO, MX, US, AR, CL, PE). Cuando no puede validarse automáticamente, el cliente puede continuar con confirmación explícita.
- FR26: El sistema requiere que el cliente acepte explícitamente los términos de servicio y la política de no-retracto para prendas personalizadas antes de confirmar.
- FR27: Al confirmar el pedido, el sistema ejecuta de forma atómica la creación del DesignSnapshot (canvasJson + previewUrl + printZones + técnica + versión catálogo + precio al momento) y la entrada en la cola de producción. Si alguna falla, ambas revierten. El diseño asociado no puede modificarse post-confirmación.
- FR28: Un cliente puede cancelar un pedido dentro de un período definido si el estado es `Recibido` y no ha sido marcado como pagado.
- FR29: Un cliente puede consultar el historial de sus pedidos y el estado actual de cada uno.
- FR30: Un cliente puede ver los detalles de cualquier pedido histórico, incluyendo el diseño aprobado.
- FR31: Un operario puede registrar manualmente la recepción del pago de un pedido.
- FR31b: El sistema muestra al cliente el precio de su pedido antes de confirmar, calculado en función de prenda, técnica, número de zonas activas y cantidad.

**Área 5 — Cola de Producción y Portal del Taller (FR32–FR36b)**

- FR32: Un operario puede visualizar la cola de pedidos pendientes de producción de su compañía. El estado inicial de toda orden recién confirmada es `Recibido`.
- FR33: Un operario puede filtrar y ordenar la cola por técnica de impresión, estado y fecha de pedido.
- FR34: Un operario puede ver el diseño exacto aprobado por el cliente: imagen del diseño, dimensiones de la zona de impresión, técnica recomendada, talla, cantidad y color de la prenda.
- FR35: Un operario puede actualizar el estado: `Recibido` → `En Producción` → `Control de Calidad` → `Listo` → `Enviado`. Puede revertir al estado inmediatamente anterior cuando no sea `Enviado`.
- FR36: Un workshop_admin puede consultar el historial completo de pedidos de su compañía con filtros por estado y rango de fechas.
- FR36b: El sistema registra incidencias de producción categorizadas (error de diseño, error de talla, error de insumo, otro) que el operario puede asociar a un pedido.

**Área 6 — Notificaciones (FR37–FR39b)**

- FR37: El cliente recibe notificación automática por SMS en cada cambio de estado del pedido durante el proceso de producción.
- FR38: El cliente recibe confirmación automática por SMS al confirmar el pedido con el resumen del pedido y datos de entrega.
- FR39: Un workshop_admin puede configurar qué eventos de cambio de estado generan notificaciones automáticas al cliente.
- FR39b: El sistema dispara automáticamente una solicitud de calificación de experiencia al cliente cuando su pedido alcanza el estado `Enviado`.

**Área 7 — Administración de Compañías y Planes (FR40–FR45c)**

- FR40: Un platform_admin puede crear y gestionar compañías (talleres), incluyendo la asignación y modificación del plan activo.
- FR41: Un platform_admin puede activar, suspender y restaurar el acceso de una compañía. Al suspender: pedidos activos quedan en su estado actual sin nuevas transiciones; usuarios activos pierden acceso inmediatamente.
- FR42: El sistema restringe las capacidades disponibles según el plan activo. Cuando un cliente intenta usar una capacidad no disponible, el sistema presenta un mensaje explicativo.
- FR43: Un workshop_admin puede configurar los datos de su compañía: nombre del taller, logo, colores de marca y configuración de notificaciones. El modelo soporta dominio personalizado para fases posteriores.
- FR44: El sistema registra toda activación y cambio de plan con: identidad del admin, plan anterior, plan nuevo y timestamp de la operación.
- FR45: Un platform_admin puede consultar métricas de uso por compañía: pedidos totales, generaciones IA consumidas, usuarios activos, pedidos completados por operador por período.
- FR45b: El sistema registra eventos de consumo facturable (generaciones IA utilizadas, pedidos procesados) de forma estructurada y asociada a la compañía.
- FR45c: Un workshop_admin o platform_admin puede exportar los datos de pedidos de una compañía en formato CSV o equivalente.

**Área 8 — Modo Presencial (FR46–FR48)**

- FR46: Un operario puede iniciar una sesión de diseño asistida en nombre de un cliente que está físicamente presente en el taller.
- FR47: Un cliente presencial puede revisar y aprobar el diseño en el dispositivo del operario antes de que se confirme el pedido.
- FR48: Los pedidos originados en modo presencial son procesados con el mismo flujo que los pedidos digitales y aparecen en la misma cola de producción.

**Total: 54 Requisitos Funcionales · 8 áreas de capacidad**

---

### NonFunctional Requirements

**Performance**

- NFR-PERF-01: Tiempo de respuesta API (P95) < 500 ms para operaciones CRUD estándar bajo carga normal.
- NFR-PERF-01b: Tiempo de generación IA (P99) < 30 s · Hard timeout 45 s (retorna error al cliente, no bloquea).
- NFR-PERF-02: Tiempo de carga inicial SPA (TTI) < 3 s en conexión 4G estándar desde Colombia/México.
- NFR-PERF-03: Renderizado del canvas de diseño < 100 ms por interacción con diseño de complejidad media (≤ 10 capas).
- NFR-PERF-04: Generación de mockup final < 5 s (P95) — composición canvas → imagen exportada de alta resolución.
- NFR-PERF-05: Capacidad concurrente Fase 1 — 50 usuarios simultáneos sin degradación de PERF-01 (escala vertical).
- NFR-PERF-06: Capacidad concurrente Fase 2 — 500 usuarios simultáneos con degradación graceful; cola de generación IA sin bloqueo de UI.
- NFR-PERF-07: Tiempo de respuesta cola de producción < 200 ms para carga y actualización de estado del dashboard del operario.

**Seguridad**

- NFR-SEC-01: Toda comunicación cliente-servidor sobre HTTPS/TLS 1.2+. Sin endpoints HTTP en producción.
- NFR-SEC-02: Autenticación JWT con expiración ≤ 60 minutos y refresh token rotativo. Tokens invalidables en logout.
- NFR-SEC-03: Rate limiting por usuario autenticado en endpoints de generación IA. Fase 1: 10 generaciones gratuitas/día por cuenta; bypass permanente post-confirmación de pedido.
- NFR-SEC-04: Aislamiento de tenants en todas las queries. AC-RBAC-CROSS-TENANT: operario de Tenant A solicitando recurso de Tenant B → 404 (no 403, no 200).
- NFR-SEC-05: API keys de Gemini y secretos en variables de entorno o gestor de secretos. Nunca en código fuente ni bundle del cliente.
- NFR-SEC-06: Inputs de usuario sanitizados antes de procesamiento. Prompts IA con sistema de filtrado básico de contenido.
- NFR-SEC-07: Logs de auditoría para: cambios de estado de pedido, acciones administrativas, actualizaciones de feature flags, acciones de platform_admin en cualquier tenant.
- NFR-SEC-08: Contraseñas almacenadas con bcrypt (cost ≥ 12) o argon2id. Sin almacenamiento en texto plano.

**Escalabilidad**

- NFR-SCALE-01: La arquitectura monolito modular debe soportar extracción de módulos como servicios independientes sin cambios de contrato de API.
- NFR-SCALE-02: Blob storage (S3-compatible) para todos los assets de diseño e imágenes generadas. Sin almacenamiento de binarios en base de datos relacional.
- NFR-SCALE-03: Las consultas de alto volumen (cola de producción, historial de pedidos) deben tener índices definidos desde el diseño inicial del schema.
- NFR-SCALE-04: La generación de imágenes IA debe ser asíncrona con feedback de progreso al cliente. No bloquear el hilo HTTP durante la espera de Gemini.

**Confiabilidad**

- NFR-REL-01: Disponibilidad del servicio: Fase 1 → 99.0% (≤ 7.2 h/mes downtime) · RTO 4 h; Fase 2 → 99.5% (≤ 3.6 h/mes) · RTO 1 h.
- NFR-REL-02: Persistencia de sesión de diseño: auto-save cada 5 s (debounce) + flush en cierre de pestaña. Sin pérdida de trabajo en desconexión temporal.
- NFR-REL-03: Rollback de transacción de pedido: confirmación es ACID atómica (DesignSnapshot + ProductionQueue). Si alguna falla, ambas revierten.
- NFR-REL-04: Retry de generación IA: 1 reintento automático ante error 429 (rate limit) con delay de 10 s. Otros errores se reportan al usuario sin reintentar.
- NFR-REL-05: Idempotencia del endpoint de confirmación: `POST /orders/confirm` requiere header `Idempotency-Key`. Tabla `ProcessedRequests` previene pedidos duplicados.

**Integridad de Datos**

- NFR-INT-01: El DesignSnapshot confirmado es inmutable. No puede modificarse después de la confirmación. Cualquier corrección genera un nuevo pedido.
- NFR-INT-02: El DesignSnapshot incluye versión del catálogo al momento de confirmación para detectar incompatibilidades si el catálogo cambia después.
- NFR-INT-03: Backups automáticos de base de datos con retención mínima de 30 días. Fase 1: snapshots diarios; Fase 2: WAL streaming + snapshots diarios.
- NFR-INT-04: Migración de schema con herramienta de migración versionada (EF Core Migrations). Sin cambios de schema manuales en producción.
- NFR-INT-05: Header `Idempotency-Key` obligatorio en `POST /orders/confirm`. Respuesta idéntica para key duplicada dentro de ventana de 24 h.
- NFR-INT-06: Contrato de errores RFC 7807 (`application/problem+json`) en todos los endpoints. Distingue errores de validación (4xx con detalle de campo) de errores de infraestructura (5xx genérico).

**Accesibilidad**

- NFR-ACC-01: El portal del cliente cumple WCAG 2.1 nivel AA en todos los flujos críticos: selección de prenda, herramientas de diseño, checkout y tracking. Obligación legal en Argentina (Ley 26.653).
- NFR-ACC-02: El PrintQualityValidator aplica ratio de contraste WCAG 2.1 como criterio de advertencia de producción.
- NFR-ACC-03: Todos los elementos interactivos del canvas tienen alternativa de teclado. El flujo de diseño básico debe ser completable sin ratón.

**Compatibilidad**

- NFR-COMPAT-01: Soporte navegadores: últimas 2 versiones de Chrome, Firefox, Safari, Edge. Canvas (Konva) requiere soporte WebGL.
- NFR-COMPAT-02: Mobile (< 768px): experiencia de consulta y aprobación. Tablet (≥ 10"): experiencia presencial completa. Flujo de diseño completo no está en scope para mobile en Fase 1.
- NFR-COMPAT-03: Soporte de 6 países desde Fase 1 (CO, MX, US, AR, CL, PE): validación de formatos de dirección, ciudades por prefijo, moneda de referencia local.

**Observabilidad**

- NFR-OBS-01: Endpoint `GET /health` < 200 ms con estado de: API, base de datos, blob storage, Redis y conectividad a Gemini API.
- NFR-OBS-02: Todos los eventos de negocio relevantes se registran en logs estructurados JSON: pedidos confirmados, generaciones IA, cambios de estado de producción, errores de validación de calidad, acciones administrativas.
- NFR-OBS-03: La plataforma expone métricas de latencia P95/P99 para endpoints críticos. Alertas configurables cuando P95 supera umbrales de PERF-01/PERF-01b.
- NFR-OBS-04: Eventos de consumo facturable (generaciones IA, pedidos procesados) registrados de forma estructurada por tenant con timestamp y metadatos suficientes para auditoría y billing futuro.

**Total: 41 Requisitos No Funcionales · 8 categorías**

---

### Additional Requirements

*Requisitos técnicos de Arquitectura que impactan la implementación de épicas e historias:*

- ARCH-01: **Sin starter template** — scaffold manual con Clean Architecture Híbrida (Opción C). 3 BCs complejos con 2 proyectos (.Core + .Infrastructure), 3 BCs simples con 1 proyecto. Total: 12 proyectos fuente + 7 proyectos test = 19 proyectos.
- ARCH-02: **Testcontainers setup** obligatorio antes del Sprint 1: `docker-compose.test.yml` + test suite de tenant isolation (AC-RBAC-CROSS-TENANT, AC-ATOMIC-01/02). Ningún otro BC puede avanzar sin este prerequisito.
- ARCH-03: **`DesignSnapshotSchema` (Zod)** — contrato frontend/backend del DesignSnapshot debe definirse antes de portar el canvas. Contrato inamovible una vez establecido.
- ARCH-04: **Benchmark `bgRemoval.ts` en PNG 4K** antes del sprint de DesignEngine. Si BFS > 2s P95, invertir lógica de fallback (Gemini primero en lugar de como fallback).
- ARCH-05: **`IRateLimitPolicy` interface** en SharedKernel/Common/ definida en Sprint 1, aunque la implementación Redis llegue en el sprint de DesignEngine.
- ARCH-06: **Estrategia de transacción cross-schema** para ACID entre `DesignEngineDbContext` y `ProductionQueueDbContext` — debe documentarse antes del Sprint de Orders.
- ARCH-07: **Redis** (docker-compose desde Fase 1): doble propósito — caché de Catalog con TTL + implementación de `IRateLimitPolicy` por (tenant_id, plan, feature) con contadores TTL mensual/diario.
- ARCH-08: **Hangfire + PostgreSQL** para background jobs. Schema `hangfire` en la misma DB. `ITenantContext` en jobs: Case 2 (tenant_id explícito en el job, nunca inferido de HTTP).
- ARCH-09: **Outbox Pattern** para IntegrationEvents cross-BC. Tabla `outbox_messages` (id, type, payload jsonb, tenant_id, occurred_at, processed_at) en el mismo schema del BC origen. TenantId serializado en el mensaje.
- ARCH-10: **MediatR Pipeline obligatorio:** `IdempotencyBehavior` → `LoggingBehavior` → `ValidationBehavior` → `Handler`. IdempotencyBehavior va primero; store en Redis con TTL configurable por tipo de comando.
- ARCH-11: **Soft-delete selectivo:** `deleted_at` en Orders, DesignSnapshot, Users. Hard-delete en Catalog y entidades de configuración. Debe decidirse antes de la primera migración.
- ARCH-12: **Optimistic concurrency** con `ETag + 412 Precondition Failed` en endpoints de draft (borradores de diseño para conflictos multi-pestaña).
- ARCH-13: **Domain Events vs Integration Events** — regla estricta: DomainEvent (intra-BC, MediatR in-process) · IntegrationEvent (cross-BC, siempre vía Outbox). Mezclarlos produce acoplamiento accidental o pérdida de atomicidad.
- ARCH-14: **Polling para progreso de IA asíncrona:** `POST /api/ai/generate` → 202 Accepted + `{ jobId }`. Frontend: `GET /api/ai/jobs/{jobId}` cada 2s.
- ARCH-15: **NetArchTest** en `AiWearStudio.Architecture.Tests` para enforcement de dirección de dependencias.
- ARCH-16: **IStartupFilter de validación** en startup para detectar Singletons que capturen `ITenantContext` directamente (capive dependency risk).
- ARCH-17: **Azure** (producción): Container Apps (escala a cero Fase 1) + PostgreSQL Flexible Server + Azure Cache for Redis + Azure Blob Storage. Swap MinIO→Azure Blob via `IAssetStorage` abstraction.
- ARCH-18: **GitHub Actions CI/CD:** pipeline backend (build → unit tests → integration tests con Testcontainers → docker build → deploy Azure Container Apps) y pipeline frontend (build → lint → test → deploy). Triggers independientes por cambios en `src/backend/**` y `src/frontend/**`.
- ARCH-19: **Serilog** + sink Console JSON estructurado. Campos mínimos en cada log: `timestamp`, `level`, `message`, `tenant_id`, `user_id`, `correlation_id`, `bc`.
- ARCH-20: **Read models cross-BC** — cuando un BC necesita datos de otro, mantiene copia read-optimizada (denormalizada), actualizada vía IntegrationEvent. Nunca JOINs cross-schema en EF Core.
- ARCH-21: **Compliance pre-lanzamiento:** aviso de no-retracto (Ley 1480/2011 Colombia) en pantalla intermedia entre canvas y checkout; verificación de mayoría de edad (14+) en registro; ToS con cláusula de responsabilidad de contenido IA; política de privacidad publicada (Ley 1581/2013); mecanismo de solicitud de borrado de cuenta.

---

### UX Design Requirements

*No existe documento de diseño UX separado para este proyecto. Los requisitos de UX/UI están incorporados en los User Journeys del PRD y en las decisiones de compatibilidad de la sección NFR-COMPAT-02.*

*Consideraciones UX derivadas del PRD:*

- UX-01: UI tablet-first para el modo presencial (operario asiste a cliente de pie, una mano). Referencia: Journey de Andrés.
- UX-02: Try-on fotorrealista con disclaimer explícito: "imagen referencial — el resultado final puede variar levemente." Hipótesis a validar con métricas.
- UX-03: PrintQualityValidator como advisory (no blocking) — alerta visual sin bloquear el flujo de confirmación.
- UX-04: Autoguardado del canvas en Zustand local (Fase 1) con `beforeunload` warning para prevenir pérdida de trabajo.
- UX-05: Pantalla de transición "Tu diseño está listo" con aviso de no-retracto como confirmación de autoría (no como aviso legal intimidante).
- UX-06: Onboarding de mayoría de edad: 3 tarjetas simples, 25 segundos — sin texto de documento largo.
- UX-07: Post-pedido: aviso de TTL del mockup como invitación a crear cuenta ("Tu mockup estará disponible 48 horas en este link. Después, encuéntralo en tu cuenta").
- UX-08: Mapa de momentos de avisos legales: zona sagrada durante diseño (sin interrupciones), avisos en entrada al portal y en transición diseño→pedido.

---

### FR Coverage Map

| FR | Épica | Área |
|----|-------|------|
| FR1 | Epic 1 | Registro público de cliente |
| FR2 | Epic 1 | Invitación de usuarios internos |
| FR3 | Epic 1 | Login y emisión de token |
| FR4 | Epic 1 | Separación B2C/B2B (índices parciales) |
| FR5 | Epic 1 | Recuperación de contraseña |
| FR6 | Epic 1 | Revocación inmediata de acceso |
| FR7 | Epic 1 | Gestión de workshop_admin por platform_admin |
| FR8 | Epic 1 | Gestión de operarios por workshop_admin |
| FR40 | Epic 1 | Gestión de compañías por platform_admin |
| FR41 | Epic 1 | Activar/suspender compañías |
| FR42 | Epic 1 | Restricción de capacidades por plan |
| FR43 | Epic 1 | Configuración de compañía por workshop_admin |
| FR44 | Epic 1 | Audit trail de cambios de plan |
| FR9 | Epic 2 | Explorar catálogo de prendas |
| FR10 | Epic 2 | Seleccionar prenda/color/talla/cantidad |
| FR11 | Epic 2 | Ver zonas de impresión y técnica recomendada |
| FR12 | Epic 2 | Vista del diseño sobre la prenda seleccionada |
| FR13 | Epic 2 | Configuración de catálogo por workshop_admin |
| FR14 | Epic 3 | Generación de imagen con IA (Gemini) |
| FR15 | Epic 3 | Herramienta de texto |
| FR16 | Epic 3 | Carga de imagen/logo propio |
| FR17 | Epic 3 | Remoción automática de fondo |
| FR18 | Epic 3 | Diseño multi-vista |
| FR19 | Epic 3 | Deshacer/Rehacer |
| FR20 | Epic 3 | PrintQualityValidator + log server-side |
| FR21 | Epic 3 | Try-on fotorrealista (no consume cuota) |
| FR22 | Epic 3 | Posicionar/escalar/rotar elementos |
| FR23 | Epic 3 | Control de cuota de generaciones IA por plan |
| FR23b | Epic 3 | Preservación de estado y crédito en error de IA |
| FR24 | Epic 4 | Resumen completo del pedido |
| FR25 | Epic 4 | Validación de dirección por país |
| FR26 | Epic 4 | Aceptación de ToS y política de no-retracto |
| FR27 | Epic 4 | Submit atómico ACID (DesignSnapshot + ProductionQueue) |
| FR28 | Epic 4 | Cancelación de pedido en estado Recibido |
| FR29 | Epic 4 | Historial de pedidos del cliente |
| FR30 | Epic 4 | Detalle de pedido histórico con diseño aprobado |
| FR31 | Epic 4 | Registro manual de pago por operario |
| FR31b | Epic 4 | Cálculo y visualización de precio antes de confirmar |
| FR32 | Epic 5 | Cola de pedidos pendientes por compañía |
| FR33 | Epic 5 | Filtrar y ordenar cola por técnica/estado/fecha |
| FR34 | Epic 5 | Vista del diseño exacto aprobado con specs de impresión |
| FR35 | Epic 5 | Actualización de estado de producción |
| FR36 | Epic 5 | Historial completo de pedidos del taller |
| FR36b | Epic 5 | Registro de incidencias de producción |
| FR46 | Epic 5 | Sesión de diseño asistida (modo presencial) |
| FR47 | Epic 5 | Aprobación del diseño por cliente presencial |
| FR48 | Epic 5 | Pedidos presenciales en la misma cola de producción |
| FR37 | Epic 6 | Notificaciones SMS en cambios de estado |
| FR38 | Epic 6 | Confirmación SMS al confirmar pedido |
| FR39 | Epic 6 | Configuración de eventos de notificación |
| FR39b | Epic 6 | Solicitud de calificación post-envío |
| FR45 | Epic 6 | Métricas de uso por compañía |
| FR45b | Epic 6 | Registro estructurado de eventos facturables |
| FR45c | Epic 6 | Exportación de datos de pedidos (CSV) |

**Total: 54 FRs cubiertos en 6 épicas. Cobertura completa ✅**

---

## Epic List

### Epic 1: Identidad, Acceso y Gestión de Plataforma
Los usuarios pueden crear cuentas, acceder a sus portales con el rol correcto, y la plataforma tiene infraestructura multi-tenant funcional desde el día 1. Un platform_admin puede gestionar talleres y planes. Un workshop_admin puede configurar su compañía e invitar operarios. Los clientes pueden registrarse públicamente.
**FRs cubiertos:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR40, FR41, FR42, FR43, FR44

### Epic 2: Catálogo de Prendas y Configuración del Taller
Un cliente puede explorar las prendas disponibles del taller, ver zonas de impresión y técnicas, y seleccionar qué personalizar. Un workshop_admin puede activar/desactivar prendas, colores y técnicas según su inventario real.
**FRs cubiertos:** FR9, FR10, FR11, FR12, FR13

### Epic 3: Canvas de Diseño y Asistencia IA
Un cliente puede crear un diseño completo: generar imágenes con IA, agregar texto, cargar imágenes con remoción de fondo automática, ver alertas del validador de calidad en tiempo real, generar try-on fotorrealista (no consume cuota), y posicionar/escalar/rotar elementos en cada vista de la prenda.
**FRs cubiertos:** FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR23b
**Decisiones de producto (Party Mode):**
- Try-on (FR21): no consume cuota — es un "probador virtual", no un asset de diseño.
- Crédito en error de Gemini: siempre se devuelve, sin excepciones visibles al usuario.
- Reset de cuota mensual: billing anniversary (fecha de creación de cuenta), no fecha fija.
- Tono de voz de la IA: primera persona ("Estoy generando tu diseño...").
- Historia cero obligatoria (E3-INFRA-0): DesignSnapshotSchema multi-vista, idempotency key, feature flag try-on OFF, ADR-007 aprobado.
- Try-on implementado en sprint propio con gate de entrada (P95 < 8s de FR14 medido en staging).

### Epic 4: Pedidos, Checkout y Garantía de Fidelidad
Un cliente puede revisar su pedido completo, aceptar los términos legales y la política de no-retracto, ver el precio calculado, y confirmar con la garantía Zero-Reinterpretation (DesignSnapshot inmutable + ProductionQueue en una transacción ACID). Puede ver su historial, cancelar pedidos en estado Recibido, y el operario puede registrar el pago manualmente.
**FRs cubiertos:** FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR31b

### Epic 5: Portal del Taller, Cola de Producción y Modo Presencial
Un operario puede ver la cola de producción organizada por técnica y estado, acceder al diseño exacto aprobado con dimensiones y técnica recomendada, actualizar el estado del pedido, registrar incidencias, y asistir a clientes físicamente presentes usando el mismo sistema. Un workshop_admin puede consultar el historial completo del taller.
**FRs cubiertos:** FR32, FR33, FR34, FR35, FR36, FR36b, FR46, FR47, FR48

### Epic 6: Notificaciones, Métricas Operativas y Preparación para Producción
El cliente recibe notificaciones SMS automáticas en cada cambio de estado y una solicitud de calificación al completarse. Un workshop_admin configura qué eventos generan notificaciones. Un platform_admin consulta métricas de uso, exporta datos, y el sistema expone observabilidad completa lista para producción.
**FRs cubiertos:** FR37, FR38, FR39, FR39b, FR45, FR45b, FR45c

---

## Epic 1: Identidad, Acceso y Gestión de Plataforma

Los usuarios pueden crear cuentas, acceder a sus portales con el rol correcto, y la plataforma tiene infraestructura multi-tenant funcional desde el día 1. Un platform_admin puede gestionar talleres y planes. Un workshop_admin puede configurar su compañía e invitar operarios. Los clientes pueden registrarse públicamente.

### Story 1.1: Fundación Arquitectónica y Registro de Cliente

Como cliente externo,
quiero crear una cuenta con mi email y contraseña,
para poder acceder a la plataforma y comenzar a personalizar prendas.

**Acceptance Criteria:**

**Dado** que el proyecto es nuevo y el equipo ejecuta la configuración inicial,
**Cuando** se levanta el entorno con `make dev`,
**Entonces** el proyecto existe con la estructura Clean Architecture Híbrida correcta (SharedKernel, módulos Users/DesignEngine/Orders con 2 proyectos c/u, módulos Catalog/CompanyAdmin/ProductionQueue con 1 proyecto c/u, AiWearStudio.Api como entry point, 7 proyectos de test), Docker Compose levanta PostgreSQL 17 + Redis 7 + MinIO con buckets inicializados, y el pipeline MediatR está configurado en orden: `IdempotencyBehavior → LoggingBehavior → ValidationBehavior → Handler`.

**Dado** que la solución tiene `IStartupFilter` de validación registrado,
**Cuando** un `Singleton` intenta capturar `ITenantContext` directamente en la cadena de DI,
**Entonces** la aplicación lanza `InvalidOperationException` al iniciar (no en runtime).

**Dado** que un cliente proporciona email y contraseña válidos (mínimo 8 caracteres),
**Cuando** envía la solicitud de registro (`POST /api/v1/auth/register`),
**Entonces** se crea una cuenta con rol `customer`, la contraseña se almacena con bcrypt (cost ≥ 12), se retorna 201 con access token JWT (TTL 60min) + refresh token, y los claims incluyen `{ sub, role: "customer" }` sin `tenant_id`.

**Dado** que un email ya está registrado como `customer`,
**Cuando** alguien intenta registrar ese mismo email de nuevo,
**Entonces** el sistema retorna 409 con body RFC 7807 (`application/problem+json`).

**Dado** que existen los índices parciales `uix_email_b2c` y `uix_email_b2b` en la tabla `users`,
**Cuando** se intenta registrar un email ya existente en el grupo opuesto (customer vs interno),
**Entonces** la DB rechaza con constraint violation y la API retorna 409 con mensaje explícito del conflicto de rol (AC-RBAC-EMAIL-CONFLICT).

**Dado** que los tests de Testcontainers están configurados con `docker-compose.test.yml`,
**Cuando** se ejecuta la suite AC-RBAC-CROSS-TENANT,
**Entonces** una solicitud de un operario del Tenant A a un recurso del Tenant B retorna 404 (no 403, no 200) — los `HasQueryFilter` globales de EF Core filtran por `tenant_id` antes de que la lógica de autorización intervenga.

### Story 1.2: Autenticación Completa — Login, Tokens y Recuperación

Como usuario registrado,
quiero iniciar sesión, mantener mi sesión activa y recuperar mi acceso si olvido mi contraseña,
para acceder a la plataforma de forma segura sin interrupciones.

**Acceptance Criteria:**

**Dado** que un usuario registrado proporciona credenciales válidas,
**Cuando** realiza `POST /api/v1/auth/login`,
**Entonces** recibe un access token (TTL ≤ 60min) y un refresh token rotativo almacenado en tabla `refresh_tokens`, y el JWT incluye claims correctos según rol (`tenant_id` para usuarios internos, `scope: "platform"` para platform_admin).

**Dado** que un usuario tiene un refresh token válido,
**Cuando** solicita renovar su access token (`POST /api/v1/auth/refresh`),
**Entonces** el refresh token anterior se invalida inmediatamente y se emite un nuevo par access + refresh (rotación en cada uso).

**Dado** que un usuario realiza logout (`POST /api/v1/auth/logout`),
**Cuando** el logout es procesado,
**Entonces** el refresh token se elimina de `refresh_tokens` y cualquier intento posterior de renovación retorna 401.

**Dado** que un usuario proporciona credenciales incorrectas,
**Cuando** intenta iniciar sesión,
**Entonces** el sistema retorna 401 con body RFC 7807 genérico (sin especificar si el email o la contraseña son incorrectos).

**Dado** que un usuario solicita recuperación de contraseña (`POST /api/v1/auth/forgot-password`),
**Cuando** la solicitud es procesada,
**Entonces** si el email existe se envía un link de reset (TTL 1 hora, de un solo uso); la API responde 200 independientemente de si el email está registrado.

**Dado** que un usuario tiene un link de reset válido,
**Cuando** establece una nueva contraseña (`POST /api/v1/auth/reset-password`),
**Entonces** el token de reset se invalida, la contraseña se actualiza con bcrypt (cost ≥ 12), y todos los refresh tokens existentes de esa cuenta son revocados.

### Story 1.3: Revocación de Acceso y Suspensión de Usuarios

Como platform_admin o workshop_admin,
quiero desactivar el acceso de un usuario de forma inmediata,
para garantizar que usuarios desautorizados no puedan operar en la plataforma.

**Acceptance Criteria:**

**Dado** que un workshop_admin desactiva a un operario de su compañía (`PATCH /api/v1/users/{userId}/deactivate`),
**Cuando** la desactivación es procesada,
**Entonces** todos los refresh tokens del operario son eliminados de `refresh_tokens`, el usuario queda en estado `inactive`, y el próximo intento de renovar el access token retorna 401.

**Dado** que un usuario desactivado todavía tiene un access token válido no expirado,
**Cuando** intenta renovar su sesión,
**Entonces** la renovación retorna 401 — la revocación es efectiva en el próximo refresh (exposición máxima: TTL del access token vigente, ≤ 60min).

**Dado** que un platform_admin suspende una compañía (`PATCH /api/v1/companies/{companyId}/suspend`),
**Cuando** la suspensión es procesada,
**Entonces** todos los refresh tokens de usuarios activos de esa compañía son eliminados y las rutas de la API retornan 403 excepto el módulo de contacto/soporte (AC-RBAC-SUSPENSION).

**Dado** que una compañía suspendida tiene pedidos activos,
**Cuando** se consulta el estado de esos pedidos,
**Entonces** permanecen en su estado actual sin nuevas transiciones — el sistema no los cancela automáticamente.

### Story 1.4: Gestión de Compañías, Planes y Audit Trail

Como platform_admin,
quiero crear y administrar talleres con control completo de planes y trazabilidad de cambios,
para gestionar la plataforma con accountability total y preparar el multi-tenancy desde el día 1.

**Acceptance Criteria:**

**Dado** que la aplicación inicia por primera vez,
**Cuando** se ejecutan los seeds iniciales,
**Entonces** existe un tenant inicial (tenant_id = 1), una cuenta platform_admin con credenciales configuradas por variables de entorno, y el CompanyAdmin BC es funcional con API mínima para gestión manual.

**Dado** que un platform_admin autenticado (JWT con `scope: "platform"`) crea una compañía (`POST /api/v1/companies`),
**Cuando** la creación es procesada,
**Entonces** se genera un registro `Company` con id (UUID), name, slug (único), plan, plan_status (`Trial`), trial_ends_at, activated_by, activated_at, created_at, settings (jsonb vacío).

**Dado** que un platform_admin cambia el plan o estado de una compañía,
**Cuando** la operación es procesada,
**Entonces** se registra en `plan_audit_log`: admin_id, company_id, plan_anterior, plan_nuevo, plan_status_anterior, plan_status_nuevo, timestamp, motivo (FR44).

**Dado** que un platform_admin con `scope: "platform"` consulta recursos de múltiples tenants,
**Cuando** el request es procesado,
**Entonces** recibe 200 con datos correctos (AC-RBAC-ADMIN-BYPASS) porque `ITenantContext.RequiresTenantFilter = false` para platform_admin.

**Dado** que un JWT carece tanto de `tenant_id` como de `scope: "platform"`,
**Cuando** el request llega a cualquier endpoint protegido,
**Entonces** el middleware lanza `SecurityException` inmediatamente antes de llegar al handler.

### Story 1.5: Planes, Feature Flags e Invitación de Usuarios Internos

Como platform_admin y workshop_admin,
quiero controlar las capacidades disponibles por plan y gestionar el equipo de mi taller,
para que cada compañía opere dentro de sus límites contractuales y mi equipo tenga el acceso correcto.

**Acceptance Criteria:**

**Dado** que existe la tabla `CompanyFeatureFlags` (tenant_id FK, feature_key, enabled, updated_at, updated_by),
**Cuando** se llama a `IFeatureFlagService.IsEnabled(companyId, FeatureFlags.AiGeneration)`,
**Entonces** retorna el valor correcto desde la tabla (nunca acceso directo desde el dominio) y `updated_by` registra quién hizo el último cambio.

**Dado** que una compañía Demo ha usado sus 20 generaciones totales,
**Cuando** un cliente intenta generar una imagen,
**Entonces** el sistema retorna 403 con body RFC 7807 que incluye el motivo ("Límite del plan Demo alcanzado") y un CTA de upgrade — texto explicativo, no error genérico (FR42).

**Dado** que una compañía nueva es creada con plan Demo,
**Cuando** se inicializan sus datos,
**Entonces** `CompanyFeatureFlags` se puebla automáticamente con los flags del plan Demo.

**Dado** que un platform_admin invita a un nuevo workshop_admin (`POST /api/v1/invitations`),
**Cuando** la invitación es procesada,
**Entonces** se envía email con token de invitación (TTL 48h) y el usuario queda en estado `pending_activation` con rol `workshop_admin` y el `tenant_id` asignado.

**Dado** que un workshop_admin invita a un operario para su propia compañía,
**Cuando** el operario completa el registro con el token de invitación,
**Entonces** la cuenta queda activa con rol `operator` y `tenant_id` igual al del workshop_admin que invitó.

**Dado** que un workshop_admin intenta invitar a un usuario a una compañía diferente a la suya,
**Cuando** el request es procesado,
**Entonces** el sistema retorna 403 (AC-RBAC-INVITE-SCOPE).

### Story 1.6: Configuración del Taller

Como workshop_admin,
quiero configurar los datos y preferencias de mi taller,
para que mi empresa tenga su propia identidad y configuración operativa dentro de la plataforma.

**Acceptance Criteria:**

**Dado** que un workshop_admin actualiza el nombre de su compañía (`PATCH /api/v1/companies/me`),
**Cuando** el cambio es guardado,
**Entonces** el nuevo nombre es visible para todos los usuarios del mismo tenant en la próxima consulta del perfil de compañía.

**Dado** que un workshop_admin sube un logo,
**Cuando** el archivo es procesado,
**Entonces** se almacena en blob storage via `IAssetStorage` y la URL resultante se guarda en `settings.logo_url`.

**Dado** que un workshop_admin configura los colores de marca (formato hex válido),
**Cuando** los colores son guardados,
**Entonces** se almacenan en `settings.brand_colors` y son retornados en el endpoint de perfil de compañía.

**Dado** que un workshop_admin configura las preferencias de notificación,
**Cuando** la configuración es guardada,
**Entonces** se almacena en `settings.notification_config` y el módulo de notificaciones respeta esa configuración en pedidos posteriores.

**Dado** que el campo `settings.domain_config` existe en el schema jsonb desde el primer deploy,
**Cuando** una futura feature intente configurar un dominio personalizado,
**Entonces** el campo ya existe sin necesidad de una nueva migración de schema.

## Epic 2: Catálogo de Prendas y Configuración del Taller

Un cliente puede explorar las prendas disponibles del taller, ver zonas de impresión y técnicas, y seleccionar qué personalizar. Un workshop_admin puede activar/desactivar prendas, colores y técnicas según su inventario real.

### Story 2.1: Backend del Catálogo con Seeds del Prototipo

Como cliente externo,
quiero explorar las prendas disponibles del taller con sus colores, zonas de impresión y técnicas,
para saber qué puedo personalizar antes de comenzar a diseñar.

**Acceptance Criteria:**

**Dado** que el Catalog BC existe con las migraciones ejecutadas,
**Cuando** se ejecutan los seeds SQL del catálogo,
**Entonces** existen exactamente 10 tipos de prenda, 23 zonas de impresión normalizadas y 5 técnicas de impresión — datos migrados del prototipo con sus relaciones prenda→vista→zonas→técnicas.

**Dado** que un cliente autenticado consulta el catálogo de la compañía activa (`GET /api/v1/catalog/garments`),
**Cuando** la solicitud es procesada,
**Entonces** retorna únicamente las prendas activas para ese tenant (filtradas por `tenant_id` + `is_active = true`), con sus variantes de color disponibles.

**Dado** que un cliente consulta las zonas de impresión para una combinación prenda-vista (`GET /api/v1/catalog/garments/{garmentId}/views/{viewId}/zones`),
**Cuando** la solicitud es procesada,
**Entonces** retorna las zonas disponibles con sus dimensiones en cm y la técnica recomendada para cada zona.

**Dado** que el catálogo está cacheado en Redis (TTL configurable vía `IConfiguration`),
**Cuando** se consulta el catálogo repetidamente sin cambios,
**Entonces** las respuestas posteriores a la primera se sirven desde Redis sin consultar PostgreSQL — confirmable con logs estructurados.

**Dado** que el catálogo cambia (se activa o desactiva una prenda),
**Cuando** la modificación es guardada,
**Entonces** el caché de Redis para ese tenant se invalida inmediatamente y la próxima consulta refleja el cambio.

### Story 2.2: Exploración y Selección de Prenda en el Frontend

Como cliente,
quiero navegar por el catálogo de prendas, ver sus colores y zonas de impresión, y seleccionar lo que quiero personalizar,
para comenzar mi diseño sobre la prenda y variante correctas.

**Acceptance Criteria:**

**Dado** que un cliente accede a la pantalla de selección de prenda,
**Cuando** la página carga,
**Entonces** ve las prendas activas del taller organizadas visualmente con sus variantes de color disponibles, cargadas desde `GET /api/v1/catalog/garments` vía TanStack Query.

**Dado** que un cliente selecciona una prenda y un color,
**Cuando** la selección es confirmada,
**Entonces** puede elegir su talla (del rango disponible para esa prenda) y la cantidad de unidades (mínimo 1), y el sistema muestra las vistas disponibles para esa prenda (frente, espalda, mangas, pecho según corresponda).

**Dado** que un cliente selecciona una vista de la prenda,
**Cuando** la vista es activada en el selector,
**Entonces** el sistema muestra la zona de impresión disponible para esa vista con sus dimensiones delimitadas visualmente y la técnica de impresión recomendada indicada.

**Dado** que un cliente ha seleccionado prenda, color, talla y cantidad,
**Cuando** confirma la selección para proceder al diseño,
**Entonces** el estado de selección se persiste en el store de Zustand y el cliente es redirigido al canvas de diseño con los datos de prenda pre-cargados.

### Story 2.3: Gestión del Catálogo por Workshop Admin

Como workshop_admin,
quiero activar y desactivar prendas, colores y técnicas según mi inventario real,
para que mis clientes solo vean opciones que realmente puedo producir.

**Acceptance Criteria:**

**Dado** que un workshop_admin accede al panel de gestión del catálogo (`GET /api/v1/admin/catalog`),
**Cuando** la página carga,
**Entonces** ve todas las prendas del catálogo base con su estado activo/inactivo para su compañía, los colores disponibles por prenda y las técnicas habilitadas.

**Dado** que un workshop_admin desactiva una prenda (`PATCH /api/v1/admin/catalog/garments/{garmentId}`),
**Cuando** el cambio es guardado,
**Entonces** la prenda deja de aparecer en el catálogo del portal del cliente para ese tenant, el caché de Redis se invalida, y la próxima consulta refleja el cambio.

**Dado** que un workshop_admin activa o desactiva un color específico de una prenda,
**Cuando** el cambio es guardado,
**Entonces** ese color específico aparece u oculta en el selector del portal del cliente sin afectar otros colores de la misma prenda.

**Dado** que un workshop_admin intenta desactivar todos los colores de una prenda dejándola sin ningún color disponible,
**Cuando** intenta guardar ese estado,
**Entonces** el sistema retorna 422 con mensaje "Una prenda debe tener al menos un color disponible para permanecer activa".

**Dado** que un workshop_admin modifica el catálogo,
**Cuando** la operación es auditada,
**Entonces** el log estructurado registra: `tenant_id`, `admin_id`, `action`, `entity_type`, `entity_id`, `timestamp`.

## Epic 3: Canvas de Diseño y Asistencia IA

Un cliente puede crear un diseño completo: generar imágenes con IA, agregar texto, cargar imágenes con remoción de fondo automática, ver alertas del validador de calidad en tiempo real, generar try-on fotorrealista (no consume cuota), y posicionar/escalar/rotar elementos en cada vista de la prenda.

**Decisiones de producto (Party Mode 2026-05-07):**
- Try-on (FR21): no consume cuota — es un "probador virtual", no un asset de diseño. TTL 24h.
- Crédito en error de Gemini: siempre se devuelve, sin excepciones visibles al usuario.
- Reset de cuota mensual: billing anniversary (fecha de activación del plan), no fecha fija.
- Tono de voz IA: primera persona ("Estoy generando tu diseño...").
- Feature flag `tryon-feature` = false por defecto; gate de entrada: P95 de FR14 < 8s medido en staging.

### Story 3.1: Port del Canvas y Contrato de Diseño Multi-Vista

Como cliente,
quiero diseñar de forma independiente en cada vista de la prenda (frente, espalda, mangas, pecho) con herramientas de posicionamiento precisas y sin perder mi trabajo,
para crear un diseño completo y consistente antes de confirmar mi pedido.

**Acceptance Criteria:**

**Dado** que el equipo inicia el sprint de DesignEngine,
**Cuando** se ejecuta la configuración previa al canvas,
**Entonces** existe `DesignSnapshotSchema.ts` (Zod) en `src/frontend/src/schemas/` con la estructura multi-vista validada: `{ id: uuid, designId: uuid, timestamp: number, activeViewId: ViewId, views: Record<ViewId, ViewState>, globalMetadata: { colorPalette: Color[], appliedTextiles: TextileRef[] } }`, donde `ViewId = 'front' | 'back' | 'left' | 'right'` y `ViewState = { elements: Element[], canvasTransform: Transform, qualityValidation?: ValidationResult }`. Este schema es el contrato inamovible entre frontend y backend (ARCH-03).

**Dado** que el DesignEngine BC está configurado con `IRateLimitPolicy` en SharedKernel/Common/,
**Cuando** se ejecutan los tests de arquitectura (NetArchTest),
**Entonces** la implementación Redis de `IRateLimitPolicy` existe en `DesignEngine.Infrastructure` y la interface vive en `SharedKernel` — la dirección de dependencia nunca es inversa (ARCH-05, ARCH-15).

**Dado** que el canvas del prototipo existe en React/Konva,
**Cuando** el port al nuevo proyecto es completado,
**Entonces** el canvas carga correctamente con la prenda y color seleccionados desde el store de Zustand, renderiza la zona de impresión delimitada visualmente para la vista activa, y el tiempo de respuesta por interacción es < 100ms para diseños de complejidad media (≤ 10 capas) (NFR-PERF-03).

**Dado** que un cliente activa una vista diferente de la prenda (ej. espalda → frente),
**Cuando** la vista cambia,
**Entonces** los elementos de la vista anterior se preservan exactamente en su posición, el canvas muestra la zona de impresión correcta para la nueva vista, y `activeViewId` se actualiza en el store de Zustand — cada vista es un espacio de diseño independiente (FR18).

**Dado** que un cliente realiza una acción de diseño (mover, agregar, eliminar elemento),
**Cuando** ejecuta deshacer (`Ctrl+Z` o botón UI),
**Entonces** el estado del canvas revierte a la acción anterior dentro de la misma sesión activa; repetir deshacer continúa retrocediendo hasta el inicio de la sesión (FR19).

**Dado** que un cliente selecciona un elemento del canvas,
**Cuando** usa los controles de transformación,
**Entonces** puede posicionar (drag), escalar (handles de esquina con proporción bloqueable) y rotar (handle superior) el elemento dentro de los límites de la zona de impresión de la vista activa — el elemento no puede arrastrarse fuera de la zona delimitada (FR22).

**Dado** que han pasado 5 segundos desde la última modificación en el canvas,
**Cuando** se ejecuta el auto-save (debounce),
**Entonces** el estado del diseño se serializa en `localStorage` bajo la clave `design:{designId}:{viewId}` y el indicador de "cambios sin guardar" desaparece — la pérdida máxima de trabajo en desconexión es 5 segundos (NFR-REL-02).

**Dado** que un cliente intenta cerrar o navegar fuera del canvas con cambios no enviados al servidor,
**Cuando** el evento `beforeunload` se dispara,
**Entonces** el navegador muestra el diálogo de confirmación estándar ("¿Seguro que quieres salir? Tus cambios podrían no haberse guardado") (UX-04).

**Dado** que el estado del canvas incluye múltiples vistas con elementos,
**Cuando** se serializa para el DesignSnapshot,
**Entonces** el JSON serializado cumple exactamente con `DesignSnapshotSchema` (validación Zod en runtime antes de enviar al backend) — fallo de validación retorna error 400 con detalle de campo en frontend antes de hacer el POST.

**Dado** que un cliente tiene el mismo borrador de diseño abierto en dos pestañas y ambas intentan guardar simultáneamente,
**Cuando** la segunda pestaña envía `PATCH /api/v1/designs/{designId}` con un `ETag` obsoleto (header `If-Match`),
**Entonces** el servidor retorna 412 Precondition Failed con body RFC 7807 — la pestaña que perdió debe recargar el estado desde el servidor antes de volver a guardar (ARCH-12).

### Story 3.2: Herramientas de Texto e Imagen Propia

Como cliente,
quiero agregar texto personalizado y cargar mis propias imágenes o logos (con remoción de fondo automática),
para enriquecer mi diseño con elementos propios sin necesidad de herramientas externas.

**Acceptance Criteria:**

**Dado** que existe la librería de remoción de fondo (`bgRemoval.ts`),
**Cuando** se ejecuta el benchmark en PNG 4K antes del sprint,
**Entonces** el resultado se documenta en `_bmad-output/planning-artifacts/bg-removal-benchmark.md` con: tiempo P50/P95/P99 en ms, tamaño de imagen procesada, entorno de ejecución. Si P95 > 2000ms, se invierte la lógica de fallback (Gemini como remoción principal, `bgRemoval.ts` como fallback) y este cambio se refleja en la historia antes de implementar (ARCH-04).

**Dado** que un cliente selecciona la herramienta de texto,
**Cuando** agrega un elemento de texto al canvas,
**Entonces** puede configurar: tipografía (lista de fuentes disponibles), tamaño (en puntos, con límite mínimo según `PrintQualityValidator`), color (selector hex), y efectos básicos (negrita, cursiva, subrayado) — el texto renderiza en el canvas en tiempo real mientras el cliente escribe (FR15).

**Dado** que un cliente selecciona una fuente del selector,
**Cuando** la fuente es aplicada al texto,
**Entonces** la fuente se carga desde Google Fonts (o bundle local) sin bloquear el hilo principal — el texto muestra un fallback durante la carga y actualiza al recibir la fuente (no flash visible > 200ms).

**Dado** que un cliente sube una imagen o logo propio (`POST /api/v1/designs/{designId}/assets`),
**Cuando** el archivo es recibido (máx. 10MB, formatos: PNG, JPG, SVG, WEBP),
**Entonces** el backend almacena el archivo original en blob storage via `IAssetStorage`, retorna la URL del asset, y el elemento aparece en el canvas en la vista activa con su tamaño original dentro de la zona de impresión (FR16).

**Dado** que un cliente solicita la remoción de fondo de una imagen cargada,
**Cuando** el proceso asíncrono inicia,
**Entonces** el canvas muestra el estado "Removiendo fondo..." con indicador de progreso en el elemento, sin bloquear otras acciones del canvas — la remoción ocurre en worker/background, no en el hilo principal (FR17).

**Dado** que la remoción de fondo completa exitosamente,
**Cuando** el resultado es retornado,
**Entonces** el canvas reemplaza automáticamente la imagen original con la imagen sin fondo, el asset procesado se almacena en blob storage, y el cliente puede proceder sin ninguna acción adicional requerida.

**Dado** que la remoción de fondo falla (timeout o error del servicio),
**Cuando** el error es procesado,
**Entonces** el canvas retorna la imagen original sin fondo removido, muestra un mensaje accionable ("No se pudo remover el fondo automáticamente — puedes continuar con la imagen original o intentar de nuevo") y el estado del diseño se preserva.

### Story 3.3: Generación de Imágenes con IA y Gestión de Cuota

Como cliente,
quiero describir en palabras naturales la imagen que necesito y recibirla generada por IA en mi canvas,
para crear diseños únicos sin haber sido entrenado en herramientas de diseño gráfico.

**Acceptance Criteria:**

**Dado** que un cliente tiene créditos de generación disponibles y describe una imagen en el campo de texto IA,
**Cuando** envía la solicitud (`POST /api/ai/generate`),
**Entonces** el backend retorna 202 Accepted con `{ jobId: uuid }` en ≤ 500ms, el sistema decrementa el contador de cuota en Redis (IRateLimitPolicy: key `quota:{tenantId}:{userId}:{plan}:{period}`) de forma atómica, y la UI muestra el estado "Estoy generando tu diseño..." con contador de créditos actualizado (ARCH-14, FR14).

**Dado** que se calcula la idempotency key de la solicitud de generación,
**Cuando** se construye el header `X-Idempotency-Key`,
**Entonces** la clave es `sha256("${userId}:${designId}:${Math.floor(Date.now() / 60000)}").slice(0, 32)` — solicitudes idénticas dentro del mismo minuto retornan el mismo `jobId` sin consumir crédito adicional (ARCH-10).

**Dado** que un cliente tiene un `jobId` activo,
**Cuando** el frontend hace polling (`GET /api/ai/jobs/{jobId}` cada 2 segundos),
**Entonces** retorna `{ status: 'pending' | 'processing' | 'completed' | 'failed', progress?: number, resultUrl?: string }`. Al alcanzar `completed`, la imagen generada se inserta automáticamente en el canvas como nuevo elemento en la vista activa (ARCH-14).

**Dado** que la generación IA completa con éxito,
**Cuando** la imagen es insertada en el canvas,
**Entonces** el asset generado se almacena en blob storage via `IAssetStorage` con `consumesQuota: true` y `ttl: null` (asset persistente, no efímero) — la imagen permanece en el diseño indefinidamente (FR14, distinción vs FR21).

**Dado** que un cliente agota su cuota (Demo: 20 totales; SaaS/LP: pool mensual),
**Cuando** intenta generar una imagen adicional,
**Entonces** el sistema retorna 403 con body RFC 7807 que incluye: `{ title: "Cuota de generación agotada", detail: "Has usado tus X generaciones del plan [Demo/mensual]. [CTA de upgrade]", remainingCredits: 0 }` — texto explicativo, no error genérico (FR23, FR42).

**Dado** que el plan es SaaS o LP y ha llegado el billing anniversary (fecha de activación del plan),
**Cuando** el job de renovación de cuota ejecuta (Hangfire, ITenantContext Case 2 con tenant_id explícito),
**Entonces** el contador en Redis se resetea a la cantidad del plan, el evento `QuotaRenewed` se registra en `outbox_messages` con `{ tenantId, userId, plan, period, renewedAt }`, y el cliente puede generar imágenes nuevamente (FR23, ARCH-08).

**Dado** que una solicitud de generación falla por cualquier error de Gemini (timeout, 429, 5xx, error de contenido),
**Cuando** el error es procesado por el backend,
**Entonces** el crédito consumido se devuelve incrementando el contador en Redis, la UI muestra "Algo salió mal. Tu crédito fue devuelto automáticamente. Puedes intentar con una descripción diferente." — sin excepciones visibles al usuario, sin distinción de tipo de error (FR23b).

**Dado** que la generación supera el hard timeout de 45 segundos,
**Cuando** el timeout se dispara en el backend,
**Entonces** el job se marca como `failed`, el crédito se devuelve, y el polling del frontend recibe `{ status: 'failed' }` con el mensaje de error estándar en el próximo ciclo de 2s (NFR-PERF-01b, FR23b).

**Dado** que se ejecutan los tests de límite de tasa,
**Cuando** se verifica la implementación de `IRateLimitPolicy`,
**Entonces** un operario del Tenant A no puede consumir cuota del Tenant B — los contadores en Redis están aislados por `(tenantId, userId, plan, period)` (NFR-SEC-04).

### Story 3.4: Validador de Calidad de Impresión

Como cliente,
quiero recibir alertas en tiempo real sobre problemas de calidad de mi diseño (contraste, tamaño de fuente, escala de imagen),
para hacer ajustes antes de confirmar y evitar resultados de impresión decepcionantes.

**Acceptance Criteria:**

**Dado** que el PrintQualityValidator está activo en el canvas,
**Cuando** el diseño tiene texto con ratio de contraste < 4.5:1 respecto al color de la prenda (criterio WCAG 2.1 AA),
**Entonces** el validador muestra una alerta naranja en el panel lateral con el mensaje: "El texto '[nombre]' puede ser difícil de ver sobre este color de prenda. Considera aumentar el contraste." — alerta advisory, no bloqueo (NFR-ACC-02, FR20).

**Dado** que el PrintQualityValidator detecta texto con tamaño efectivo < umbral mínimo para la técnica activa,
**Cuando** la alerta es generada,
**Entonces** el panel muestra: "El texto '[nombre]' puede quedar ilegible impreso a este tamaño. Recomendamos [X]pt o mayor para [técnica]." con botón CTA "Ajustar tamaño" que selecciona el elemento en el canvas (FR20).

**Dado** que el PrintQualityValidator detecta una imagen escalada por debajo del umbral de resolución mínima para la zona de impresión,
**Cuando** la alerta es generada,
**Entonces** el panel muestra: "Esta imagen puede verse pixelada al imprimir. Considera usar una imagen de mayor resolución o reducir su tamaño en el canvas." con botón CTA "Ver zona de impresión" (FR20).

**Dado** que el cliente tiene alertas activas del validador y decide confirmar el pedido de todas formas,
**Cuando** hace clic en "Confirmar pedido",
**Entonces** el sistema registra en el backend `POST /api/v1/designs/{designId}/quality-events` con el payload: `{ designId, snapshot: DesignSnapshotSchema, alerts: [{ type, severity, elementId }], confirmedWithWarnings: true, confirmedAt, validatorVersion }` — auth: API key service-to-service, rate limit: 100/min (ADR-007, FR20).

**Dado** que el endpoint de log de calidad es llamado,
**Cuando** el log es procesado,
**Entonces** el registro se almacena con retención de 90 días en hot storage y el campo `validatorVersion` permite correlacionar alertas con versiones del validador (ADR-007).

**Dado** que no hay alertas activas del validador,
**Cuando** el cliente hace clic en "Confirmar pedido",
**Entonces** `POST /api/v1/designs/{designId}/quality-events` se llama con `{ confirmedWithWarnings: false, alerts: [] }` — el log siempre se registra, no solo cuando hay advertencias.

**Dado** que el canvas renderiza en tiempo real,
**Cuando** el usuario modifica un elemento (mover, escalar, cambiar texto, cambiar color),
**Entonces** el PrintQualityValidator re-evalúa en ≤ 500ms (debounce de 300ms) y actualiza el panel de alertas — no produce re-renders del canvas completo, solo actualiza el panel lateral.

### Story 3.5: Try-on Fotorrealista (Feature Gated)

Como cliente,
quiero ver cómo quedaría mi diseño sobre un modelo real antes de confirmar,
para tomar mi decisión de compra con mayor confianza.

**Gate de entrada:** Esta historia no puede iniciarse hasta que el P95 del endpoint de generación IA (FR14, Story 3.3) sea < 8 segundos medido en staging con carga representativa.

**Acceptance Criteria:**

**Dado** que el feature flag `tryon-feature` está habilitado para la compañía (`CompanyFeatureFlags.TryOn = true`),
**Cuando** un cliente hace clic en "Ver try-on" en el canvas,
**Entonces** el botón está visible y habilitado — cuando `tryon-feature = false` (default), el botón no aparece en el canvas (FR21).

**Dado** que un cliente solicita un try-on (`POST /api/ai/tryon`),
**Cuando** la solicitud es procesada,
**Entonces** el backend retorna 202 Accepted con `{ jobId }`, NO decrementa el contador de cuota del cliente (`consumesQuota: false`), y el asset resultante tiene TTL de 24 horas en blob storage — comportamiento semánticamente distinto de FR14 (FR21, distinción explícita con Story 3.3).

**Dado** que el cliente tiene un `jobId` de try-on activo,
**Cuando** el frontend hace polling (`GET /api/ai/jobs/{jobId}` cada 2 segundos),
**Entonces** al alcanzar `completed`, el mockup fotorrealista se muestra en un modal overlay sobre el canvas con: imagen del try-on, disclaimer visible "Imagen referencial — el resultado final puede variar levemente." y botón "Continuar al pedido" (UX-02, FR21).

**Dado** que el cliente visualiza el try-on y decide proceder,
**Cuando** hace clic en "Continuar al pedido",
**Entonces** el modal se cierra y el cliente es dirigido al flujo de checkout preservando todos los datos del diseño en Zustand.

**Dado** que un try-on falla por error de Gemini,
**Cuando** el error es procesado,
**Entonces** la UI muestra "No se pudo generar el try-on. Puedes continuar sin él." — sin impacto en la cuota (no se consumió) y el cliente puede proceder al checkout normalmente.

**Dado** que el try-on fue generado y el cliente confirma el pedido,
**Cuando** el pedido es procesado y alcanza estado `Enviado`,
**Entonces** si el TTL del mockup (24h) aún no ha expirado, el cliente recibe SMS con el link del mockup y el mensaje: "Tu mockup estará disponible 24 horas en este link. Después, encuéntralo en tu cuenta." — si expiró, el SMS no incluye el link (UX-07).

## Epic 4: Pedidos, Checkout y Garantía de Fidelidad

Un cliente puede revisar su pedido completo, aceptar los términos legales y la política de no-retracto, ver el precio calculado, y confirmar con la garantía Zero-Reinterpretation (DesignSnapshot inmutable + ProductionQueue en una transacción ACID). Puede ver su historial, cancelar pedidos en estado Recibido, y el operario puede registrar el pago manualmente.

### Story 4.1: Precio en Tiempo Real y Pantalla de Resumen del Pedido

Como cliente,
quiero ver el precio calculado de mi pedido y revisar un resumen completo (diseño por vista, prenda, talla, cantidad, dirección) antes de confirmar,
para tomar una decisión informada sin sorpresas.

**Acceptance Criteria:**

**Dado** que un cliente ha completado su diseño y accede a la pantalla de resumen,
**Cuando** se carga la pantalla,
**Entonces** `GET /api/v1/orders/price-preview` calcula el precio con el desglose completo: `{ breakdown: { garmentBase, techniqueCost, zoneMultiplier, quantity }, total, currency }` basado en prenda, técnica activa, número de zonas con elementos y cantidad de unidades (FR31b).

**Dado** que el cliente modifica la cantidad en la pantalla de resumen,
**Cuando** el valor cambia,
**Entonces** el precio total se recalcula en tiempo real (nueva llamada a `price-preview`) sin redirigir al canvas — el desglose de precio se actualiza en ≤ 500ms (FR31b, NFR-PERF-01).

**Dado** que la prenda seleccionada no tiene técnica activa configurada,
**Cuando** se intenta calcular el precio,
**Entonces** el sistema retorna 422 con mensaje "No se puede calcular el precio: la prenda no tiene técnica de impresión configurada. Contacta al taller." — el botón "Confirmar pedido" permanece deshabilitado (FR31b).

**Dado** que el precio está calculado y el cliente revisa el resumen,
**Cuando** la pantalla de resumen está completa,
**Entonces** muestra: miniatura del canvas por cada vista con elementos (generada desde `previewUrl` del DesignSnapshot draft), prenda + color + talla + cantidad, precio desglosado, y dirección de entrega ingresada (FR24).

**Dado** que existe un diseño con elementos solo en algunas vistas,
**Cuando** se muestra el resumen,
**Entonces** solo se muestran las vistas que tienen al menos un elemento — las vistas vacías no aparecen en el resumen del pedido.

### Story 4.2: Dirección de Entrega y Cumplimiento Legal Pre-Confirmación

Como cliente,
quiero validar mi dirección de entrega y aceptar los términos legales (incluyendo la política de no-retracto) antes de confirmar mi pedido,
para que mi pedido llegue correctamente y entiendo mis derechos.

**Acceptance Criteria:**

**Dado** que un cliente ingresa su dirección de entrega,
**Cuando** selecciona el país (CO, MX, US, AR, CL, PE),
**Entonces** el formulario adapta los campos requeridos y sus formatos según el país: código postal (format varies), estado/departamento/provincia según nomenclatura local, ciudad (autocompletado por prefijo), y el sistema valida el formato antes de continuar (FR25, NFR-COMPAT-03).

**Dado** que la validación automática de dirección falla (ciudad no reconocida en la base de datos),
**Cuando** el sistema no puede confirmar la dirección,
**Entonces** muestra el mensaje "No pudimos verificar tu dirección automáticamente. Por favor confirma que los datos son correctos." con un checkbox de confirmación explícita — el cliente puede continuar marcando ese checkbox (FR25).

**Dado** que el cliente llega a la pantalla de transición pre-checkout,
**Cuando** la pantalla carga,
**Entonces** muestra el aviso de no-retracto como parte natural del flujo: "Tu diseño está listo para producción. Al confirmar, autorizas que este diseño exacto sea producido a tu medida." — tono de autoría, no legal intimidante (ARCH-21, UX-05).

**Dado** que el cliente revisa los checkboxes de aceptación,
**Cuando** la pantalla de confirmación legal está activa,
**Entonces** existen dos checkboxes independientes: (1) "Acepto los términos de servicio [link]" y (2) "Entiendo que no puedo retractarme de una prenda personalizada (Ley 1480/2011)" — el botón "Confirmar pedido" permanece deshabilitado hasta que ambos estén marcados (FR26).

**Dado** que el cliente marca ambos checkboxes y confirma,
**Cuando** el submit se prepara,
**Entonces** el payload incluye `{ tosVersion: "v2.1", noRetractoVersion: "v1.0", acceptedAt: timestamp }` para trazabilidad legal — estos campos se persisten en el Order aggregate.

### Story 4.3: Confirmación Atómica — Zero-Reinterpretation Guarantee

Como cliente,
quiero que al confirmar mi pedido el sistema garantice que el diseño que aprobé es exactamente el que se producirá y que nunca será modificado después,
para tener confianza absoluta en el resultado final.

**Acceptance Criteria:**

**Dado** que el equipo inicia el sprint de Orders,
**Cuando** se verifica la preparación arquitectónica,
**Entonces** existe `_bmad-output/planning-artifacts/cross-schema-transaction-strategy.md` documentando la estrategia de transacción cross-schema entre `DesignEngineDbContext` y `OrdersDbContext` (ARCH-06) — sin este documento el sprint no comienza.

**Dado** que un cliente envía `POST /api/v1/orders/confirm` sin el header `Idempotency-Key`,
**Cuando** el request llega al handler,
**Entonces** el sistema retorna 400 con body RFC 7807: `{ title: "Idempotency-Key requerido", detail: "El header Idempotency-Key es obligatorio para confirmar un pedido." }` — el handler no ejecuta ninguna escritura (NFR-INT-05).

**Dado** que el cliente envía `POST /api/v1/orders/confirm` con `Idempotency-Key` válida y datos correctos,
**Cuando** el comando es procesado por el handler,
**Entonces** en una sola `SaveChangesAsync()` en `OrdersDbContext` se crean: (1) el registro `Order` con estado `Recibido`, (2) el `DesignSnapshot` como Value Object sellado con `{ canvasJson, previewUrl, printZones, technique, catalogVersion, priceAtConfirmation }`, y (3) el `OutboxMessage` de tipo `OrderConfirmed` con `TenantId` serializado — si cualquier escritura falla, todo revierte (FR27, invariante Zero-Reinterpretation).

**Dado** que el mismo `Idempotency-Key` se envía dentro de la ventana de 24 horas,
**Cuando** el request duplicado llega,
**Entonces** el `IdempotencyBehavior` (primero en el pipeline MediatR) detecta la key en Redis y retorna la respuesta original almacenada sin ejecutar ninguna escritura adicional (ARCH-10, NFR-INT-05).

**Dado** que un pedido ha sido confirmado y tiene un `DesignSnapshot` asociado,
**Cuando** cualquier cliente (incluso el autor del diseño) intenta `PATCH /api/v1/designs/{designId}`,
**Entonces** el sistema retorna 409 con mensaje "Este diseño ha sido confirmado y es inmutable. Para hacer cambios, crea un nuevo pedido." — la inmutabilidad es enforced en el handler de comandos, no solo a nivel de DB (NFR-INT-01).

**Dado** que el `DesignSnapshot` se está construyendo pre-persistencia,
**Cuando** se ejecuta la validación de schema,
**Entonces** el payload pasa por `DesignSnapshotSchema` (validación Zod equivalente en el backend) — fallo retorna 422 con detalle del campo inválido antes de intentar persistir.

**Dado** que se ejecutan los tests de Testcontainers con `docker-compose.test.yml`,
**Cuando** se valida la atomicidad (AC-ATOMIC-01),
**Entonces** una falla simulada en la escritura del `OutboxMessage` después de persistir el `DesignSnapshot` provoca rollback completo — ningún registro queda en la DB.

**Dado** que se ejecuta AC-ATOMIC-02,
**Cuando** la falla es simulada antes de la escritura del `DesignSnapshot`,
**Entonces** tampoco queda registro de `Order` ni `OutboxMessage` — la transacción es completamente atómica o nula.

### Story 4.4: Historial de Pedidos, Detalle y Cancelación

Como cliente,
quiero ver el historial de todos mis pedidos, revisar el diseño exacto de cualquier pedido anterior, y cancelar un pedido que aún no haya sido pagado ni procesado,
para mantener control sobre mis compras.

**Acceptance Criteria:**

**Dado** que un cliente autenticado accede a su historial (`GET /api/v1/orders`),
**Cuando** la solicitud es procesada,
**Entonces** retorna lista paginada (20 por defecto) de sus pedidos ordenada por `created_at DESC` con: `orderId`, `status`, `garmentName`, `previewUrl` (thumbnail del DesignSnapshot vista frente), `total`, `createdAt` — filtrada por `customer_id` del JWT (FR29).

**Dado** que un cliente consulta el detalle de un pedido (`GET /api/v1/orders/{orderId}`),
**Cuando** la solicitud es procesada,
**Entonces** retorna el DesignSnapshot completo (canvasJson + previewUrl por cada vista con elementos), specs de prenda (nombre, color, talla, cantidad), precio desglosado, dirección de entrega, historial de estados con timestamps, y estado de pago — el diseño mostrado es exactamente el que fue confirmado (FR30).

**Dado** que un cliente intenta ver el detalle de un pedido de otro cliente,
**Cuando** el request llega al handler,
**Entonces** retorna 404 — el `HasQueryFilter` de EF Core filtra por `customer_id` antes de que el handler ejecute (NFR-SEC-04).

**Dado** que un cliente solicita cancelar un pedido en estado `Recibido` y `paid = false` (`DELETE /api/v1/orders/{orderId}`),
**Cuando** la cancelación es procesada,
**Entonces** el pedido actualiza a `status = 'Cancelled'` y `cancelled_at = now()` (soft-delete, `deleted_at` no se usa para cancelación — el campo semántico es `cancelled_at`) y el pedido permanece visible en el historial con estado "Cancelado" (FR28, ARCH-11).

**Dado** que un cliente intenta cancelar un pedido que ya fue marcado como pagado o tiene estado diferente a `Recibido`,
**Cuando** el request es procesado,
**Entonces** retorna 422 con mensaje explícito del estado actual: "No se puede cancelar un pedido en estado [Estado actual]." (FR28).

### Story 4.5: Registro Manual de Pago por Operario

Como operario,
quiero registrar la recepción del pago de un pedido,
para que el sistema refleje el estado de pago correcto y el cliente sea notificado.

**Acceptance Criteria:**

**Dado** que un operario autenticado (rol `operator`) registra el pago de un pedido de su compañía (`POST /api/v1/orders/{orderId}/payment`),
**Cuando** la operación es procesada,
**Entonces** el pedido actualiza `paid = true`, `paid_at = now()`, `paid_by = operatorId` — el campo `status` no cambia automáticamente al registrar el pago (la transición de estado es independiente).

**Dado** que un operario de Tenant A intenta registrar el pago de un pedido del Tenant B,
**Cuando** el request llega al handler,
**Entonces** retorna 404 — el `HasQueryFilter` de EF Core filtra por `tenant_id` antes de ejecutar (NFR-SEC-04).

**Dado** que el pago es registrado exitosamente,
**Cuando** el `OutboxMessage` de tipo `PaymentRegistered` es procesado por el relayer,
**Entonces** el módulo de Notificaciones dispara el evento correspondiente si `settings.notification_config` del taller tiene habilitado el evento `payment_registered`.

**Dado** que un operario intenta registrar pago de un pedido en estado `Cancelled`,
**Cuando** el request es procesado,
**Entonces** retorna 422 con mensaje "No se puede registrar pago para un pedido cancelado."

**Dado** que el pago es registrado,
**Cuando** se genera el log de auditoría,
**Entonces** el log estructurado incluye: `tenant_id`, `operator_id`, `order_id`, `action: "payment_registered"`, `timestamp` — evento de auditoría obligatorio para toda acción de operario sobre pedidos (NFR-SEC-07).

## Epic 5: Portal del Taller, Cola de Producción y Modo Presencial

Un operario puede ver la cola de producción organizada por técnica y estado, acceder al diseño exacto aprobado con dimensiones y técnica recomendada, actualizar el estado del pedido, registrar incidencias, y asistir a clientes físicamente presentes usando el mismo sistema. Un workshop_admin puede consultar el historial completo del taller.

### Story 5.1: Cola de Producción — Vista y Filtrado

Como operario,
quiero ver la cola de pedidos pendientes de producción de mi compañía, filtrada y ordenada por técnica, estado y fecha,
para organizar mi trabajo diario de forma eficiente.

**Acceptance Criteria:**

**Dado** que un operario autenticado accede al dashboard de producción,
**Cuando** se carga la cola (`GET /api/v1/production/queue`),
**Entonces** retorna pedidos del tenant activo con estado ≠ `Enviado` y ≠ `Cancelled`, ordenados por `created_at ASC` por defecto, con campos: `orderId`, `status`, `technique`, `garmentName`, `quantity`, `createdAt`, `incidentCount` (FR32).

**Dado** que el endpoint de cola está indexado correctamente,
**Cuando** se consulta con carga normal del taller (≤ 200 pedidos activos),
**Entonces** el tiempo de respuesta es < 200ms (NFR-PERF-07) — índice compuesto `(tenant_id, status, technique, created_at)` definido en la migración inicial (NFR-SCALE-03).

**Dado** que un operario aplica filtros a la cola,
**Cuando** envía `GET /api/v1/production/queue?status=EnProduccion&technique=serigrafia&date_from=2026-05-01`,
**Entonces** la respuesta contiene únicamente pedidos que cumplen todos los filtros simultáneamente, siempre restringida al `tenant_id` del JWT (FR33).

**Dado** que el frontend del operario está activo en el dashboard,
**Cuando** han pasado 30 segundos desde la última actualización,
**Entonces** TanStack Query ejecuta polling automático al endpoint de cola — los nuevos pedidos confirmados por clientes aparecen sin recargar manualmente la página.

**Dado** que un operario de Tenant A intenta acceder a la cola de Tenant B,
**Cuando** el request es procesado,
**Entonces** retorna 404 — `HasQueryFilter` global filtra por `tenant_id` antes de ejecutar el handler (NFR-SEC-04).

### Story 5.2: Vista del Diseño Exacto Aprobado con Specs de Producción

Como operario,
quiero ver el diseño exacto que aprobó el cliente con todas las especificaciones de producción (dimensiones de zona, técnica, talla, color),
para producir exactamente lo que fue confirmado sin ambigüedad.

**Acceptance Criteria:**

**Dado** que un operario selecciona un pedido de la cola,
**Cuando** accede al detalle de producción (`GET /api/v1/production/queue/{orderId}/design`),
**Entonces** retorna el `DesignSnapshot` completo sellado al momento de confirmación: `previewUrl` por cada vista con elementos, `printZones` con dimensiones en cm por zona activa, técnica recomendada por zona, talla, cantidad y color de la prenda (FR34).

**Dado** que la UI del operario renderiza el detalle de diseño,
**Cuando** se muestra la información de producción,
**Entonces** las vistas del diseño se presentan en pestañas (frente, espalda, etc.) con dimensiones de zona superpuestas sobre el preview, técnica recomendada indicada de forma prominente, y la nota "Diseño aprobado por el cliente el [fecha]" para reforzar la inmutabilidad.

**Dado** que el `DesignSnapshot` tiene `confirmedWithWarnings: true` (cliente confirmó con alertas del validador activas),
**Cuando** el operario visualiza el diseño,
**Entonces** aparece un indicador de advertencia con las alertas específicas del momento de confirmación (ej. "El cliente confirmó con advertencia de contraste en texto 'NOMBRE'") — sin bloquear el flujo de producción.

**Dado** que el `OutboxMessage` de tipo `OrderConfirmed` es procesado por el relayer de Hangfire,
**Cuando** el handler de `IntegrationEvent` del BC ProductionQueue lo consume,
**Entonces** crea una copia denormalizada `ProductionDesignSnapshot` en el schema `production_queue` con los campos necesarios para producción (`previewUrl` por vista, `printZones`, `technique`, `confirmedWithWarnings`, `alerts`) — `GET /api/v1/production/queue/{orderId}/design` es servido desde esta tabla local sin JOINs cross-schema contra `orders` ni `design_engine` (ARCH-20, ARCH-13).

**Dado** que el operario accede al diseño de un pedido de otro tenant,
**Cuando** el request es procesado,
**Entonces** retorna 404 (NFR-SEC-04).

### Story 5.3: Actualización de Estado y Registro de Incidencias

Como operario,
quiero actualizar el estado de producción de un pedido a lo largo del flujo de trabajo y registrar incidencias cuando algo sale mal,
para mantener al cliente informado y tener trazabilidad de problemas de producción.

**Acceptance Criteria:**

**Dado** que un operario actualiza el estado de un pedido (`PATCH /api/v1/production/queue/{orderId}/status`),
**Cuando** la transición es válida (`Recibido → EnProduccion → ControlDeCalidad → Listo → Enviado`),
**Entonces** el estado se actualiza en la DB, se registra `changed_by`, `changed_at`, y se crea un `OutboxMessage` de tipo `OrderStatusChanged` con `{ orderId, tenantId, previousStatus, newStatus, changedBy, changedAt }` en la misma transacción (FR35).

**Dado** que el operario intenta una transición inválida (ej. `Recibido → Listo`),
**Cuando** el request es procesado,
**Entonces** retorna 422 con mensaje "Transición no permitida: Recibido → Listo. El siguiente estado válido es EnProduccion." (FR35).

**Dado** que el operario necesita revertir un estado (ej. `ControlDeCalidad → EnProduccion`),
**Cuando** ejecuta `PATCH /api/v1/production/queue/{orderId}/status/revert`,
**Entonces** el estado retrocede exactamente un paso en la secuencia válida, siempre que el estado actual no sea `Enviado` — intentar revertir `Enviado` retorna 422 "Un pedido enviado no puede revertirse." (FR35).

**Dado** que un operario registra una incidencia (`POST /api/v1/production/queue/{orderId}/incidents`),
**Cuando** el body incluye `{ category, description }` con `category` en `['design_error', 'size_error', 'supply_error', 'other']` y `description` ≤ 500 caracteres,
**Entonces** la incidencia se persiste con `reportedBy = operatorId`, `reportedAt = now()`, y el campo `incidentCount` del pedido en la cola se incrementa (FR36b).

**Dado** que el `description` excede 500 caracteres o `category` no es un valor del enum,
**Cuando** el request es procesado,
**Entonces** retorna 400 con body RFC 7807 con detalle de campo inválido (NFR-INT-06).

**Dado** que un operario intenta actualizar estado o registrar incidencia de un pedido de otro tenant,
**Cuando** el request es procesado,
**Entonces** retorna 404 (NFR-SEC-04).

### Story 5.4: Historial del Taller — Vista Workshop Admin

Como workshop_admin,
quiero consultar el historial completo de pedidos de mi taller con filtros por estado y rango de fechas,
para hacer seguimiento de la operación y detectar tendencias.

**Acceptance Criteria:**

**Dado** que un workshop_admin autenticado accede al historial (`GET /api/v1/admin/orders`),
**Cuando** la solicitud es procesada,
**Entonces** retorna historial completo del tenant (todos los estados incluyendo `Enviado` y `Cancelled`) con paginación de 50 por defecto (máx. 200), campos: `orderId`, `customerName`, `garmentName`, `technique`, `status`, `paid`, `createdAt`, `updatedAt`, `incidentCount` (FR36).

**Dado** que el workshop_admin aplica filtros al historial,
**Cuando** envía `GET /api/v1/admin/orders?status=Enviado&date_from=2026-05-01&date_to=2026-05-31`,
**Entonces** la respuesta incluye únicamente pedidos del tenant activo que cumplen todos los filtros — el `HasQueryFilter` global garantiza que nunca se filtran pedidos de otros tenants.

**Dado** que el workshop_admin solicita exportación CSV (`GET /api/v1/admin/orders?format=csv`),
**Cuando** el request es recibido,
**Entonces** retorna 202 Accepted con `{ jobId }` — la generación es asíncrona (Hangfire job). El link de descarga se retorna cuando el job completa (implementación completa en Story 6.4).

**Dado** que un workshop_admin intenta acceder al historial de otro tenant,
**Cuando** el request es procesado,
**Entonces** retorna 404 (NFR-SEC-04).

### Story 5.5: Modo Presencial — Diseño Asistido y Aprobación en Dispositivo

Como operario,
quiero iniciar una sesión de diseño en nombre de un cliente que está físicamente presente, que el cliente apruebe el diseño en mi dispositivo, y que el pedido entre a la misma cola de producción,
para atender clientes en el taller con el mismo flujo digital sin fricción adicional.

**Acceptance Criteria:**

**Dado** que un operario inicia una sesión presencial (`POST /api/v1/presential/sessions`),
**Cuando** la sesión es creada,
**Entonces** retorna `{ sessionId: uuid, designUrl: string, approvalPin: string (4 dígitos) }` vinculada al `operator_id` y `tenant_id` — no requiere cuenta del cliente para iniciar (FR46).

**Dado** que el operario abre el `designUrl` en su dispositivo,
**Cuando** el canvas carga en modo presencial,
**Entonces** muestra banner superior "Modo presencial — Diseñando en nombre de cliente", el canvas es idéntico al del portal del cliente (mismo componente React, misma funcionalidad), y el botón "Confirmar pedido" está deshabilitado hasta que el cliente apruebe (UX-01, FR46).

**Dado** que el diseño está listo y el operario pasa el dispositivo al cliente para aprobación,
**Cuando** el cliente ingresa el PIN de 4 dígitos y confirma (`POST /api/v1/presential/sessions/{sessionId}/approve` con `{ pin }`),
**Entonces** la sesión se marca como `approved_at = now()` y el botón "Confirmar pedido" se habilita en el dispositivo del operario (FR47).

**Dado** que el cliente ha aprobado y el operario confirma el pedido (`POST /api/v1/presential/sessions/{sessionId}/confirm`),
**Cuando** el comando es procesado,
**Entonces** dispara el mismo handler atómico de Story 4.3 (DesignSnapshot + OutboxMessage en una sola transacción) con el campo `origin: 'presential'` en los metadatos del pedido — misma garantía Zero-Reinterpretation (FR48).

**Dado** que el pedido presencial es confirmado,
**Cuando** aparece en la cola de producción,
**Entonces** está en la misma vista que los pedidos digitales con `status = 'Recibido'`, sin cola separada — la única distinción visible es el badge "Presencial" en el detalle del pedido (FR48).

**Dado** que el PIN ingresado es incorrecto,
**Cuando** el cliente intenta aprobar,
**Entonces** retorna 401 con mensaje "PIN incorrecto. El operario puede generar un nuevo PIN si es necesario." — máximo 5 intentos antes de invalidar la sesión por seguridad.

## Epic 6: Notificaciones, Métricas Operativas y Preparación para Producción

El cliente recibe notificaciones SMS automáticas en cada cambio de estado y una solicitud de calificación al completarse. Un workshop_admin configura qué eventos generan notificaciones. Un platform_admin consulta métricas de uso, exporta datos, y el sistema expone observabilidad completa lista para producción.

### Story 6.1: Notificaciones SMS — Confirmación de Pedido y Cambios de Estado

Como cliente,
quiero recibir un SMS al confirmar mi pedido y en cada cambio de estado durante producción,
para estar informado sin tener que revisar el portal constantemente.

**Acceptance Criteria:**

**Dado** que el módulo `INotificationService` está configurado con Twilio,
**Cuando** el relayer de Hangfire procesa un `OutboxMessage` de tipo `OrderConfirmed`,
**Entonces** `INotificationService.SendSmsAsync` es invocado con el número de teléfono del cliente y el texto: número de pedido, prenda, técnica, total y resumen de dirección de entrega — el `From` de Twilio está configurado por tenant (FR38).

**Dado** que el relayer procesa un `OutboxMessage` de tipo `OrderStatusChanged`,
**Cuando** el evento es recibido por el módulo de notificaciones,
**Entonces** consulta `settings.notification_config` del taller correspondiente al `tenantId` del mensaje — solo dispara SMS si el evento de cambio está habilitado en esa configuración (FR37).

**Dado** que el número de teléfono del cliente es inválido para su país,
**Cuando** se intenta enviar el SMS,
**Entonces** Twilio retorna error, el módulo lo registra en log estructurado con `{ tenantId, orderId, event, twilioError }` y no reintenta automáticamente — el flujo de producción no se interrumpe (Fase 1).

**Dado** que Twilio retorna un error 5xx transitorio,
**Cuando** el job de Hangfire falla,
**Entonces** Hangfire reintenta con backoff exponencial hasta 3 veces — después de 3 fallos el job queda en estado `Failed` visible en el dashboard de Hangfire, sin impacto en el estado del pedido.

**Dado** que el SMS de confirmación es enviado,
**Cuando** el log estructurado es generado,
**Entonces** incluye: `tenant_id`, `order_id`, `event_type: "sms_sent"`, `sms_type: "order_confirmed"`, `timestamp` — sin incluir el número de teléfono completo en el log (privacidad, últimos 4 dígitos máximo).

### Story 6.2: Configuración de Notificaciones y Solicitud de Calificación Post-Envío

Como workshop_admin,
quiero controlar qué cambios de estado generan SMS a mis clientes y que el sistema solicite calificación automáticamente cuando un pedido es enviado,
para mantener a mis clientes informados sin saturarlos de mensajes.

**Acceptance Criteria:**

**Dado** que un workshop_admin accede a la configuración de notificaciones (`PATCH /api/v1/admin/notification-config`),
**Cuando** actualiza el mapa de eventos,
**Entonces** se persiste en `settings.notification_config`: `{ OrderConfirmed: bool, StatusEnProduccion: bool, StatusControlDeCalidad: bool, StatusListo: bool, StatusEnviado: bool, PaymentRegistered: bool }` — el cambio toma efecto en el siguiente evento procesado (FR39).

**Dado** que un `OutboxMessage` de tipo `OrderStatusChanged` con `newStatus: 'Enviado'` es procesado,
**Cuando** el módulo de notificaciones lo recibe,
**Entonces** dispara la solicitud de calificación independientemente de la configuración del taller (`StatusEnviado` en `notification_config` controla el SMS de estado pero no la solicitud de calificación — esta siempre se envía) (FR39b).

**Dado** que la solicitud de calificación es enviada,
**Cuando** el SMS llega al cliente,
**Entonces** incluye un link único con formato `https://{domain}/rate/{ratingToken}` (UUID, TTL 7 días) — el token es de un solo uso.

**Dado** que el cliente accede al link y envía su calificación (`POST /api/v1/ratings` con `{ ratingToken, score: 1-5, comment? }`),
**Cuando** el request es procesado,
**Entonces** persiste `{ orderId, tenantId, score, comment, submittedAt }` y retorna 200 con mensaje "¡Gracias por tu calificación!" — sin autenticación requerida, el token en URL actúa como credential.

**Dado** que el mismo `ratingToken` se usa por segunda vez,
**Cuando** el request llega al endpoint,
**Entonces** retorna 409 con mensaje "Tu calificación ya fue registrada. ¡Gracias!" — el token queda marcado como `used = true` tras el primer uso exitoso.

**Dado** que el `ratingToken` ha expirado (> 7 días),
**Cuando** el cliente intenta calificar,
**Entonces** retorna 410 Gone con mensaje "Este link ha expirado. Lamentablemente ya no es posible dejar tu calificación."

### Story 6.3: Métricas de Uso por Compañía y Eventos Facturables

Como platform_admin,
quiero consultar métricas de uso por compañía y que el sistema registre eventos de consumo facturable de forma estructurada,
para monitorear el uso de la plataforma y tener los datos necesarios para billing futuro.

**Acceptance Criteria:**

**Dado** que cada generación IA es ejecutada (independientemente del resultado),
**Cuando** el backend procesa la solicitud,
**Entonces** registra en `billing_events`: `{ id: uuid, tenantId, userId, eventType: 'ai_generation', metadata: { model: 'gemini', success: bool, quotaConsumed: bool }, occurredAt }` — los eventos fallidos con crédito devuelto registran `quotaConsumed: false` (FR45b, NFR-OBS-04).

**Dado** que un pedido es confirmado,
**Cuando** el `OutboxMessage` de `OrderConfirmed` es procesado,
**Entonces** registra en `billing_events`: `{ id: uuid, tenantId, eventType: 'order_confirmed', metadata: { technique, zoneCount, quantity, total }, occurredAt }` (FR45b, NFR-OBS-04).

**Dado** que `billing_events` tiene índice compuesto en `(tenant_id, event_type, occurred_at)`,
**Cuando** se ejecuta la query de métricas,
**Entonces** el tiempo de respuesta es < 500ms para períodos de hasta 12 meses (NFR-PERF-01).

**Dado** que un platform_admin consulta métricas (`GET /api/v1/admin/metrics?companyId={id}&period=monthly`),
**Cuando** la solicitud es procesada (AC-RBAC-ADMIN-BYPASS activo),
**Entonces** retorna: `{ orders: { total, byStatus: { Recibido: N, EnProduccion: N, ... } }, aiGenerations: { consumed: N, remaining: N }, activeUsers: N, completedByOperator: [{ operatorId, name, completed: N }] }` para el período solicitado (FR45).

**Dado** que un workshop_admin intenta consultar métricas de otra compañía (`?companyId={otroTenant}`),
**Cuando** el request es procesado,
**Entonces** retorna 403 con mensaje "No tienes permisos para ver métricas de otra compañía." — el workshop_admin solo puede consultar sus propias métricas omitiendo `companyId`.

### Story 6.4: Exportación CSV, Observabilidad y Preparación para Producción en Azure

Como equipo de desarrollo,
queremos que la plataforma esté completamente observable y lista para el primer deploy en Azure con CI/CD funcional, y que los administradores puedan exportar datos de pedidos para análisis externo.

**Acceptance Criteria:**

**Dado** que un workshop_admin o platform_admin solicita exportación (`GET /api/v1/admin/orders?format=csv`),
**Cuando** el request es procesado,
**Entonces** retorna 202 Accepted con `{ jobId }` — Hangfire encola el job de generación con `ITenantContext` Case 2 (tenant_id explícito en el job, nunca inferido de HTTP) (FR45c, ARCH-08).

**Dado** que el job de exportación CSV completa,
**Cuando** `GET /api/v1/export-jobs/{jobId}` es consultado,
**Entonces** retorna `{ status: 'completed', downloadUrl: string, expiresAt: timestamp }` — el CSV tiene TTL de 24h en blob storage y contiene las columnas: `orderId, status, garmentName, technique, quantity, total, createdAt, updatedAt, incidentCount` (sin datos personales completos del cliente) (FR45c).

**Dado** que el sistema está en ejecución,
**Cuando** se consulta `GET /health`,
**Entonces** retorna en < 200ms con el estado de cada subsistema: `{ api: 'ok', database: 'ok'|'degraded', redis: 'ok'|'degraded', blobStorage: 'ok'|'degraded', gemini: 'ok'|'degraded', overall: 'healthy'|'degraded' }` — `degraded` cuando algún subsistema no responde pero la API sigue operativa (NFR-OBS-01).

**Dado** que cualquier evento de negocio relevante ocurre,
**Cuando** Serilog lo registra,
**Entonces** el log JSON incluye mínimamente: `timestamp`, `level`, `message`, `tenant_id`, `user_id`, `correlation_id` (propagado desde header `X-Correlation-ID`), `bc` (nombre del Bounded Context origen) — los campos `tenant_id` y `user_id` son `null` en jobs de background donde no aplica contexto HTTP (ARCH-19, NFR-OBS-02).

**Dado** que el pipeline de GitHub Actions está configurado para el backend,
**Cuando** hay cambios en `src/backend/**`,
**Entonces** ejecuta secuencialmente: build → unit tests → integration tests (Testcontainers con `docker-compose.test.yml`) → docker build → deploy a Azure Container Apps. Un fallo en cualquier paso detiene el pipeline (ARCH-18).

**Dado** que el pipeline de GitHub Actions está configurado para el frontend,
**Cuando** hay cambios en `src/frontend/**` (sin cambios en `src/backend/**`),
**Entonces** ejecuta únicamente el pipeline frontend: build → lint → test → deploy — el pipeline de backend no se dispara (ARCH-18).

**Dado** que se ejecuta `AiWearStudio.Architecture.Tests` en CI,
**Cuando** NetArchTest valida las reglas de dependencia,
**Entonces** los siguientes casos retornan verde: (1) SharedKernel no depende de ningún BC, (2) ningún BC referencia directamente a otro BC, (3) la capa Application no referencia Infrastructure, (4) Domain no referencia Application ni Infrastructure — un fallo detiene el pipeline (ARCH-15).
