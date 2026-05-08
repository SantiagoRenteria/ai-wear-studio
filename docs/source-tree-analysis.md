# AI Wear Studio — Árbol de Fuentes Anotado

**Generado:** 2026-05-07

---

## Estructura Raíz

```
ai-wear-studio/
├── index.html                ← HTML shell de la SPA (punto de entrada Vite)
├── package.json              ← Dependencias y scripts npm
├── package-lock.json         ← Versiones bloqueadas
├── tsconfig.json             ← Configuración TypeScript (ESNext, JSX react-jsx)
├── vite.config.ts            ← Build config: plugins, aliases, chunks manuales
├── .env.example              ← Template de variables de entorno
├── .env.local                ← API key local (no commitear)
├── .gitignore
├── metadata.json             ← Metadata de la app para AI Studio
├── README.md                 ← Setup básico
├── PLAN_DE_TRABAJO.md        ← Plan V1 (Sprints 0-6, completados)
├── PLAN_DE_TRABAJO_V2.md     ← Plan V2 (Sprints 7-15, en progreso)
├── BACKLOG_SPRINT_7.md       ← Backlog detallado Sprint 7
│
├── src/                      ← TODO el código fuente de la app
├── docs/                     ← Documentación generada (este directorio)
├── _bmad-output/             ← Artefactos de planificación BMad
├── _bmad/                    ← Motor BMad (scripts, configuración)
└── .claude/                  ← Skills de Claude Code
```

---

## Directorio `src/` — Detallado

