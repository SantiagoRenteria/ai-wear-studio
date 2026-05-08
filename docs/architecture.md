# AI Wear Studio — Arquitectura del Sistema

**Generado:** 2026-05-07  
**Tipo:** SPA Monolito · React 19 + Vite 6 · TypeScript

---

## Resumen Ejecutivo

AI Wear Studio es una **Single-Page Application (SPA)** de una sola entidad de despliegue. La arquitectura está organizada en capas lógicas claras dentro de `src/`: componentes UI, store reactivo, capa de servicios, y datos/tipos. No hay servidor propio de producción; el estado persiste en `localStorage` del navegador.

---

## Patrón Arquitectónico

```
┌──────────────────────────────────────────────────────┐
│                   App.tsx (Orquestador)               │
│  Header · LeftRail · EditorDrawer · CanvasEngine      │
│  RightPanel · BottomBar · Modales                     │
├──────────────────────────────────────────────────────┤
│                   Zustand Store                       │
│  useStore: AppState — capas, prenda, historial,       │
│  zonas custom, canvas size, upload draft             │
├──────────────────────────────────────────────────────┤
│              Capa de Servicios                        │
│  gemini · persistence · exporter · bgRemoval         │
│  printQuality · rateLimit · referrals · addressVal.  │
├──────────────────────────────────────────────────────┤
│              Datos y Tipos                            │
│  catalog.ts (prendas + zonas) · types.ts (contratos) │
├──────────────────────────────────────────────────────┤
│         Infraestructura del Navegador                 │
│  localStorage · Canvas 2D API · Gemini API (HTTPS)   │
└──────────────────────────────────────────────────────┘
```

---

## Estructura de Directorios

```
src/
├── main.tsx                 ← Punto de entrada React
├── App.tsx                  ← Orquestador principal (376 líneas)
├── index.css                ← Tailwind + animaciones custom
├── types.ts                 ← Contratos TypeScript (179 líneas)
├── components/              ← 22 componentes React
│   ├── LeftRail.tsx         ← Barra lateral izquierda (herramientas)
│   ├── EditorDrawer.tsx     ← Panel deslizante de edición
│   ├── CanvasEngine.tsx     ← Motor de canvas Konva
│   ├── RightPanel.tsx       ← Panel derecho (capas, zonas)
│   ├── BottomBar.tsx        ← Barra inferior (precio, checkout)
│   ├── GarmentMockup.tsx    ← SVG mockup de prenda
│   ├── CheckoutPage.tsx     ← Flujo de pago
│   ├── ArtTool.tsx          ← Tool de generación IA
│   ├── TextTool.tsx         ← Tool de texto
│   ├── ColorPicker.tsx      ← Selector de color
│   ├── ContextualToolbar.tsx← Toolbar flotante en selección de capa
│   ├── TryOnModal.tsx       ← Virtual try-on con Gemini
│   ├── ShareModal.tsx       ← Compartir diseño vía URL
│   ├── RemixModal.tsx       ← Remix de diseño IA
│   ├── ReferralModal.tsx    ← Programa de referidos
│   ├── SummaryModal.tsx     ← Resumen del pedido
│   ├── ResumeBanner.tsx     ← Banner "Retomar diseño"
│   ├── SaveIndicator.tsx    ← Indicador "Guardado hace X"
│   ├── BeforeAfterSlider.tsx← Slider comparación BG removal
│   ├── AddressFields.tsx    ← Campos de dirección con validación
│   ├── PrintQualityBadge.tsx← Semáforo de calidad de impresión
│   └── RateLimitBadge.tsx   ← Contador de generaciones IA
├── store/
│   └── useStore.ts          ← Zustand store (AppState)
├── services/                ← 8 servicios independientes
│   ├── gemini.ts            ← Integración Google Gemini API
│   ├── persistence.ts       ← LocalStorage (hasta 5 sesiones)
│   ├── exporter.ts          ← Export PNG 1080x1080 con watermark
│   ├── bgRemoval.ts         ← BG removal local (flood-fill)
│   ├── printQuality.ts      ← Análisis WCAG de calidad de impresión
│   ├── rateLimit.ts         ← Rate limiting por device fingerprint
│   ├── referrals.ts         ← Programa de referidos
│   └── addressValidation.ts ← Validación de direcciones (6 países)
├── hooks/                   ← 3 custom hooks
│   ├── useAutosave.ts       ← Autosave con debounce 5s
│   ├── usePrintQuality.ts   ← Quality report memoizado
│   └── useRateLimit.ts      ← Snapshot de rate limit reactivo
├── data/
│   └── catalog.ts           ← 10 prendas + zonas de impresión
└── lib/
    └── utils.ts             ← Utilidades generales
```

---

## Módulo de Estado (Zustand)

### AppState — Interfaz completa

