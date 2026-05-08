# AI Wear Studio — Guía de Desarrollo

**Generado:** 2026-05-07

---

## Prerrequisitos

| Herramienta | Versión mínima | Notas |
|------------|----------------|-------|
| Node.js | 18+ | Recomendado: 20 LTS |
| npm | 9+ | Incluido con Node |
| API Key de Gemini | — | Obtener en Google AI Studio |

---

## Setup Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```env
GEMINI_API_KEY="tu-api-key-aqui"
APP_URL="http://localhost:3000"
```

> **Importante:** `.env.local` ya está en `.gitignore`. Nunca commitear la API key.

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
# Disponible en: http://localhost:3000
```

El servidor incluye **HMR** (Hot Module Replacement). Para desactivarlo:
```env
DISABLE_HMR=true
```

---

## Scripts Disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Desarrollo | `npm run dev` | Vite dev server en puerto 3000 |
| Build | `npm run build` | Genera bundle optimizado en `dist/` |
| Preview | `npm run preview` | Sirve el build de producción |
| Type check | `npm run lint` | Ejecuta `tsc --noEmit` |
| Limpiar dist | `npm run clean` | Elimina `dist/` |

---

## Estructura del Build

Vite genera chunks separados para dependencias pesadas:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js          ← Bundle principal
│   ├── konva-[hash].js          ← Konva + react-konva + use-image (~200KB)
│   ├── motion-[hash].js         ← Motion (animaciones)
│   ├── icons-[hash].js          ← Lucide React
│   ├── gemini-[hash].js         ← Google GenAI SDKs
│   └── index-[hash].css         ← Estilos Tailwind
```

**chunkSizeWarningLimit:** 800KB (configurado en vite.config.ts)

---

## Configuración TypeScript

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "jsx": "react-jsx",
  "moduleResolution": "bundler",
  "paths": {
    "@/*": ["./*"]
  }
}
```

**Alias de paths:** `@/` resuelve desde la raíz del proyecto. Ejemplo:
```typescript
import { useStore } from '@/store/useStore';
import { GARMENT_CATALOG } from '@/data/catalog';
```

---

## Variables de Entorno en el Frontend

Vite expone las variables de entorno en tiempo de build a través del objeto `process.env`:

```typescript
// vite.config.ts
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
}
```

Acceso en código:
```typescript
const API_KEY = process.env.GEMINI_API_KEY;
```

> **Advertencia de seguridad:** La API key se embebe en el JavaScript del cliente. Para producción, implementar un proxy backend que firme las llamadas.

---

## Flujo de Desarrollo Típico

### Agregar un nuevo componente
1. Crear `src/components/MiComponente.tsx`
2. Exportar como named export
3. Importar en el componente padre con `@/components/MiComponente`

### Modificar el store global
1. Editar `src/types.ts` para agregar el nuevo tipo/interfaz si es necesario
2. Agregar el campo y acción en `src/store/useStore.ts`
3. Usar en componentes con `useStore((s) => s.miCampo)`

### Agregar una nueva prenda
1. Editar `src/data/catalog.ts`
2. Agregar entrada en `GARMENT_CATALOG`
3. Definir zonas de impresión en `getPrintZones()` para todas las vistas aplica
4. Verificar que `getAvailableViews()` la maneja correctamente

### Agregar una zona de impresión
1. Agregar el valor al enum `PlacementZone` en `src/types.ts`
2. Agregar el case en `getPrintZones()` en `src/data/catalog.ts`
3. Asegurar que `zoneArea(zona) <= MAX_ZONE_AREA (0.8)`

### Agregar un nuevo servicio de IA
1. Crear función en `src/services/gemini.ts`
2. Usar `callWithRetry()` para el manejo de errores y rate limits
3. Usar `tryConsume()` del rateLimit antes de llamar a la API

---

## Guía de Estilos

### Tailwind CSS v4

El proyecto usa **Tailwind v4** con el plugin de Vite:

```typescript
// vite.config.ts
plugins: [react(), tailwindcss()]
```

