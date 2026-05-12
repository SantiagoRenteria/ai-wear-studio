---
title: 'Story 2.2 — Exploración y Selección de Prenda en el Frontend'
type: 'feature'
created: '2026-05-12'
status: 'review'
baseline_commit: '05a6575'
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
  - '_bmad-output/implementation-artifacts/spec-2-1-backend-catalogo-seeds.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El cliente accede directamente al canvas de diseño con una prenda hardcodeada. No existe pantalla de selección de prenda que cargue el catálogo real desde la API, ni flujo para elegir color, talla, cantidad y ver las zonas de impresión disponibles antes de diseñar.

**Approach:** Pantalla `GarmentSelector` previa al canvas cargada con TanStack Query desde `GET /api/v1/catalog/garments`. App.tsx gobierna la fase (`'selection' | 'design'`) con estado local. Al confirmar, la selección se persiste en Zustand y se pasa al canvas. Se extiende `GarmentDto` (backend) para incluir vistas con IDs GUID necesarias para el endpoint de zonas.

## Boundaries & Constraints

**Always:**
- `GarmentDto` se extiende con `Views: IReadOnlyList<GarmentViewDto(Guid Id, string ViewName)>` — el repositorio hace `Include(g => g.Views)`.
- La pantalla de selección usa `@tanstack/react-query` para cargar garments. `QueryClient` se registra en `main.tsx`.
- `catalogApi.ts` en `src/services/` expone `fetchGarments(): Promise<CatalogGarmentDto[]>` y `fetchZones(garmentId, viewId): Promise<CatalogPrintZoneDto[]>`. La URL base se lee de `import.meta.env.VITE_API_BASE_URL` (fallback: `''`).
- La tienda Zustand agrega: `selectedQuantity: number` (default: 1) y `setQuantity(n: number)`.
- `App.tsx` agrega `appPhase: 'selection' | 'design'` como estado local de React. Muestra `<GarmentSelector>` en fase 'selection', el canvas existente en 'design'.
- Al confirmar, se llama `store.setGarment()`, `store.setColor()`, `store.setSize()`, `store.setQuantity()` y se cambia `appPhase` a `'design'`.
- Los tamaños disponibles se derivan del `category` de la API usando una función `getSizesForCategory(category: string): string[]` en `catalogApi.ts` — mapeo hardcodeado hasta que el backend exponga sizes.
- El `Garment` que se pasa al store desde el selector mapea `CatalogGarmentDto` al tipo existente: `basePrice = 0`, `gender = 'unisex'`, `emoji = '👕'` como defaults.
- La query de garments tiene `staleTime: 5 * 60 * 1000` (5 min) alineado con el TTL Redis del backend.
- El cargador y el estado de error siguen el diseño visual del resto de la app (fondo blanco, spinner centralizado, mensaje inline).

**Ask First:**
- Nada. Todos los edge-cases están definidos.

**Never:**
- Agregar `react-router-dom` ni cualquier router externo — la navegación es estado local en App.tsx.
- Modificar las entidades de dominio del backend ni las migraciones — solo GarmentDto y el query del repositorio.
- Romper el flujo existente de autosave, compartir, retomar sesión del canvas.
- Llamar a la API de zonas sin haber seleccionado garment y color previamente.

## I/O & Edge-Case Matrix

| Scenario | Input / Estado | Comportamiento Esperado | Error |
|----------|---------------|------------------------|-------|
| Carga inicial | `appPhase = 'selection'` | Muestra GarmentSelector, TanStack Query carga garments | — |
| API disponible | Query exitosa | Grilla de prendas con colores, cantidad mínima 1 | — |
| API no disponible | `isError = true` | Mensaje "No se pudo cargar el catálogo" + botón Reintentar | — |
| Cargando | `isLoading = true` | Spinner centralizado | — |
| Selección completa | garment + color + size + qty seleccionados | Botón "Comenzar diseño" habilitado | — |
| Selección incompleta | Algún campo vacío | Botón deshabilitado | — |
| Ver zona de una vista | Vista seleccionada en step 2 | Query lazy a zones, muestra dimensiones y técnica | — |
| Confirmar selección | Click "Comenzar diseño" | Zustand actualizado, `appPhase = 'design'`, canvas listo | — |
| Volver al selector | Click "Cambiar prenda" desde canvas | `appPhase = 'selection'`, store preserva última selección | — |