```typescript
interface AppState {
  // Identidad (guest por defecto)
  user: { id, email, isGuest } | null

  // Configuración del producto
  garment: Garment          // prenda activa
  selectedColor: ColorOption
  selectedSize: string
  decorationMethod: 'DTG' | 'ScreenPrint' | 'Embroidery'

  // Canvas
  currentView: ViewType     // 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
  activeLayerId: string | null
  layers: Record<ViewType, Layer[]>

  // Historial undo/redo (hasta 30 snapshots)
  history: LayersSnapshot[]
  redoStack: LayersSnapshot[]

  // Zonas de impresión
  customZones: Record<string, ZoneOverride>    // overrides de insets
  customZoneEntries: Record<string, CustomZoneEntry[]>  // zonas adicionales
  editingZoneId: string | null

  // UI helpers
  canvasStageSize: { width, height }
  uploadDraft: UploadDraft | null
}
```

### Operaciones del Store

| Operación | Descripción |
|-----------|-------------|
| `setGarment(garment)` | Cambia prenda; ajusta color/talla/vista automáticamente |
| `addLayer(view, layer)` | Agrega capa; empuja historial |
| `updateLayer(view, id, patch)` | Actualiza propiedades; empuja historial |
| `removeLayer(view, id)` | Elimina capa; empuja historial |
| `toggleLayerVisibility` | Muestra/oculta capa; empuja historial |
| `reorderLayer(view, id, dir)` | Sube/baja capa en z-order |
| `duplicateLayer(view, id)` | Clona capa con offset +20px |
| `undo() / redo()` | Navega el historial de 30 snapshots |
| `hydrate(payload)` | Restaura estado completo (limpia historial) |
| `setCustomZone / resetCustomZone` | Overrides de insets de zona |
| `addCustomZone / removeCustomZone` | Zonas adicionales del usuario |

---

## Modelo de Capas (Layer)

```typescript
interface Layer {
  id: string                    // UUID
  type: 'image' | 'text' | 'ai' // origen
  content: string               // dataURL o texto
  x, y: number                  // posición en canvas
  scaleX, scaleY: number        // escala
  rotation: number              // grados
  zIndex: number                // orden Z
  placementZone: PlacementZone  // zona de impresión asignada
  hidden?: boolean

  // Solo para texto
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  textEffect?: 'none' | 'stroke' | 'shadow' | 'glow' | 'neon' | 'gradient' | '3d'
  strokeColor?: string
  letterSpacing?: number

  // Ajustes de imagen
  brightness?: number
  contrast?: number
  saturation?: number
}
```

---

## Sistema de Zonas de Impresión

Las zonas se definen en `catalog.ts::getPrintZones(type, view)` y devuelven un array de `PrintZone` con:
- **Insets** (top/right/bottom/left en fracción 0..1 del contenedor)
- **Técnica recomendada** (DTG, ScreenPrint, Embroidery, DTF, HeatTransfer)
- **Primary flag** (zona por defecto al crear capas)

### Zonas por tipo de prenda (23 combinaciones catalogadas)

| Prenda | Vista | Zona primaria | Técnica |
|--------|-------|---------------|---------|
| t-shirt, long-sleeve, sweatshirt | front | CenterChest | DTG |
| t-shirt, long-sleeve, sweatshirt | back | FullBack | DTG |
| t-shirt, long-sleeve, sweatshirt | sleeve | LeftSleeve | HeatTransfer |
| polo | front | LeftChest | Embroidery |
| polo | back | FullBack | Embroidery |
| tank-top | front/back | CenterChest / FullBack | DTG |
| hoodie | front | CenterChest (sobre bolsillo) | DTF |
| hoodie | back | FullBack | DTF |
| shorts, sweatpants | front/back | LeftChest / UpperBack | Embroidery |
| cap | front/back | Front / UpperBack | Embroidery |

---

## Servicios

### `gemini.ts` — Integración Gemini API

**Funciones exportadas:**
- `generateDesignImages(prompt, style, count, onProgress)` — genera hasta N variaciones de imagen
- `remixDesignImage(baseImageUrl, instruction)` — modifica imagen existente
- `tryOnDesign(designImageUrl, garmentType, colorName, modelStyle, count)` — genera foto try-on
- `removeBackground(imageUrl)` — elimina fondo vía IA
- `styleTransferImage(imageUrl, instruction)` — transforma estilo de imagen

**Modelos (con fallback):**
1. `gemini-2.5-flash-image-preview`
2. `gemini-2.0-flash-preview-image-generation`
3. `gemini-2.0-flash-exp-image-generation`
4. `gemini-2.5-flash-image`

**Estilos disponibles:** watercolor, cyberpunk, retro, anime, minimal, graffiti, 3d, pixel

**Modelos de Try-On:** casual-m, casual-f, streetwear, editorial