No hay `tailwind.config.js` — la configuración se hace en CSS si es necesario.

### Convenciones de clases

```tsx
// Componente base
<div className="flex items-center gap-2 p-4 bg-white rounded-xl border border-slate-200">

// Botón primario
<button className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all font-semibold text-sm">

// Botón secundario / icono
<button className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all">

// Texto heading
<span className="text-sm font-black uppercase tracking-[0.25em] text-slate-800">

// Gradiente de marca
<span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
```

### Animaciones con Motion

```tsx
import { motion, AnimatePresence } from 'motion/react';

// Modal entrance
<AnimatePresence>
  {visible && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      ...
    </motion.div>
  )}
</AnimatePresence>
```

---

## Patrones de Zustand

### Selección granular (evitar re-renders innecesarios)

```typescript
// ✅ Correcto: selector granular
const layers = useStore((s) => s.layers[currentView]);
const undo = useStore((s) => s.undo);

// ❌ Evitar: seleccionar todo el store
const store = useStore();
```

### Acceder al store fuera de React

```typescript
// En event handlers o servicios
const state = useStore.getState();
const { layers, garment } = state;
```

### Suscripción sin render

```typescript
// En hooks/efectos que no necesitan re-render
const unsubscribe = useStore.subscribe((state) => {
  // reaccionar a cambios
});
```

---

## Manejo de Errores en la IA

Los errores de Gemini se mapean a mensajes amigables en `services/gemini.ts::mapError()`:

| Error original | Mensaje al usuario |
|---------------|-------------------|
| API key inválida | "La API key de Gemini no es válida." |
| Rate limit / quota | "Cuota del free tier agotada. Gemini Image Preview tiene ~10 generaciones/día gratis..." |
| Safety filter | "El prompt fue bloqueado por filtros de seguridad. Intenta otro." |
| Modelo no disponible | "Ningún modelo de Gemini está disponible..." |

---

## Debugging

### Canvas/Konva
- El store tiene `canvasStageSize` que refleja las dimensiones reales del Stage Konva.
- Para inspeccionar las capas: `useStore.getState().layers`
- Zonas de impresión: `getPrintZones(garmentType, view)` en `catalog.ts`

### LocalStorage
```javascript
// Ver sesiones guardadas
JSON.parse(localStorage.getItem('aiwear:sessions'))

// Ver estado del rate limit
JSON.parse(localStorage.getItem('aiwear:rateLimit'))

// Limpiar todo el storage de la app
Object.keys(localStorage)
  .filter(k => k.startsWith('aiwear:'))
  .forEach(k => localStorage.removeItem(k))
```

### Validación de zonas (DEV only)
En modo DEV, `catalog.ts` imprime en consola si alguna zona excede `MAX_ZONE_AREA = 0.8`:
```
[catalog] Zone excede MAX_ZONE_AREA: hoodie front CenterChest area=0.850
```

---

## Consideraciones de Producción

1. **API Key:** Mover `GEMINI_API_KEY` a un proxy backend; nunca en el bundle del cliente.
2. **Rate Limiting:** El fingerprinting local es insuficiente para producción real; implementar rate limiting en servidor.
3. **Persistencia:** Migrar de localStorage a una base de datos real con autenticación.
4. **SSR/SEO:** La app es SPA pura; migrar páginas de landing y galería a SSR (Next.js o Vike) para indexabilidad.
5. **Tests:** No hay tests automatizados; implementar al menos tests de integración para los servicios críticos (gemini, persistence, printQuality).
6. **Monitoreo:** Integrar PostHog o similar para telemetría de uso.

---

## Despliegue en Google AI Studio

La app está configurada para desplegarse en Google AI Studio:

```
View your app: https://ai.studio/apps/3c05473f-aca8-4fb8-ba44-5354e9a98ae6
```

El build se puede desplegar en cualquier hosting estático (Vercel, Netlify, Cloudflare Pages) con soporte para SPA routing (redirect 404 → index.html).
