# AI Wear Studio — Inventario de Componentes

**Generado:** 2026-05-07  
**Total:** 22 componentes React (.tsx)

---

## Categorías

| Categoría | Componentes |
|-----------|-------------|
| Layout principal | App, LeftRail, EditorDrawer, CanvasEngine, RightPanel, BottomBar |
| Mockup y canvas | GarmentMockup, ContextualToolbar |
| Herramientas de edición | ArtTool, TextTool, ColorPicker |
| Flujo de compra | CheckoutPage, AddressFields, SummaryModal |
| Modales de IA | TryOnModal, RemixModal |
| Compartir / Social | ShareModal, ReferralModal |
| Utilitarios / Estado | ResumeBanner, SaveIndicator, PrintQualityBadge, RateLimitBadge, BeforeAfterSlider |

---

## Componentes de Layout Principal

### `App.tsx` (376 líneas) — Orquestador raíz
- **Responsabilidad:** Composición del layout completo, manejo de teclado global, drag-and-drop de imágenes, navegación de modales, autosave, carga de diseños compartidos.
- **Estado local:** activeTool, isDraggingFile, showCheckout, showShare, showReferral, showResume, exporting
- **Hooks usados:** useAutosave, useStore (granular selectors)
- **Efectos clave:**
  - Captura `?ref=CODE` de la URL al montar
  - Lee `#design=base64` para cargar diseños compartidos
  - Listeners de teclado: undo/redo/delete/duplicate/arrows
  - Drag-and-drop de archivos de imagen

### `LeftRail.tsx` — Barra lateral de herramientas
- **Responsabilidad:** Selector de herramientas activa
- **Props:** `activeTool: ToolType | null`, `setActiveTool: (tool: ToolType | null) => void`
- **ToolType:** `'ai' | 'text' | 'upload' | 'catalog' | 'layers' | 'templates'`
- **UI:** Íconos verticales con tooltip; resalta herramienta activa

### `EditorDrawer.tsx` — Panel deslizante lateral
- **Responsabilidad:** Contenedor que renderiza el tool activo basado en `activeTool`
- **Props:** `activeTool: ToolType | null`, `onClose: () => void`
- **Comportamiento:** Slide-in desde la izquierda; se cierra al presionar Escape o al seleccionar otra herramienta

### `CanvasEngine.tsx` — Motor de canvas Konva
- **Responsabilidad:** Renderiza el canvas de diseño con todas las capas del usuario encima del mockup SVG de la prenda
- **Integración:** react-konva Stage → Layer → Imágenes/Textos/Transformers
- **Eventos:** click (seleccionar capa), drag (mover), transform (resize/rotate)
- **Export:** Registra `exportPreviewPng()` en `services/exporter.ts` al montar
- **Zonas:** Dibuja el highlight de la zona de impresión activa

### `RightPanel.tsx` — Panel derecho de gestión
- **Responsabilidad:** Lista de capas (visibilidad, orden, eliminación), editor de zonas de impresión, selector de vistas
- **Integración:** `usePrintQuality()` para mostrar el badge de calidad

### `BottomBar.tsx` — Barra de acciones y precio
- **Responsabilidad:** Precio dinámico, selector de talla/color, botón de checkout, thumbnails de vistas
- **Cálculo de precio:** basePrice + técnica + zonas premium + colores premium

---

## Componentes de Canvas y Mockup

### `GarmentMockup.tsx` — Mockup SVG de prenda
- **Responsabilidad:** Renderiza el SVG de la prenda coloreada dinámicamente
- **Props:** garment, selectedColor, currentView
- **Comportamiento:** Aplica el color seleccionado a las partes rellenas del SVG; actualiza en tiempo real

### `ContextualToolbar.tsx` — Toolbar flotante de capa
- **Responsabilidad:** Controles de la capa seleccionada: escala, rotación, efectos, mover entre zonas
- **Visibilidad:** Aparece encima de la capa cuando está seleccionada
- **Controles:** Zoom (+/-), rotación, opacidad, textEffect selector, cambio de PlacementZone

---

## Herramientas de Edición

### `ArtTool.tsx` — Generación de arte con IA
- **Responsabilidad:** Interface para generar imágenes con Google Gemini
- **Props:** contexto de la prenda/color para informar al prompt
- **UI:**
  - Campo de texto para prompt
  - Selector de estilo: watercolor, cyberpunk, retro, anime, minimal, graffiti, 3d, pixel
  - Botón "Generar 1" / "Generar 3"
  - Grid de variaciones con botones "Aplicar" y "Remix"
  - `RateLimitBadge` integrado
- **Integración:** `gemini.generateDesignImages()`, `useRateLimit().consume()`

### `TextTool.tsx` — Herramienta de texto
- **Responsabilidad:** Crear y editar capas de texto
- **Controles:**
  - Input de texto
  - Selector de 30 fuentes Google (con preview)
  - Tamaño (8-120pt)
  - Peso (normal/bold)
  - Alineación (left/center/right)
  - Color (ColorPicker integrado)
  - Letter spacing
  - 7 efectos de texto con preview
- **Output:** `useStore.addLayer(view, { type: 'text', ... })`

### `ColorPicker.tsx` — Selector de color
- **Responsabilidad:** Componente reutilizable de selección de color
- **UI:** Input hex + presets de colores comunes + selector HSL
- **Uso:** TextTool (color de texto), ContextualToolbar (strokeColor)

---

## Flujo de Compra

