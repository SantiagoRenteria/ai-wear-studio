# Sprint 7 — Catálogo de productos + UX avanzada

**Versión:** 1.0
**Fecha:** Mayo 2026
**Origen:** Feedback directo del usuario después del demo end-to-end del Sprint 6.
**Estado actual:** Sprints 0-6 completos. Compilación TS limpia, AI Try-On funcional, checkout y share listos.

> Este sprint se enfoca en **escalar el catálogo** (más prendas, más colores, género), **enriquecer las herramientas** (upload con remove-bg, texto con efectos) y **modernizar la visualización** (multi-vista 2D, mockups que reaccionan a talla). Las historias están priorizadas y estimadas.

---

## 🧥 EPIC A — Catálogo de productos extendido

### HU-7.1 · Soporte de prendas adicionales (sudaderas, buzos, pantalonetas, gorras)
**Como** usuario, **quiero** elegir entre varias categorías de prenda (camiseta, sudadera, buzo, pantaloneta, gorra, top, polo), **para** tener variedad para diferentes ocasiones.
- **Criterios:**
  - Selector de categoría en el panel "Producto" (chips horizontales con iconos).
  - Cada categoría tiene su propio `GarmentMockup` (SVG) con front/back/sleeves apropiados.
  - Cada categoría tiene `basePrice`, lista de colores disponibles, lista de tallas, y placement zones específicas.
  - Al cambiar de categoría se preserva el color (si existe en la nueva) o se resetea al default.
  - Las capas de vistas que no aplican (ej: pantalonetas no tienen "back collar") se preservan internamente pero la vista no se muestra.
- **Estimación:** L · **Prioridad:** P0
- **Archivos:** `useStore.ts` (catálogo de garments), `GarmentMockup.tsx` (nuevos paths SVG), `EditorDrawer.tsx` panel `'product'`.

### HU-7.2 · Género (Hombre / Mujer / Unisex) con tallas y mockups por género
**Como** usuario, **quiero** elegir el género de la prenda, **para** ver tallas correctas (S-XXL hombre vs XS-XL mujer) y un mockup que represente fielmente el corte.
- **Criterios:**
  - Toggle Hombre / Mujer / Unisex arriba del color picker en panel Producto.
  - Cambia la lista de `availableSizes` dinámicamente (ej: mujer agrega XS, hombre agrega 3XL).
  - Cambia el SVG del `GarmentMockup` (corte distinto en sudaderas y polos).
  - Persiste en el estado del diseño (al cargar/share/save también restaura el género).
- **Estimación:** M · **Prioridad:** P0
- **Dependencia:** HU-7.1 (necesita el catálogo extendido).

### HU-7.3 · Mockup que reacciona al cambio de talla
**Como** usuario, **quiero** que la prenda visualmente cambie de tamaño al cambiar de talla, **para** sentir el realismo del producto.
- **Criterios:**
  - El SVG escala proporcionalmente: XS = 88%, S = 92%, M = 96% (default), L = 100%, XL = 104%, XXL = 108%, 3XL = 112%.
  - Animación suave (Motion `scale` 350ms) al cambiar de talla.
  - El print zone se mantiene proporcional (no se distorsiona el diseño).
  - Tooltip que indica las medidas reales en cm (pecho, largo) según talla.
- **Estimación:** S · **Prioridad:** P1

---

## 🎨 EPIC B — Color picker avanzado

### HU-7.4 · Paleta de colores favoritos + explorador completo
**Como** usuario, **quiero** ver los 8 colores más usados destacados, **pero** poder explorar una paleta completa cuando necesite un tono específico.
- **Criterios:**
  - **Quick palette** arriba: 8 colores favoritos (los actuales) con check de "más usado".
  - Botón "Más colores" abre un picker expandido con:
    - Categorías: Básicos, Pasteles, Tierra, Vibrantes, Neón, Oscuros, Metálicos.
    - Picker HSL con slider de matiz/saturación/luminosidad.
    - Input hex.
    - Eyedropper API si el navegador lo soporta (`window.EyeDropper`).
  - Los últimos 6 colores usados se persisten en localStorage como "Recientes".
  - Indicador visual cuando un color es **premium** (ej: metalizado +$3 USD).
- **Estimación:** L · **Prioridad:** P0
- **Archivos:** Crear `ColorPicker.tsx` reutilizable; integrar en `EditorDrawer` panel `'product'` y `TextTool.tsx`.

### HU-7.5 · Color premium con animación al seleccionar
**Como** usuario, **quiero** entender claramente cuándo un color cuesta más, **para** tomar decisiones informadas.
- **Criterios:**
  - Badge "+$X" sobre el swatch en hover.
  - Al seleccionar un color premium, animación sutil del precio en el BottomBar (verde flash → vuelve al normal).
- **Estimación:** S · **Prioridad:** P2

---

## 📐 EPIC C — RightPanel dinámico contextual

