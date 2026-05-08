# AI Wear Studio — Plan de Trabajo Frontend

**Versión:** 2.0
**Fecha:** Mayo 2026 (rev. tras sesión zonas dinámicas)
**Owner:** Felipe Quintero
**Stack:** React 19 · TypeScript · Vite · Tailwind v4 · Zustand · react-konva · Gemini · Motion · Lucide

---

## 1. Estado actual (post-iteración)

| Módulo | Estado | Notas |
|---|---|---|
| Layout principal (Header/LeftRail/EditorDrawer/Canvas/RightPanel/BottomBar) | ✅ | Listo |
| Store Zustand (`useStore.ts`) | ✅ | Layers, placementZone, multi-vista, customZones, customZoneEntries, editingZoneId, uploadDraft |
| Canvas Konva (capas, transformer, undo/redo) | ✅ | Texto + imagen + IA con bounds dinámicos por zona |
| Garment SVG por tipo (`GarmentMockup`) | ✅ | T-shirt, polo, hoodie, sweatshirt, tank-top, manga larga, shorts, sweatpants, gorra |
| **Print zones dinámicas por garment+view** | ✅ | `getPrintZones(type, view)` con 23 combinaciones tipadas |
| **Multi-zonas + cap del 80% del area** | ✅ | `MAX_ZONE_AREA`, validación en dev |
| **Drag de zonas en el canvas** | ✅ | Pointer-down en label → mueve la zona. Click sin drag → la selecciona |
| **Editor de zona en RightPanel** | ✅ | Sliders X/Y/Width/Height + reset + selección sincronizada |
| **Agregar/quitar zonas custom** | ✅ | Botón "+ Zona" + chip × en zonas custom |
| **Default a 1 zona** | ✅ | Solo la primary del catálogo. Las secundarias se agregan on-demand |
| Tool: Producto (color/talla/género) | ✅ | Filtrado por género, paletas distintas por garment |
| Tool: Subir Logo | ✅ | Preview, BG removal automático, IA fallback, multi-upload, auto-fit al print zone |
| Tool: Texto | ✅ | 30 fuentes Google Lazy, 7 efectos (plano/stroke/sombra/glow/neón/gradient/3D), tracking, color picker |
| Tool: IA Design | ✅ | Gemini Imagen 3 — 1 variación por click, "+1 más", style chips, prompt suggestions |
| Tool: Arte (catálogo) | ✅ | Categorías + búsqueda |
| Tool: Personalizar (Names) | ⚠️ | Placeholder "Próximamente" |
| Layer panel (reorder/delete/hide/duplicate/visibility) | ✅ | Inspector contextual con edición live |
| Undo/Redo (Cmd+Z, Cmd+Shift+Z) | ✅ | Historial de 30 estados |
| Global drag-and-drop de imágenes | ✅ | Auto-fit al print zone |
| Atajos de teclado (Cmd+D, Esc, flechas, Delete) | ✅ | |
| Vistas dinámicas según garment | ✅ | Shorts/pants/cap/tank-top solo muestran front+back |
| Vistas thumbnails alineados con canvas | ✅ | ResizeObserver + transform CSS exacto a Konva |
| Save / Share / Export PNG con watermark | ✅ | LocalStorage + link compartible (#design=base64) + exporter compone garment+stage+watermark |
| Autosave + Resume banner | ✅ | Hasta 5 sesiones, debounce 5s |
| Vista Resumen (modal multi-vista) | ✅ | Konva real, descarga compuesta |
| Checkout one-page con stepper | ✅ | Datos + dirección validada + pago + success state |
| AI Try-On modelo virtual | ✅ | 4 estilos de modelo, vía Gemini |
| Pricing dinámico | ✅ | Por # de zonas usadas + color premium + envío |
| Sistema de calidad de impresión | ✅ | Bloquea pago si la capa excede o queda fuera de zona |
| Programa de referidos | ✅ | Link único, share WhatsApp/Twitter/Email/Web Share, dashboard, crédito |
| Bundle code-split (konva/motion/icons/gemini) | ✅ | Inicial: 467KB, gzip 134KB |
| Mobile responsive | ❌ | Pendiente |
| Tests | ❌ | Pendiente |

---

## 2. Diferenciadores frente a CustomInk (estado)

- ✅ **D1 — IA generativa real**: Gemini Imagen 3 wired
- ✅ **D2 — Quick-style chips**: Acuarela/Cyberpunk/Retro/Anime/Minimal/Grafiti/3D/Pixel
- ✅ **D3 — Prompt suggestions con emojis**: 8 chips curados
- ✅ **D4 — Layer-aware AI Remix**: Botón Remix en capas IA
- ✅ **D5 — Variaciones generadas**: 1 por click + "Generar otra más"
- ✅ **D6 — AI Try-On**: 4 modelos virtuales
- ⚠️ **D7 — Mockups foto-realistas**: SVG vectorial actual; pendiente PNG/WebGL
- ❌ **D8 — Smart Placement con IA**: pendiente
- ❌ **D9 — Voto colaborativo**: pendiente
- ❌ **D10 — Voice/AR**: post-MVP

---

## 3. Sistema de Zonas de Impresión (referencia)

### Reglas

1. Cada **garment + view** tiene una zona PRIMARY definida en `catalog.ts`.
2. El catálogo puede definir zonas adicionales como presets, pero **no se renderizan por default**. Solo aparecen si el usuario las agrega vía "+ Zona".
3. **`MAX_ZONE_AREA = 0.8`**. Ninguna zona puede ocupar más del 80% del área cuadrada de la prenda. Validación en dev mode.
4. Cada zona tiene `id` (PlacementZone enum o `custom-…`), insets `top/right/bottom/left` (fracciones 0..1), `label`, `technique`, y opcional `primary`.
5. **Técnicas**: DTG, Serigrafía, Bordado, DTF, Vinilo térmico — la zona define cuál se usa.
6. **Override por usuario**: `customZones[garmentType:view:zoneId]` guarda insets absolutos. `applyZoneOverride(zone, override)` clampea a [0, 0.95] preservando un mínimo del 5% de área en cada eje.
7. **Custom zones** (creadas por el usuario): viven en `customZoneEntries[garmentType:view][]`. Cada una tiene id `custom-{base36-timestamp}-{4 random}`, label "Zona N", technique DTG, posición central 30%.
8. **`editingZoneId`** en el store sincroniza qué zona se está editando entre RightPanel y CanvasEngine.

### Interacciones

| Acción | Resultado |
|---|---|
| Click en label de zona en canvas | Selecciona como editing |
| Drag desde label (>5px) | Mueve la zona (preservando ancho/alto) |
| Click en chip de zona en RightPanel | Selecciona como editing |
| Click "+ Zona" en RightPanel | Crea zona custom centrada al 30% |
| Click × en chip de zona custom | Elimina la zona (si era activa, fallback a la primera disponible) |
| Sliders X/Y/Width/Height en RightPanel | Reescriben los insets en `customZones` |
| Click "Restablecer" | Borra el override; vuelve a la posición catálogo |
| Cambiar zona desde Layer Inspector (multi-zone) | Mueve la capa con auto-fit (shrinkRatio) |

---

## 4. Roadmap restante

### 🚀 Siguientes pasos (priorizado)

#### P0 — Bloqueante para MVP

##### HU-NX-1 · Persistir customZones y customZoneEntries en autosave
- Hoy las zonas custom + overrides viven solo en memoria. Si el usuario recarga, las pierde.
- **Acción:** incluir ambos en `saveSession` y `hydrate`. Versionar el shape para tolerar payloads viejos.
- **Estimación:** S

##### HU-NX-2 · Mobile responsive
- Editor full no funciona < 768px. Necesitamos vista mobile reducida: solo IA + catálogo + checkout.
- **Acción:** breakpoints en LeftRail (icon-only colapsado), drawer fullscreen mobile, RightPanel debajo del canvas en mobile.
- **Estimación:** L

##### HU-NX-3 · Smart Placement con IA (D8)
- Cuando el usuario sube/genera diseño, la IA sugiere la mejor zona (LeftChest si es logo pequeño, FullFront si es ilustración).
- **Acción:** prompt a Gemini con la imagen → JSON con zone + razón. Toast con "Usar sugerencia".
- **Estimación:** M

#### P1 — Mejoras importantes

##### HU-NX-4 · Presets del catálogo en "+ Zona"
- Hoy "+ Zona" siempre crea una zona genérica al centro. Mejor: dropdown con los presets del catálogo (e.g. "Pecho izquierdo", "Cuello/etiqueta") + opción "Personalizada".
- **Acción:** usar `getCatalogPresets(type, view)` y filtrar las que ya están activas.
- **Estimación:** S

##### HU-NX-5 · Resize de zona desde el canvas (handles en esquinas)
- Hoy solo se puede mover. Para resize hay que ir a sliders. Agregar 4 handles en esquinas.
- **Acción:** detectar pointerdown sobre handle → ajustar inset correspondiente con clamp.
- **Estimación:** M

##### HU-NX-6 · Voto colaborativo entre variaciones (D9)
- Plan original sigue válido. Genera link de votación; amigos votan +/-; owner ve resultados.
- **Estimación:** L

##### HU-NX-7 · Tool Personalizar (Names) completo
- Hoy es placeholder. Implementar templates con nombres + números de equipo + dorsales.
- **Estimación:** M

##### HU-NX-8 · Tests de integración
- Vitest + React Testing Library para flujos críticos: agregar capa, mover zona, checkout, persist.
- **Estimación:** M

#### P2 — Nice-to-have

##### HU-NX-9 · Mockups foto-realistas (D7)
- Reemplazar SVG por garments PNG/WebGL con sombras realistas. Posible: ThreeJS scene con plano texturizado.
- **Estimación:** L

##### HU-NX-10 · Voice prompt + AR preview mobile (D10)
- Web Speech API + MediaPipe.
- **Estimación:** L

##### HU-NX-11 · i18n (es-CO / en)
- Strings hardcoded a español. Migrar a `i18next` o similar.
- **Estimación:** M

##### HU-NX-12 · Dark mode
- Toggle en header. Tailwind ya soporta dark variants.
- **Estimación:** S

##### HU-NX-13 · Analytics de eventos clave
- Tracking de generación IA, save, share, checkout, drag de zona, etc.
- **Estimación:** S

##### HU-NX-14 · Reducir bundle inicial < 250KB gzip
- Hoy 134KB gzip. Posible: lazy-load Konva si la app tiene flujo previo sin canvas (landing).
- **Estimación:** M

---

## 5. Backlog técnico

| ID | Item | Prioridad |
|---|---|---|
| TX-1 | Mobile responsive | P0 |
| TX-2 | Tests Vitest + RTL | P1 |
| TX-3 | i18n | P2 |
| TX-4 | Dark mode | P2 |
| TX-5 | Analytics events | P2 |
| TX-6 | Compresión de imágenes subidas (<2MB) | P1 |
| TX-7 | Persistencia de customZones | P0 |
| TX-8 | Optimización Konva 50+ capas | P2 |
| TX-9 | Error boundaries con fallback UI | P1 |
| TX-10 | A11y audit (aria-labels, focus traps) | P1 |

---

## 6. Métricas de éxito (post-MVP)

- **Activación:** % de visitantes que generan al menos 1 diseño con IA
- **Conversión:** % de generaciones que llegan a checkout
- **Retención de sesión:** tiempo promedio en el studio
- **Variations rate:** generaciones IA por usuario antes de "Aplicar"
- **Share rate:** % de diseños guardados que se comparten con un link
- **Try-On rate:** % de usuarios que usan AI Try-On
- **Custom zone usage:** % de pedidos que usan más de 1 zona

---

## 7. Cambios desde la v1.0

Lista resumen de lo agregado en esta iteración:

- **Sistema completo de zonas dinámicas** (catálogo + custom + overrides)
- **Drag de zonas en canvas + click-to-select** (5px threshold)
- **Editor de zona en RightPanel** con sliders y selector de zona
- **Reset de zona** y restablecer posición original
- **Auto-fit en cambio de zona** (shrink ratio)
- **Vistas dinámicas según garment** (shorts/pants/cap/tank-top → 2 vistas)
- **Empty state fuera del print zone** con icons clickeables
- **Active zone con highlight sólido** (no más opaco)
- **Print zone outline transitions optimizadas** (border/shadow/opacity, no all)
- **+ Zona / × Quitar zona** UI
- **Default a 1 zona primaria**, las demás on-demand
- **Cap de scale a tamaño del print zone** (Transformer + sliders)
- **Live edit drawer → canvas** para upload existente
- **Thumbnails alineados con canvas** (ResizeObserver + CSS transform)
- **Atajos de teclado completos** (Cmd+D, Esc, flechas con Shift)
- **Export PNG con watermark** y composición correcta del garment
- **manualChunks** en vite.config para code splitting

---

**Próximo paso recomendado:** HU-NX-1 (persistir zonas en autosave) + HU-NX-2 (mobile responsive). Después arrancar HU-NX-3 (Smart Placement) que cierra el último diferenciador del plan original.