### `CheckoutPage.tsx` — Página de checkout
- **Responsabilidad:** Flujo completo de compra
- **Secciones:**
  1. Resumen del pedido con mockup renderizado
  2. `AddressFields` para dirección de envío
  3. Selector de método de decoración (DTG/ScreenPrint/Embroidery)
  4. Resumen de precio final
  5. Botón de pago (actualmente sin integración real de gateway)
- **Integración:** `referrals.rewardOnPurchase()` al confirmar

### `AddressFields.tsx` — Formulario de dirección
- **Responsabilidad:** Captura y valida la dirección de envío
- **Integración:** `services/addressValidation.ts`
- **Funcionalidades:**
  - Selector de país (6 países soportados)
  - Autocompletado de ciudad con `citySuggestions()`
  - Validación de código postal por regex del país
  - Mensajes de error/warning por campo

### `SummaryModal.tsx` — Resumen del pedido
- **Responsabilidad:** Vista resumen del diseño antes de confirmar
- **UI:** Mockup del diseño en todas las vistas con capas superpuestas

---

## Modales de IA

### `TryOnModal.tsx` — Prueba virtual con modelos
- **Responsabilidad:** Genera fotos fotorrealistas del diseño puesto
- **Flujo:**
  1. Usuario selecciona modelo (casual-m, casual-f, streetwear, editorial)
  2. Se captura el canvas actual como dataURL
  3. `gemini.tryOnDesign()` genera la foto
  4. Se muestra el resultado con opción de descargar
- **Integración:** `useRateLimit().consume()`

### `RemixModal.tsx` — Remix de imagen
- **Responsabilidad:** Modifica una imagen IA existente con instrucciones
- **Props:** `baseImageUrl: string` (dataURL del diseño actual)
- **Flujo:** Input de instrucción → `gemini.remixDesignImage()` → aplica resultado como nueva capa

---

## Compartir y Social

### `ShareModal.tsx` — Compartir diseño
- **Responsabilidad:** Genera un link compartible con el estado del diseño embebido
- **Mecanismo:**
  - Serializa `{ garment, selectedColor, selectedSize, layers }` a JSON
  - `btoa(JSON)` → `#design=<base64>` en la URL
  - Copia al portapapeles / botón compartir nativo (Web Share API)

### `ReferralModal.tsx` — Dashboard de referidos
- **Responsabilidad:** Dashboard completo del programa de referidos
- **Secciones:**
  - Tu código y link de referido (con botón copiar)
  - Estadísticas: visitados / diseñaron / compraron
  - Créditos acumulados (COP)
  - Historial de movimientos
  - Botones de compartir: WhatsApp, Twitter, Email

---

## Componentes Utilitarios

### `ResumeBanner.tsx` — Banner de sesión en progreso
- **Responsabilidad:** Muestra al iniciar si hay un diseño guardado para retomar
- **Props:** `onResume: (session) => void`, `onDismiss: () => void`
- **Integración:** `persistence.findResumableSession()`
- **UI:** Banner sticky con thumbnail del diseño, prenda y colores; botones "Retomar" / "Empezar nuevo"

### `SaveIndicator.tsx` — Indicador de guardado
- **Responsabilidad:** Muestra el estado del autosave en el header
- **Props:** `status: AutosaveStatus`, `lastSavedAt: number | null`
- **Estados:**
  - idle: sin texto visible
  - saving: spinner + "Guardando..."
  - saved: ✓ + "Guardado hace X"
  - error: ⚠ + "Error al guardar"

### `PrintQualityBadge.tsx` — Semáforo de calidad de impresión
- **Responsabilidad:** Indica en tiempo real la calidad del diseño para impresión
- **Integración:** `usePrintQuality()` → `services/printQuality.analyzePrintQuality()`
- **UI:**
  - 🟢 Excelente (sin issues)
  - 🟡 Aceptable (solo warnings)
  - 🔴 Problemas (hay errores)
  - Click expande lista de issues con descripción y botón "Corregir"
  - El botón "Pedir ahora" se deshabilita con issues 🔴

### `RateLimitBadge.tsx` — Contador de generaciones IA
- **Responsabilidad:** Muestra las generaciones restantes del día
- **Integración:** `useRateLimit()`
- **UI:** "N generaciones restantes hoy" + countdown hasta reset
- **Desbloqueado:** muestra "Ilimitado" si el usuario tiene historial de compras

### `BeforeAfterSlider.tsx` — Comparación antes/después
- **Responsabilidad:** Comparación visual slider de imagen original vs imagen con BG removido
- **Props:** `before: string` (dataURL original), `after: string` (dataURL limpia)
- **Uso:** En EditorDrawer al aplicar background removal

---

## Diseño del Sistema

- **Paleta:** Violet/Fuchsia como accent colors primarios (`violet-600`, `fuchsia-500`)
- **Tipografía base:** Inter (sans-serif), sistema de tipografías sans
- **Bordes:** Tailwind `slate-200` para divisores
- **Shadows:** `shadow-md shadow-violet-500/20` en elementos destacados
- **Animaciones:** Motion (Framer Motion v5) para transiciones de modales
- **Scrollbars:** custom-scrollbar de 4px (`src/index.css`)
- **Sin librería de componentes** — todo es Tailwind + Lucide React

---

## Fuentes Google Disponibles en TextTool

30 fuentes disponibles para diseños de texto:
Inter, Roboto, Open Sans, Lato, Montserrat, Raleway, Poppins, Nunito, Oswald, Merriweather, Playfair Display, Space Grotesk, JetBrains Mono, Bebas Neue, Anton, Pacifico, Lobster, Dancing Script, Great Vibes, Comfortaa, Righteous, Satisfy, Bangers, Fredoka One, Russo One, Permanent Marker, Patrick Hand, Special Elite, Orbitron, Press Start 2P