```
src/
│
├── main.tsx                  ← Punto de entrada: ReactDOM.createRoot → <App/>
├── App.tsx                   ← Orquestador principal (376 líneas)
│                               • Gestiona estado de UI: activeTool, modales, drag
│                               • Teclado global: undo/redo/delete/arrows
│                               • Lee #design=base64 para cargar diseños compartidos
│                               • Inicia autosave y captura referrers (?ref=CODE)
│                               • Render: Header + Main(LeftRail + Canvas + RightPanel)
│                                         + BottomBar + Modales
│
├── index.css                 ← Tailwind v4 @import + animaciones custom
│                               • .slide-in-bottom (modal entrance)
│                               • Google Fonts: Inter, Playfair Display,
│                                 Space Grotesk, JetBrains Mono
│                               • custom-scrollbar (4px slim)
│
├── types.ts                  ← Contratos TypeScript globales (179 líneas)
│   ├── ViewType              → 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
│   ├── GarmentType           → 9 tipos de prenda
│   ├── Gender                → 'male' | 'female' | 'unisex'
│   ├── PlacementZone (enum)  → 8 zonas de colocación
│   ├── ColorOption           → { name, hex, premium? }
│   ├── Layer                 → Capa de diseño (imagen/texto/ai)
│   ├── Garment               → Definición de prenda del catálogo
│   ├── ProductState          → prenda + color + talla + técnica
│   ├── DesignState           → capas por vista
│   ├── AppState              → Estado completo de la app (extiende todo)
│   ├── UploadDraft           → Estado temporal durante upload
│   ├── ZoneOverride          → Overrides de insets de zona
│   └── CustomZoneEntry       → Zona custom del usuario
│
├── components/               ← 22 componentes React (.tsx)
│   │
│   ├── [Layout Principal]
│   ├── LeftRail.tsx          ← Barra lateral izquierda
│   │                           • Tools: AI (ArtTool), Texto (TextTool),
│   │                             Upload, Catálogo, Capas, Plantillas
│   │                           • Expone type ToolType
│   │
│   ├── EditorDrawer.tsx      ← Panel deslizante lateral izquierdo
│   │                           • Se abre al seleccionar una tool en LeftRail
│   │                           • Renderiza el tool activo (ArtTool, TextTool, etc.)
│   │
│   ├── CanvasEngine.tsx      ← Motor de canvas principal
│   │                           • Usa react-konva Stage → Layer → [nodes]
│   │                           • Renderiza GarmentMockup + capas del usuario
│   │                           • Maneja drag/resize/rotate de capas
│   │                           • Registra exportPreviewPng en exporter.ts
│   │                           • Maneja zonas de impresión con highlight
│   │
│   ├── RightPanel.tsx        ← Panel derecho
│   │                           • Lista de capas con visibilidad/orden/delete
│   │                           • Editor de zonas de impresión
│   │                           • Selector de vistas (front/back/sleeves)
│   │                           • PrintQualityBadge integrado
│   │
│   ├── BottomBar.tsx         ← Barra inferior
│   │                           • Precio dinámico (base + premium + zonas)
│   │                           • Selector de talla y color
│   │                           • Botón "Pedir ahora" → CheckoutPage
│   │                           • Vistas miniatura de las 4 caras
│   │
│   ├── GarmentMockup.tsx     ← SVG mockup de la prenda
│   │                           • Renderiza la prenda coloreada como SVG
│   │                           • Base sobre la que se superponen las capas Konva
│   │
│   ├── ContextualToolbar.tsx ← Toolbar flotante al seleccionar capa
│   │                           • Controles: escala, rotación, opacidad, efectos
│   │                           • Mueve la capa entre zonas de impresión
│   │
│   ├── [Herramientas de edición]
│   ├── ArtTool.tsx           ← Generación de diseños con IA
│   │                           • Campo de prompt + selector de estilo (8 opciones)
│   │                           • Botón "Generar" → gemini.generateDesignImages()
│   │                           • Grid de variaciones generadas
│   │                           • Botón "Remix" → RemixModal
│   │
│   ├── TextTool.tsx          ← Herramienta de texto
│   │                           • 30 fuentes Google disponibles
│   │                           • 7 efectos: none, stroke, shadow, glow, neon,
│   │                             gradient, 3d
│   │                           • Controles: tamaño, peso, alineación, color,
│   │                             letra spacing
│   │
│   ├── ColorPicker.tsx       ← Selector de color hex con presets
│   │
│   ├── [Modales]
│   ├── CheckoutPage.tsx      ← Flujo completo de checkout
│   │                           • Resumen del pedido con mockup
│   │                           • AddressFields integrado
│   │                           • Selección de método de decoración
│   │                           • Cálculo de precio final
│   │
│   ├── TryOnModal.tsx        ← Prueba virtual con IA
│   │                           • 4 modelos: casual-m, casual-f, streetwear, editorial
│   │                           • Genera foto fotorrealista con el diseño puesto
│   │                           • gemini.tryOnDesign()
│   │
│   ├── ShareModal.tsx        ← Compartir diseño
│   │                           • Genera URL con #design=base64
│   │                           • Copia al portapapeles
│   │
│   ├── RemixModal.tsx        ← Remix de imagen generada
│   │                           • Input de instrucción de modificación
│   │                           • gemini.remixDesignImage()
│   │
│   ├── ReferralModal.tsx     ← Dashboard del programa de referidos
│   │                           • Link único del usuario
│   │                           • Contadores: visitados/diseñaron/compraron
│   │                           • Créditos acumulados
│   │                           • Botones de compartir: WhatsApp, Twitter, Email
│   │
│   ├── SummaryModal.tsx      ← Resumen del pedido antes de pagar
│   │
│   ├── [Componentes utilitarios]
│   ├── ResumeBanner.tsx      ← Banner "Tienes un diseño en progreso"
│   │                           • Aparece al cargar si hay sesión guardada
│   │                           • Opciones: Retomar / Empezar nuevo
│   │
│   ├── SaveIndicator.tsx     ← Indicador de guardado automático
│   │                           • Estados: idle / saving / saved / error
│   │                           • "Guardado hace X segundos"
│   │
│   ├── PrintQualityBadge.tsx ← Semáforo de calidad de impresión
│   │                           • 🟢 Excelente / 🟡 Aceptable / 🔴 Problemas
│   │                           • Expande lista de issues con auto-fixes
│   │
│   ├── RateLimitBadge.tsx    ← Contador de generaciones IA
│   │                           • "Te quedan N generaciones hoy"
│   │                           • Reset countdown timer
│   │
│   ├── BeforeAfterSlider.tsx ← Comparación imagen antes/después BG removal
│   │
│   └── AddressFields.tsx     ← Formulario de dirección con validación
│                               • Autocompletado de ciudad/departamento
│                               • Validación de código postal por país
│
├── store/
│   └── useStore.ts           ← Store Zustand (AppState completo)
│                               • 198 líneas
│                               • MAX_HISTORY = 30 snapshots
│                               • cloneSnapshot: structuredClone || JSON
│
├── services/                 ← 8 servicios independientes sin estado propio
│   ├── gemini.ts             ← Gemini API (261 líneas)
│   ├── persistence.ts        ← LocalStorage sessions (170 líneas)
│   ├── exporter.ts           ← PNG export con watermark (62 líneas)
│   ├── bgRemoval.ts          ← BG removal local flood-fill (290 líneas)
│   ├── printQuality.ts       ← Análisis WCAG de calidad (290 líneas)
│   ├── rateLimit.ts          ← Device fingerprint + rate limiting (228 líneas)
│   ├── referrals.ts          ← Programa de referidos (266 líneas)
│   └── addressValidation.ts  ← Validación de direcciones (234 líneas)
│
├── hooks/                    ← 3 custom hooks
│   ├── useAutosave.ts        ← Debounce 5s + flush en beforeunload (191 líneas)
│   ├── usePrintQuality.ts    ← Memo de QualityReport (16 líneas)
│   └── useRateLimit.ts       ← Snapshot reactivo + refresh 60s (37 líneas)
│
├── data/
│   └── catalog.ts            ← Catálogo de prendas + zonas de impresión (360 líneas)
│                               • GARMENT_CATALOG: 10 prendas
│                               • getPrintZones(type, view): 23 combinaciones
│                               • getAvailableViews(garment): 2 o 4 vistas
│                               • computeZoneTransition: cálculo de transición de zona
│                               • getAllZones / getCatalogPresets / generateCustomZoneId
│
└── lib/
    └── utils.ts              ← Utilidades (cn: clsx + tailwind-merge)
```

---

## Archivos de Configuración Raíz

### `vite.config.ts` — Chunks manuales importantes

```
konva    ← konva + react-konva + use-image  (~200KB)
motion   ← motion (Framer Motion v5)
icons    ← lucide-react
gemini   ← @google/genai + @google/generative-ai
```

Los chunks manuales evitan que el bundle principal sea demasiado grande.

### `tsconfig.json` — Paths alias

```json
{ "@/*": ["./*"] }
```

Permite imports como `@/components/CanvasEngine` resolviendo desde la raíz del proyecto.

---

## Puntos de Entrada Críticos

| Archivo | Rol |
|---------|-----|
| `index.html` | Shell HTML; Vite inyecta el script |
| `src/main.tsx` | `ReactDOM.createRoot` → monta `<App/>` |
| `src/App.tsx` | Orquestador: routing de estado, eventos globales, layout |
| `src/store/useStore.ts` | Fuente de verdad de todo el estado de diseño |
| `src/data/catalog.ts` | Fuente de verdad de prendas y zonas de impresión |