### HU-7.6 · RightPanel cambia su contenido según el contexto
**Como** usuario, **quiero** que el panel derecho me muestre lo más útil según lo que esté haciendo (no solo la lista de capas estática), **para** que la app se sienta inteligente.
- **Criterios:**
  - **Sin capa seleccionada**: muestra Vistas + Capas + AI Try-On (estado actual).
  - **Capa de imagen seleccionada**: muestra controles de la imagen (escala, rotación, opacidad, brillo, contraste, **Remove Background**, **Smart Placement**) en la parte de arriba — colapsa la lista de capas.
  - **Capa de texto seleccionada**: muestra controles del texto (fuente, tamaño, peso, color, espaciado entre letras, efectos de texto IA).
  - **Capa de IA seleccionada**: muestra controles + botones "Remix" y "Generar variantes similares".
  - **Modo Try-On activado**: muestra preview de los modelos generados arriba con tabs.
  - Animación Motion al cambiar de contexto (slide-up + fade).
- **Estimación:** L · **Prioridad:** P0
- **Diferenciador:** ningún competidor tiene un panel inspector contextual tipo Figma/Photoshop.
- **Archivos:** Refactor importante de `RightPanel.tsx` — extraer subcomponentes `LayerInspector*`.

### HU-7.7 · Acción contextual sugerida por IA
**Como** usuario, **quiero** que cuando seleccione una capa, la IA me sugiera 1 acción inteligente, **para** descubrir features.
- **Criterios:**
  - Sticker arriba del panel: "💡 Sugerencia: tu logo se vería mejor en pecho izquierdo · Aplicar".
  - Sugerencias dinámicas: foto sin fondo limpio → "Remove background", logo grande sobre prenda oscura → "Cambiar color a blanco", diseño en zona equivocada → "Mover a CenterChest".
  - Click aplica la sugerencia en 1 paso.
- **Estimación:** L · **Prioridad:** P2
- **Diferenciador:** smart placement automático.

---

## 👁️ EPIC D — Vista 2D/3D multi-superficie

### HU-7.8 · Vista resumen 2D con todas las caras del producto
**Como** usuario, **quiero** ver de un vistazo cómo quedó mi diseño en frente, espalda y mangas a la vez, **para** revisar el resultado completo antes de comprar.
- **Criterios:**
  - Botón "Ver resumen" en el header o en el RightPanel.
  - Modal full-screen con grid 2×2 (Frente, Espalda, Manga Izq, Manga Der) — cada celda muestra el mockup con sus capas aplicadas.
  - Las celdas que no tienen contenido se muestran con menos opacidad y mensaje "Sin diseño en esta vista".
  - Botón "Descargar resumen" exporta una imagen 1920×1080 con las 4 vistas (canvas API toDataURL).
- **Estimación:** M · **Prioridad:** P1

### HU-7.9 · Preview 3D rotable (con Three.js)
**Como** usuario, **quiero** ver mi diseño en un modelo 3D que pueda rotar, **para** sentir el producto antes de comprar.
- **Criterios:**
  - Botón "Ver en 3D" en el RightPanel.
  - Modal con Three.js: modelo 3D plano (low-poly mesh de camiseta) con texturas dinámicas de las capas.
  - Drag para rotar el modelo (OrbitControls). Scroll para zoom.
  - Toggle "modo studio" / "modo modelo" (modelo virtual con la prenda puesta — lo conectamos con AI Try-On).
- **Estimación:** XL · **Prioridad:** P2
- **Notas:** ya tienes Three.js disponible en `node_modules` indirectamente. Considerar usar `react-three-fiber` para mejor DX.
- **Alternativa V1:** si 3D es muy complejo, hacer una vista "rotación pseudo-3D" con 8 ángulos pre-calculados (frame-by-frame) que se muestran al arrastrar.

---

## 🖼️ EPIC E — Upload tool avanzado

### HU-7.10 · Remove background con IA
**Como** usuario que sube un logo con fondo blanco, **quiero** quitar el fondo automáticamente, **para** que el diseño se integre con cualquier color de prenda.
- **Criterios:**
  - Botón "Quitar fondo" después de subir la imagen (en el panel Upload).
  - Loader mientras procesa.
  - Comparación antes/después tipo split-screen.
  - Confirmar reemplaza el archivo subido por la versión transparente.
- **Estimación:** M · **Prioridad:** P0
- **Implementación opciones:**
  - **A**: Usar Nano Banana con prompt "remove the background of this image, keep only the main subject on transparent background"
  - **B**: Usar `@imgly/background-removal` (cliente, ~5MB pero funciona offline)
  - Recomiendo A para coherencia con el resto de servicios IA.

### HU-7.11 · Cambiar color de un logo subido (tinta)
**Como** usuario que subió un logo en color que no le gusta, **quiero** cambiarle el color, **para** combinarlo con la prenda.
- **Criterios:**
  - Si el logo es **monocromático** (detectar automáticamente con análisis de canvas pixel data): mostrar color picker que reemplaza todos los pixeles oscuros por el color elegido.
  - Si es **multi-color**: opción "tintar con tono" (overlay con multiply blend) o "Remix con IA: cambia los colores a tonos pastel".
  - Toggle "Inverso" cambia oscuros↔claros.
- **Estimación:** M · **Prioridad:** P1

