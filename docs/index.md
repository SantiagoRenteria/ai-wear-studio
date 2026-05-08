# AI Wear Studio — Índice de Documentación

**Generado:** 2026-05-07  
**Escaneo:** Exhaustive Scan v1.2.0  
**Owner:** Felipe Quintero (gfquinterol@siesa.com)

---

## Visión General del Proyecto

- **Tipo:** SPA Monolito (despliegue único)
- **Lenguaje primario:** TypeScript
- **Arquitectura:** Modular SPA con capa de servicios
- **Stack:** React 19 · Vite 6 · Tailwind v4 · Zustand 5 · Konva · Gemini API

---

## Quick Reference

| Aspecto | Detalle |
|---------|---------|
| **Framework** | React 19 + Vite 6 |
| **Estado** | Zustand 5 (useStore) |
| **Canvas** | Konva 10 + react-konva 19 |
| **IA** | Google Gemini (gemini-2.5-flash-image-preview) |
| **Estilos** | Tailwind CSS v4 |
| **Persistencia** | localStorage (hasta 5 sesiones) |
| **Punto de entrada** | `src/main.tsx` → `src/App.tsx` |
| **Datos del catálogo** | `src/data/catalog.ts` |
| **Store global** | `src/store/useStore.ts` |
| **Límite IA gratuita** | 10 generaciones/día/device |
| **Prendas disponibles** | 10 tipos |
| **Técnicas de impresión** | DTG, ScreenPrint, Embroidery, DTF, HeatTransfer |
| **Países de envío** | CO, MX, US, AR, CL, PE |

---

## Documentación Generada

### Documentación Principal

- [Visión General del Proyecto](./project-overview.md) — Descripción, stack, catálogo, estado de implementación
- [Arquitectura](./architecture.md) — Patrón arquitectónico, flujos de datos, decisiones de diseño
- [Árbol de Fuentes Anotado](./source-tree-analysis.md) — Estructura de directorios con anotaciones
- [Modelos de Datos](./data-models.md) — Tipos TypeScript, esquemas de localStorage, catálogo de colores
- [Inventario de Componentes](./component-inventory.md) — Los 22 componentes React con responsabilidades
- [Contratos de API / Servicios](./api-contracts.md) — Interfaces de los 8 servicios internos + Gemini API
- [Guía de Desarrollo](./development-guide.md) — Setup, scripts, convenciones, debugging

### Documentación Existente en el Proyecto

- [README](../README.md) — Setup básico y link a Google AI Studio
- [Plan de Trabajo V1](../PLAN_DE_TRABAJO.md) — Sprints 0-6 (completados)
- [Plan de Trabajo V2](../PLAN_DE_TRABAJO_V2.md) — Sprints 7-15 (en progreso)
- [Backlog Sprint 7](../BACKLOG_SPRINT_7.md) — Detalle de IA Operacional

---

## Inicio Rápido para Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar API key
cp .env.example .env.local
# Editar .env.local con tu GEMINI_API_KEY

# 3. Iniciar dev server
npm run dev
# → http://localhost:3000

# 4. Type check
npm run lint
```

---

## Mapa de Decisiones de Diseño Clave

| Decisión | Razón |
|----------|-------|
| SPA sin SSR | MVP rápido; SEO no es prioridad aún |
| localStorage para persistencia | Sin backend propio; suficiente para prototipo |
| Gemini como única IA | Integración directa vía @google/genai SDK |
| Zustand sobre Redux | API más simple; suficiente para este scope |
| Konva sobre Canvas API nativa | Abstracción de transformaciones y eventos |
| Tailwind v4 | Zero-config, plugin de Vite, tree-shaking nativo |
| Sin librería de componentes | Control total sobre el diseño visual |

---

## Roadmap de Funcionalidades (Plan V2)

| Sprint | Tema | Prioridad | Estado |
|--------|------|-----------|--------|
| 7 | IA Operacional (BG removal ✅, Print Quality ✅, Rate Limit ✅) | P0 | 🔄 Parcial |
| 8 | Modo Equipos / B2B (Roster, Split Payment, Bulk) | P0 | ❌ Pendiente |
| 9 | Post-compra (Tracking, Carrito Abandonado, Referidos ✅) | P0 | 🔄 Parcial |
| 10 | Comunidad (Galería, Marketplace, Concursos) | P1 | ❌ Pendiente |
| 11 | Accesibilidad WCAG AA + SEO + i18n | P0 | ❌ Pendiente |
| 12 | PWA + Mobile Real | P1 | ❌ Pendiente |
| 13 | Onboarding + A/B Testing + Feedback | P1 | ❌ Pendiente |
| 14 | UX Polish (skeletons, microinteracciones) | P2 | ❌ Pendiente |
| 15 | Anti-fraude + Antifraude pagos | P0 | 🔄 Parcial (rate limit ✅, validación dir. ✅) |

---

## Próximos Pasos Recomendados

Al crear un PRD o planificar nuevas features, referenciar:
- Para features de UI/Canvas: `./architecture.md` + `./component-inventory.md`
- Para features de datos/persistencia: `./data-models.md`
- Para features de IA: `./api-contracts.md` (sección Gemini)
- Para decisiones de stack: `./architecture.md` (sección Restricciones)
- Para setup de un nuevo desarrollador: `./development-guide.md`

---

*Documentación generada por BMad Document Project Workflow — Exhaustive Scan*