### `persistence.ts` — Sesiones LocalStorage

- Hasta **5 sesiones concurrentes** (MAX_SESSIONS)
- Storage key: `aiwear:sessions`, `aiwear:currentSessionId`
- Schema versión: 1
- Debounce autosave: 5s (configurado en `useAutosave.ts`)
- Funciones: `saveSession`, `listSessions`, `getSession`, `deleteSession`, `findResumableSession`

### `bgRemoval.ts` — Eliminación de Fondo Local

Dos estrategias:
1. **Local (flood-fill BFS)**: Gratis, instantáneo, funciona en ~70% de casos (logo sobre fondo uniforme). Configurable con `tolerance` (default 38) y `featherPasses` (default 1).
2. **IA (Gemini)**: Via `services/gemini.ts::removeBackground()` para casos complejos.

### `printQuality.ts` — Análisis de Calidad de Impresión

Reglas implementadas:
| Regla | Severidad | Condición |
|-------|-----------|-----------|
| `very_low_text_contrast` | Error | Contraste WCAG < 1.6 |
| `low_text_contrast` | Warning | Contraste WCAG < 3.0 |
| `tiny_text` | Error | fontSize efectivo < 8pt |
| `small_text` | Warning | fontSize efectivo < 12pt |
| `upscaled_image` (severe) | Error | scale > 3.0x |
| `upscaled_image` | Warning | scale > 2.5x |
| `thin_text_stroke` | Warning | stroke + fontSize < 14pt |

### `rateLimit.ts` — Rate Limiting por Device

- **Límite:** 10 generaciones IA gratis/día/device
- **Fingerprint:** UA + idioma + pantalla + timezone + canvas hash
- **Reset:** automático a las 24h
- **Bypass:** historial de compras confirmadas

### `referrals.ts` — Programa de Referidos

- Código único por device (hash del fingerprint)
- Recompensa: $20.000 COP al referidor + bono de bienvenida al referido
- Tracking: visited → designed → purchased
- Integración con WhatsApp, Twitter y email

### `addressValidation.ts` — Validación de Direcciones

- **Países soportados:** Colombia, México, US, Argentina, Chile, Perú
- Validación de código postal por regex
- Catálogo de departamentos/ciudades para autocompletado
- Sin dependencias externas (no Google Places)

---

## Flujos de Datos

### Flujo de creación de diseño

```
Usuario → ArtTool (prompt + estilo)
  → services/gemini.generateDesignImages()
  → retorna dataURL base64
  → useStore.addLayer(view, { type: 'ai', content: dataURL, ... })
  → CanvasEngine re-renderiza las capas Konva
  → useAutosave programa guardado en localStorage (debounce 5s)
```

### Flujo de autosave

```
Cambio en store (layers/garment/color/size/view)
  → useAutosave detecta cambio (subscribe)
  → setTimeout 5s (debounce)
  → persistence.saveSession(...)
  → localStorage.setItem('aiwear:sessions', JSON)
  → SaveIndicator muestra "Guardado hace X"
```

### Flujo de compartir

```
Usuario → ShareModal → "Generar link"
  → Serializa AppState (garment + layers) a JSON
  → btoa(JSON) → URL #design=<base64>
  → Al abrir el link: App.tsx lee el hash
  → useStore.hydrate(payload)
```

### Flujo de export PNG

```
CanvasEngine.useEffect → registerExporter(fn)
  → fn(): dibuja mockup SVG + capas Konva en Canvas 2D 1080x1080
  → drawWatermark() en esquina inferior derecha
  → canvas.toDataURL('image/png')
  → <a download> trigger
```

---

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| Ctrl/Cmd+Z | Deshacer |
| Ctrl/Cmd+Shift+Z | Rehacer |
| Ctrl/Cmd+D | Duplicar capa activa |
| Delete / Backspace | Eliminar capa activa |
| Escape | Deseleccionar capa |
| Arrow keys | Mover capa 1px |
| Shift + Arrow keys | Mover capa 10px |

---

## Restricciones y Decisiones de Diseño

1. **Sin backend propio**: Todo el estado vive en localStorage. Esto limita la colaboración entre dispositivos pero elimina la complejidad de infraestructura.
2. **IA generativa en cliente**: La API key de Gemini se expone en el frontend (proceso.env en Vite). Aceptable para MVP/prototipo; debe moverse a proxy en producción.
3. **Historial limitado a 30 snapshots**: Balance entre memoria y usabilidad.
4. **Zonas de impresión hardcodeadas**: Las 23 combinaciones están en catalog.ts; el usuario puede añadir zonas custom pero no puede redefinir las del catálogo base.
5. **Rate limiting local**: El fingerprinting por canvas+UA es suficiente para desincentivar abuso casual, pero no es inviolable.