### HU-7.12 · Filtros básicos (brillo, contraste, saturación)
**Como** usuario, **quiero** ajustes simples de imagen, **para** que el logo se vea mejor.
- **Criterios:**
  - 3 sliders: brillo, contraste, saturación (-100 a +100).
  - Aplicados como CSS filter en el preview, y al confirmar se rasterizan al data URL final.
  - Botón "Reset".
- **Estimación:** S · **Prioridad:** P2

---

## ✏️ EPIC F — Text tool avanzado

### HU-7.13 · Más fuentes (Google Fonts dinámicas)
**Como** usuario, **quiero** acceso a 30+ tipografías de calidad, **para** encontrar la voz perfecta para mi diseño.
- **Criterios:**
  - 30 fuentes curadas de Google Fonts agrupadas por estilo: Sans (Inter, Poppins, Manrope...), Serif (Playfair, Lora, EB Garamond...), Display (Bebas Neue, Anton, Bowlby One...), Mono (JetBrains Mono, Fira Code...), Cursive (Pacifico, Caveat, Dancing Script...), Decorative (Bungee, Fascinate...).
  - Carga lazy: solo carga la fuente cuando el usuario hace hover sobre el chip (precarga) o la selecciona.
  - Buscador de fuentes.
- **Estimación:** M · **Prioridad:** P0

### HU-7.14 · Color picker avanzado en el texto (mismo de HU-7.4)
**Como** usuario, **quiero** la misma paleta avanzada en el texto que en el color de la prenda.
- **Criterios:**
  - Reutilizar `ColorPicker.tsx` de HU-7.4 dentro de `TextTool.tsx`.
  - Soportar gradiente como fill (linear/radial, 2 colores).
- **Estimación:** S · **Prioridad:** P0
- **Dependencia:** HU-7.4.

### HU-7.15 · Efectos de texto IA (gradiente, glow, neón, sombra, stroke, 3D)
**Como** usuario, **quiero** efectos visuales con un click, **para** que el texto luzca pro sin esfuerzo.
- **Criterios:**
  - 7 chips de efectos: Plano · Gradiente · Stroke · Sombra · Glow · Neón · 3D.
  - Cada efecto se aplica vía Konva text styling o filtros SVG en el render.
  - Preview en vivo en el panel.
- **Estimación:** L · **Prioridad:** P1
- **Diferenciador:** CustomInk solo tiene tipografías sin efectos.

### HU-7.16 · Espaciado entre letras y líneas
**Como** usuario, **quiero** controlar el tracking y leading, **para** afinar la composición.
- **Criterios:**
  - Slider "Espaciado letras" -10 a +50 (px).
  - Slider "Espaciado líneas" 0.8 a 2.0 (multiplicador).
- **Estimación:** S · **Prioridad:** P2

---

## 📊 Priorización y orden recomendado

| Sprint | HUs propuestas | Tiempo estimado |
|---|---|---|
| **Sprint 7.1 (semana 1-2)** | HU-7.1 + HU-7.2 + HU-7.3 (catálogo + género + tallas reactivas) | ~10 días |
| **Sprint 7.2 (semana 3)** | HU-7.4 + HU-7.14 + HU-7.13 (color picker avanzado + fuentes) | ~7 días |
| **Sprint 7.3 (semana 4)** | HU-7.6 (RightPanel dinámico) — refactor importante | ~5 días |
| **Sprint 7.4 (semana 5)** | HU-7.10 + HU-7.11 (upload remove-bg + tinta) | ~5 días |
| **Sprint 7.5 (semana 6)** | HU-7.8 + HU-7.15 (vista resumen 2D + efectos texto) | ~5 días |
| **Backlog (siguiente)** | HU-7.9 (3D), HU-7.5, 7.7, 7.12, 7.16 | — |

**Total estimado:** ~6 semanas de trabajo enfocado para cerrar todo este Sprint 7.

---

## 🚀 Quick wins de esta lista (1-2 días)

Si quieres demo presentable rápido, prioriza:

1. **HU-7.1** parcial: añadir 3 categorías más (Sudadera ya está, agregar Buzo, Pantaloneta, Polo) — ya tienes el patrón en `GarmentMockup.tsx`.
2. **HU-7.4** parcial: agregar un grid expandible "Más colores" con 30 colores pre-curados (sin HSL picker complejo todavía).
3. **HU-7.3**: scale del SVG según talla — 1 línea de código.

Esos 3 cambios mejoran la percepción del producto enormemente con poco esfuerzo.

---

## 🔒 Nota técnica importante

**API key actualmente expuesta en cliente** (vía `process.env.GEMINI_API_KEY` inyectado por Vite). Para producción **se debe mover a un endpoint Express**. El proyecto ya tiene `express` instalado — propongo:

- Crear `server.ts` con endpoints `/api/generate`, `/api/remix`, `/api/tryon`.
- Cambiar `services/gemini.ts` para hacer fetch al endpoint en lugar de llamar directo a Google.
- Esto se puede hacer como **Sprint 7.0** antes de empezar el resto.

Estimación: **M (3 días)**.