## Tasks / Subtasks

- [x] **T1** — Extender GarmentDto con vistas en el backend
  - [x] T1.1 Agregar `record GarmentViewDto(Guid Id, string ViewName)` en el namespace de GetCatalogGarments
  - [x] T1.2 Agregar `Views: IReadOnlyList<GarmentViewDto>` a `GarmentDto`
  - [x] T1.3 Actualizar `GarmentRepository.GetActiveGarmentsAsync` para incluir vistas con `Include(g => g.Views)`
  - [x] T1.4 Actualizar test para verificar que Views no es vacío — `Assert.All(garments, g => Assert.NotEmpty(g.Views))`

- [x] **T2** — Instalar TanStack Query y configurar QueryClient
  - [x] T2.1 Agregar `@tanstack/react-query@^5.100.10` a `package.json`
  - [x] T2.2 Envolver `<App>` con `<QueryClientProvider>` en `main.tsx`

- [x] **T3** — Crear servicio de API del catálogo
  - [x] T3.1 Crear `src/services/catalogApi.ts` con tipos `CatalogGarmentDto`, `CatalogViewDto`, `CatalogPrintZoneDto`
  - [x] T3.2 Implementar `fetchGarments()` y `fetchZones(garmentId, viewId)`
  - [x] T3.3 Implementar `getSizesForCategory(category)` con mapeo hardcodeado

- [x] **T4** — Actualizar Zustand store
  - [x] T4.1 Agregar `selectedQuantity: number` (default 1) y `setQuantity(n: number)` al store y al tipo AppState

- [x] **T5** — Implementar GarmentSelector
  - [x] T5.1 Crear `src/components/GarmentSelector.tsx` con paso 1 (grilla de prendas + colores)
  - [x] T5.2 Agregar paso 2: size picker, quantity stepper, vistas disponibles con zonas (lazy query)
  - [x] T5.3 Conectar botón "Comenzar diseño" con la acción de confirmar y pasar a fase 'design'
  - [x] T5.4 Manejar loading y error states

- [x] **T6** — Integrar GarmentSelector en App.tsx
  - [x] T6.1 Agregar estado `appPhase` en App.tsx
  - [x] T6.2 Renderizar condicionalmente GarmentSelector o canvas
  - [x] T6.3 Agregar botón "Cambiar prenda" en el header del canvas

## Dev Agent Record

### Implementation Notes
- `GarmentDto` extendido con `Views` — no requiere migración (sólo query change).
- `appPhase` es estado local en App.tsx (no en Zustand) — es navegación, no datos.
- `accessToken` en el selector usa `store.user.id` como placeholder; en producción vendrá del módulo de auth.
- Tamaños derivados de `category` via `getSizesForCategory` hasta que el backend exponga sizes.
- `vite-env.d.ts` creado (faltaba) para que TypeScript resuelva `import.meta.env`.

### Completion Notes
- Backend: GarmentDto + GarmentRepository + test actualizado. Build y test compilan ✅
- Frontend: TanStack Query instalado, QueryClientProvider en main.tsx, GarmentSelector 2-step, integrado en App.tsx con fase 'selection'/'design'. TypeScript sin errores ✅

## File List

- `src/backend/modules/Catalog/AiWearStudio.Catalog/Application/Queries/GetCatalogGarments/GarmentDto.cs` — modificado
- `src/backend/modules/Catalog/AiWearStudio.Catalog/Infrastructure/Persistence/Repositories/GarmentRepository.cs` — modificado
- `src/backend/tests/AiWearStudio.Catalog.Tests/Integration/CatalogQueryTests.cs` — modificado
- `package.json` — modificado (+ @tanstack/react-query)
- `src/main.tsx` — modificado (QueryClientProvider)
- `src/vite-env.d.ts` — nuevo
- `src/services/catalogApi.ts` — nuevo
- `src/types.ts` — modificado (selectedQuantity, setQuantity)
- `src/store/useStore.ts` — modificado (selectedQuantity, setQuantity)
- `src/components/GarmentSelector.tsx` — nuevo
- `src/App.tsx` — modificado (appPhase, GarmentSelector, botón Cambiar prenda)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-12 | Spec creado e implementación completa |
