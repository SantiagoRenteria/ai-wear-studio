# AI Wear Studio — Plan de Trabajo V2 (Extensión)

**Versión:** 2.0
**Fecha:** Mayo 2026
**Owner:** Felipe Quintero
**Stack:** React 19 · TypeScript · Vite · Tailwind v4 · Zustand · react-konva · Gemini · Motion · Lucide
**Predecesor:** `PLAN_DE_TRABAJO.md` (Sprints 0-6 ya cubiertos)

---

## 0. Contexto

El Plan V1 cubre el camino crítico: visual foundation, IA generativa, gestión de capas, catálogo, pricing, checkout y features wow (Try-On, Smart Placement). Este V2 expande hacia áreas no cubiertas que mueven la aguja en **conversión, retención, ticket promedio y diferenciación de largo plazo**.

**Sprints incluidos:**

| Sprint | Tema | Duración | Pilar |
|---|---|---|---|
| 7 | IA Operacional (no generativa) | 2 sem | Calidad / Diferenciación |
| 8 | Modo Equipos / B2B | 2 sem | Ticket promedio |
| 9 | Post-compra y fidelización | 1.5 sem | Retención |
| 10 | Comunidad y contenido | 2 sem | Growth orgánico |
| 11 | Accesibilidad y calidad web | 1.5 sem | Calidad / Compliance |
| 12 | PWA y mobile real | 1 sem | Alcance |
| 13 | Onboarding y growth interno | 1 sem | Activación |
| 14 | UX polish profundo | 1 sem | Percepción |
| 15 | Anti-fraude y operaciones | 1 sem | Operación |

> **Estimaciones:** S = 1-2 días · M = 3-5 días · L = 1-2 semanas
> **Prioridad:** P0 = bloqueante · P1 = importante · P2 = nice-to-have

---

### 🤖 Sprint 7 — IA Operacional (2 semanas)

> **Objetivo:** Que la IA no solo cree contenido, sino que **opere sobre el contenido existente del usuario**. Es donde más diferenciación queda contra CustomInk y donde más se siente el "wow" en cada interacción.

#### HU-7.1 · Background removal automático en uploads ⭐
**Como** usuario que sube un logo con fondo, **quiero** que la IA elimine el fondo automáticamente, **para** que mi logo se imprima limpio sobre la prenda.
- **Criterios de aceptación:**
  - Al subir una imagen en el tool Upload, se ejecuta automáticamente background removal en cliente (`@imgly/background-removal`) o servidor (rembg).
  - Loader inline "Limpiando fondo…" sobre la preview.
  - Toggle "Conservar fondo original" por si el usuario quería el fondo.
  - Diff visual antes/después con slider.
- **Estimación:** M · **Prioridad:** P0
- **Implementación:** `services/imageProcessing.ts`, opción WebGPU si está disponible para no enviar al servidor.

#### HU-7.2 · Image upscaler para baja resolución
**Como** usuario, **quiero** que la app detecte cuando mi imagen es de baja resolución y ofrezca mejorarla, **para** evitar imprimir un diseño borroso.
- **Criterios:**
  - Al subir, se calcula DPI estimado al tamaño de impresión real.
  - Si DPI < 200, banner ámbar "Tu imagen se verá borrosa al imprimir. ¿Quieres que la mejoremos con IA? (gratis)".
  - Click → upscaler (Real-ESRGAN o Imagen) genera versión 2× o 4×.
  - Comparación lado a lado, usuario aprueba.
- **Estimación:** M · **Prioridad:** P1

#### HU-7.3 · Vector tracing (raster → SVG)
**Como** usuario que sube un PNG/JPG, **quiero** convertirlo a vector, **para** que escale sin pixelar y se imprima en serigrafía con calidad pro.
- **Criterios:**
  - Botón "Convertir a vector" en capas tipo `image`.
  - Usa `imagetracerjs` en cliente o `vtracer` en servidor.
  - Permite ajustar nivel de simplificación (slider 1-10).
  - Resultado se inserta como nueva capa SVG, conserva transformaciones.
- **Estimación:** L · **Prioridad:** P1
- **Diferenciador:** CustomInk no lo expone al usuario final.

#### HU-7.4 · Print Quality Score con semáforo ⭐⭐
**Como** usuario, **quiero** ver una calificación clara de qué tan bien se imprimirá mi diseño, **para** corregir problemas antes de pagar.
- **Criterios:**
  - Indicador permanente en el header del canvas: 🟢 Excelente / 🟡 Aceptable / 🔴 Problemas.
  - Click expande lista de issues por capa: contraste con la prenda, líneas <1pt, texto <8pt, fuera de safe zone, resolución insuficiente.
  - Cada issue tiene botón "Corregir" que aplica fix sugerido (ej. cambia color, recoloca).
  - El botón "Pagar" se deshabilita si hay issues 🔴 (con override "Entiendo el riesgo").
- **Estimación:** L · **Prioridad:** P0
- **Diferenciador:** Reduce devoluciones drásticamente y posiciona la marca como "diseño profesional".

#### HU-7.5 · Color palette extractor desde foto
**Como** usuario, **quiero** subir una foto (mi outfit, una marca, una ciudad) y que la app me proponga combinaciones de prenda + diseño que combinen, **para** acertar con la estética.
- **Criterios:**
  - En el tool Producto, botón "Inspirar desde una foto".
  - Sube imagen → extrae 5 colores dominantes (`color-thief` o k-means).
  - Sugiere: "tu camiseta podría ser X color y tu diseño podría tener acentos Y, Z".
  - Click aplica los colores a la prenda y a los chips de IA.
- **Estimación:** M · **Prioridad:** P2

#### HU-7.6 · Magic eraser sobre el diseño
**Como** usuario con un diseño IA casi perfecto, **quiero** borrar partes específicas (un objeto que no me gusta), **para** no regenerar todo desde cero.
- **Criterios:**
  - En capas tipo `ai`, botón "Borrar parte".
  - Modo pincel sobre la imagen: el usuario pinta el área a borrar.
  - Inpainting con Imagen / Stable Diffusion repinta el fondo coherentemente.
  - Undo disponible.
- **Estimación:** L · **Prioridad:** P1
- **Diferenciador:** Cero competencia en custom apparel.

#### HU-7.7 · Moderación de prompts y contenido
**Como** producto, **necesito** filtrar prompts ofensivos, marcas registradas y contenido NSFW antes de gastar tokens, **para** proteger la marca y reducir costos.
- **Criterios:**
  - Antes de llamar a Gemini, el prompt pasa por un classifier (Gemini con system prompt o `@google-ai/generative-ai-safety`).
  - Bloquea o pide reformular con mensaje amigable: "Ese término no está disponible. Prueba describiendo el estilo en su lugar."
  - Lista bloqueada editable de marcas (Nike, Adidas, Disney…).
  - Logs de bloqueos para revisión.
- **Estimación:** M · **Prioridad:** P0

---

### 👥 Sprint 8 — Modo Equipos / B2B (2 semanas)

> **Objetivo:** Capturar el segmento de mayor ticket promedio del mercado: equipos deportivos, eventos corporativos, promociones, regalos en bulk. Este flujo no existe en el plan V1.

#### HU-8.1 · Roster mode (un diseño, N variantes con nombre/número) ⭐⭐
**Como** capitán de equipo, **quiero** subir una lista con nombres y números, **para** que se generen mockups individuales con el mismo diseño base.
- **Criterios:**
  - En el header, switch "Modo Equipo".
  - Modal: pegar tabla, subir CSV, o agregar manualmente filas con `nombre, número, talla`.
  - Define qué capa de texto es "Nombre" y cuál es "Número" en el diseño base.
  - Genera grid con todos los mockups (uno por persona).
  - Cada mockup descargable individualmente o todos en ZIP.
- **Estimación:** L · **Prioridad:** P0
- **Implementación:** clonar `LayerState[]` por roster entry, sustituir capas marcadas como `templateField`.

#### HU-8.2 · Pago dividido (split payment) ⭐
**Como** organizador, **quiero** que cada integrante pague su prenda con un link individual, **para** no adelantar la plata yo.
- **Criterios:**
  - En el roster, cada fila tiene botón "Generar link de pago".
  - Link único por persona: ve su mockup, su talla, su precio.
  - Dashboard del organizador muestra estado: pendiente / pagado / fallido.
  - Pedido se libera a producción cuando 100% (o threshold configurable) ha pagado.
- **Estimación:** L · **Prioridad:** P1

#### HU-8.3 · Cotizaciones por volumen en tiempo real
**Como** comprador bulk, **quiero** ver el descuento por cantidad mientras armo el pedido, **para** decidir si aumentar la cantidad.
- **Criterios:**
  - En BottomBar (modo equipo), tabla de tiers: 10-24 / 25-49 / 50-99 / 100+ con % descuento por tier.
  - Total se actualiza en vivo al cambiar el roster.
  - "Te faltan 3 prendas para el siguiente descuento de 8%".
- **Estimación:** M · **Prioridad:** P0

#### HU-8.4 · Flujo de aprobación de diseño
**Como** marca corporativa, **quiero** que un segundo decisor apruebe el diseño antes de pagar, **para** cumplir con guidelines internas.
- **Criterios:**
  - Botón "Solicitar aprobación".
  - Genera link enviable por email/WhatsApp.
  - El aprobador ve el mockup en alta resolución, comenta zonas con pin, aprueba/rechaza.
  - Si rechaza, vuelve al editor con los comentarios visibles como pins en el canvas.
- **Estimación:** L · **Prioridad:** P1

#### HU-8.5 · Cuenta corporativa con catálogo guardado
**Como** empresa que pide repetidamente, **quiero** un workspace con mis diseños aprobados, paleta de marca y datos guardados, **para** repetir pedidos en 1 click.
- **Criterios:**
  - Sección "Mi marca" con: logo, paleta, fuentes preferidas, dirección de envío default, datos fiscales.
  - Galería de "Diseños aprobados" para reutilizar.
  - Reorder en 1 click (cambia solo cantidades y tallas).
  - Multi-usuario por empresa con roles (editor / aprobador / comprador).
- **Estimación:** L · **Prioridad:** P1

---

### 💝 Sprint 9 — Post-compra y fidelización (1.5 semanas)

> **Objetivo:** Cerrar el ciclo después del checkout. El plan V1 termina al pagar; aquí se construye retención, recompra y referidos.

#### HU-9.1 · Tracking de pedido en tiempo real
**Como** comprador, **quiero** ver el estado de mi pedido (recibido → diseño aprobado → en producción → control calidad → enviado → entregado), **para** saber cuándo llegará.
- **Criterios:**
  - Página `/order/:id` con timeline visual.
  - Foto real del producto al salir de planta (subida por operador).
  - Notificaciones push / email en cada hito.
  - Integración con tracking de courier (Servientrega, Coordinadora, FedEx vía Aftership).
- **Estimación:** L · **Prioridad:** P0

#### HU-9.2 · Recuperación de carrito abandonado
**Como** producto, **necesito** rescatar a usuarios que abandonaron el checkout, **para** subir conversión.
- **Criterios:**
  - Si el usuario tiene un diseño guardado y no completó pago en 24h, se envía email/WhatsApp.
  - El correo incluye el mockup como imagen pegada y un cupón único 10%.
  - Link revive el state exacto del editor.
  - Trigger de un segundo recordatorio a 72h con descuento mayor.
- **Estimación:** M · **Prioridad:** P0

#### HU-9.3 · Reviews con foto post-entrega ⭐
**Como** comprador satisfecho, **quiero** publicar mi review con foto, **para** ayudar a otros y mostrar mi prenda.
- **Criterios:**
  - 7 días después de entrega, email "¿Te llegó? Cuéntanos".
  - Form simple: rating 1-5, texto, hasta 3 fotos.
  - Reviews visibles en la página del producto y en la galería pública.
  - Recompensa: 500 puntos por review con foto aprobada.
- **Estimación:** M · **Prioridad:** P1

#### HU-9.4 · Wishlist sin login
**Como** indeciso, **quiero** guardar diseños favoritos sin crear cuenta, **para** volver después.
- **Criterios:**
  - Corazón en cada diseño / template.
  - Wishlist persiste en localStorage + opcionalmente sincroniza con email.
  - Vista "Mis favoritos" en el header.
  - Al agregar un favorito, opción "Avísame si baja de precio".
- **Estimación:** S · **Prioridad:** P1

#### HU-9.5 · Programa de puntos y créditos IA
**Como** usuario recurrente, **quiero** ganar puntos por cada acción y compra, **para** canjearlos por descuentos o generaciones IA.
- **Criterios:**
  - Puntos por: registro (100), primer diseño (200), primera compra (500), review con foto (500), referido que compra (2000).
  - Canje: 100pts = 1 generación IA extra · 1000pts = $5.000 off.
  - Widget visible en el header.
  - Histórico de movimientos.
- **Estimación:** M · **Prioridad:** P1

#### HU-9.6 · Programa de referidos ⭐
**Como** cliente feliz, **quiero** invitar amigos y ganar crédito si compran, **para** compartir un buen producto.
- **Criterios:**
  - Cada usuario recibe link único `/r/:code`.
  - Si un referido compra, ambos reciben $20.000 en crédito.
  - Dashboard "Mis referidos" con: invitados, registrados, compradores, crédito ganado.
  - Compartir directo a WhatsApp / Instagram con copy + mockup pre-generado.
- **Estimación:** M · **Prioridad:** P0
- **Nota:** suele ser el motor de growth más eficiente en CAC.

---

### 🌍 Sprint 10 — Comunidad y contenido (2 semanas)

> **Objetivo:** Convertir AI Wear Studio de herramienta a plataforma. Esto crea network effect y SEO orgánico que reduce el costo de adquisición.

#### HU-10.1 · Galería pública / Explore
**Como** visitante curioso, **quiero** explorar diseños creados por otros usuarios, **para** inspirarme y descubrir el producto.
- **Criterios:**
  - Página `/explore` con grid infinito.
  - Filtros: estilo, color, categoría, tendencia.
  - Cada card muestra: mockup, autor (anon o nick), nº de remixes, nº de likes.
  - URL indexable por Google con metadata OG.
  - El usuario puede marcar su diseño como "público" en el flujo de guardar.
- **Estimación:** L · **Prioridad:** P1
- **Beneficio:** SEO orgánico de largo plazo.

#### HU-10.2 · Marketplace de diseñadores ⭐⭐
**Como** diseñador independiente, **quiero** publicar mis diseños y cobrar comisión cuando alguien los compre estampados, **para** monetizar mi arte.
- **Criterios:**
  - Onboarding de diseñador con KYC ligero.
  - Sube SVG/PNG transparente con tags y precio sugerido (recibe 30% del margen).
  - Dashboard con ventas, cobros, ranking.
  - Página de perfil pública.
  - Sistema de payout mensual (Wompi / PayPal).
- **Estimación:** L · **Prioridad:** P2
- **Diferenciador:** convierte la app en una plataforma con dos lados.

#### HU-10.3 · Concursos mensuales de diseño
**Como** comunidad, **quiero** participar en concursos temáticos, **para** ganar visibilidad y premios.
- **Criterios:**
  - Tema mensual ("Independencia", "Halloween", "Mundial 2026").
  - Diseños participantes en sección destacada.
  - Votación pública (1 voto por usuario por día).
  - Top 3 reciben premio (crédito + perfil destacado + impresión gratis).
- **Estimación:** M · **Prioridad:** P2

#### HU-10.4 · Embed widget para influencers
**Como** influencer, **quiero** poner el editor de AI Wear Studio en mi propio sitio con mi marca, **para** vender merch sin construir nada.
- **Criterios:**
  - Página `/partners` con generador de embed (`<iframe>` o snippet JS).
  - Soporta logo del influencer en el header.
  - Restringe el catálogo a templates aprobados por el influencer.
  - Cada venta paga comisión configurable al influencer.
  - Analytics de vistas y conversiones.
- **Estimación:** L · **Prioridad:** P2

---

### ♿ Sprint 11 — Accesibilidad y calidad web (1.5 semanas)

> **Objetivo:** Cumplir WCAG 2.1 AA, indexar bien en Google y rendir sólido en mobile. Esto destraba B2B (gobierno, edu, corporativo grande) y growth orgánico.

#### HU-11.1 · WCAG 2.1 AA compliance ⭐
**Como** usuario con discapacidad, **quiero** poder usar el editor con teclado y lector de pantalla, **para** crear mi diseño en igualdad de condiciones.
- **Criterios:**
  - Contraste mínimo AA en todo el UI (auditar con axe DevTools).
  - Navegación 100% por teclado (Tab, Enter, Esc, flechas).
  - `aria-label` en iconos sin texto, `role` adecuado en cada componente.
  - Focus visible custom (no solo outline default).
  - Skip-to-content link.
  - Test automatizado con `@axe-core/react` en dev.
- **Estimación:** L · **Prioridad:** P0

#### HU-11.2 · Fallback de canvas para screen readers
**Como** usuario invidente, **quiero** un resumen textual del diseño actual y poder editarlo con comandos, **para** no depender del canvas visual.
- **Criterios:**
  - Botón "Modo accesible" en header.
  - Lista textual de capas con su descripción (alt-text generado por IA si no hay).
  - Comandos por voz/texto: "mover capa 2 al centro", "agregar texto Felipe".
  - Aria-live region anuncia cambios.
- **Estimación:** L · **Prioridad:** P2

#### HU-11.3 · SSR / SSG para SEO
**Como** producto, **necesito** que la galería pública, templates y blog se indexen en Google, **para** capturar tráfico orgánico de larga cola.
- **Criterios:**
  - Migrar páginas estáticas (landing, explore, /t/:slug, /designer/:slug) a SSR con `vike` o Next.
  - Sitemap dinámico generado.
  - Metadata OG dinámica por diseño/template.
  - Test con PageSpeed Insights ≥ 90.
- **Estimación:** L · **Prioridad:** P1

#### HU-11.4 · Core Web Vitals en mobile
**Como** producto, **necesito** que LCP <2.5s, INP <200ms, CLS <0.1 en mobile, **para** posicionar bien y reducir bounce.
- **Criterios:**
  - Lazy load de Konva y dependencias pesadas (~200KB).
  - Code splitting por ruta.
  - Imágenes en WebP/AVIF responsive.
  - Preload de fuentes críticas.
  - Monitoreo continuo con Vercel Analytics o web-vitals.
- **Estimación:** M · **Prioridad:** P0

#### HU-11.5 · i18n real (es-CO, es-MX, en-US)
**Como** usuario fuera de Colombia, **quiero** la app en mi idioma con mi moneda y formato local, **para** sentirla nativa.
- **Criterios:**
  - Migrar strings a `react-i18next` con namespaces.
  - Detect locale automático con override manual.
  - Moneda por país (COP / MXN / USD) con conversión actualizada.
  - Tallas localizadas (ES Latam vs US).
  - Fechas / números formateados con `Intl`.
- **Estimación:** M · **Prioridad:** P1

---

### 📱 Sprint 12 — PWA y mobile real (1 semana)

> **Objetivo:** Que la app se sienta nativa en mobile sin construir apps. Habilita uso offline y reduce fricción de instalación.

#### HU-12.1 · PWA instalable
**Como** usuario móvil, **quiero** instalar AI Wear Studio en mi pantalla de inicio, **para** acceder rápido sin abrir el navegador.
- **Criterios:**
  - `manifest.json` completo con íconos 192/512.
  - Service worker con `vite-plugin-pwa`.
  - Cachea catálogo, templates y assets de prendas.
  - Banner de instalación discreto tras 2 sesiones.
- **Estimación:** S · **Prioridad:** P1

#### HU-12.2 · Compartir nativo mobile
**Como** usuario, **quiero** compartir mi diseño directamente a Stories de Instagram o WhatsApp, **para** mostrarlo a mis amigos sin pasos extra.
- **Criterios:**
  - Botón "Compartir" usa Web Share API en mobile.
  - Pre-genera mockup 1080×1920 (formato Story).
  - Incluye watermark sutil y CTA.
- **Estimación:** S · **Prioridad:** P1

#### HU-12.3 · Cámara como input creativo
**Como** usuario, **quiero** apuntar mi cámara a algo (graffiti, taza, paisaje) y convertirlo en diseño, **para** crear desde lo que veo.
- **Criterios:**
  - Botón "Diseñar desde cámara" en mobile.
  - Captura foto → background removal → style transfer (selector de estilo).
  - Resultado se inserta como capa.
- **Estimación:** M · **Prioridad:** P2

#### HU-12.4 · Persistencia automática del trabajo
**Como** usuario, **quiero** que mi diseño se guarde solo cada cierto tiempo, **para** no perderlo si se cierra el navegador.
- **Criterios:**
  - Autosave en localStorage cada 5s con debounce.
  - Indicador discreto "Guardado hace 3s".
  - Al reabrir la app, banner "Tienes un diseño en progreso, ¿retomar?".
  - Soporta hasta 5 sesiones recientes.
- **Estimación:** S · **Prioridad:** P0

---

### 🚀 Sprint 13 — Onboarding y growth interno (1 semana)

> **Objetivo:** Aumentar la tasa de activación (visitante → primer diseño generado) y reducir el costo de iteración del producto.

#### HU-13.1 · Tour interactivo guiado
**Como** usuario nuevo, **quiero** una guía rápida que me muestre los 3 botones críticos, **para** entender qué puedo hacer sin leer.
- **Criterios:**
  - Primera visita: spotlight sobre IA → Catálogo → Pagar.
  - 4-5 pasos máximo, skippable en cualquier momento.
  - Solo se muestra una vez (flag en localStorage).
  - Usar `intro.js` o componente custom con Motion.
- **Estimación:** S · **Prioridad:** P1

#### HU-13.2 · A/B testing framework
**Como** producto, **necesito** experimentar con prompts, copys y precios, **para** optimizar conversión basado en datos.
- **Criterios:**
  - Integrar PostHog (free tier hasta 1M eventos).
  - Feature flags por experimento.
  - Hook `useExperiment(key)` para asignar variante.
  - Dashboard de resultados con significancia estadística.
- **Estimación:** M · **Prioridad:** P1

#### HU-13.3 · Feedback widget in-app
**Como** producto, **necesito** capturar feedback con contexto de qué estaba haciendo el usuario, **para** priorizar mejoras reales.
- **Criterios:**
  - Botón flotante "💬 Feedback" en esquina inferior.
  - Form: rating + texto + screenshot automático del estado actual.
  - Captura del state del editor adjunta para reproducir bugs.
  - Envío a Slack / Notion vía webhook.
- **Estimación:** S · **Prioridad:** P1

#### HU-13.4 · Soporte conversacional con IA
**Como** usuario con duda, **quiero** preguntar a un asistente IA dentro de la app, **para** resolver al instante sin esperar humano.
- **Criterios:**
  - Widget de chat con Gemini entrenado en FAQ + catálogo.
  - Si no resuelve en 3 turnos, escala a humano vía email/WhatsApp.
  - Historial accesible.
  - Acciones rápidas: "rastrear pedido", "iniciar devolución", "explicar precios".
- **Estimación:** L · **Prioridad:** P2

---

### ✨ Sprint 14 — UX polish profundo (1 semana)

> **Objetivo:** Detalles que se sienten en cada interacción y multiplican la percepción de calidad sin grandes cambios funcionales.

#### HU-14.1 · Comparación lado a lado de variaciones
**Como** indeciso entre 2 diseños, **quiero** verlos lado a lado con un slider, **para** decidir mejor.
- **Criterios:**
  - Selecciona 2 variaciones IA (checkbox).
  - Vista comparativa con slider central (image-compare-viewer).
  - Botón "Aplicar A" o "Aplicar B".
- **Estimación:** S · **Prioridad:** P2

#### HU-14.2 · Historial visual tipo branches ⭐
**Como** usuario que experimenta, **quiero** ramificar mi diseño y volver a versiones anteriores, **para** explorar sin perder lo bueno.
- **Criterios:**
  - Más allá de undo/redo: botón "Guardar como variación".
  - Sidebar con árbol de versiones (thumbnails).
  - Click en cualquier nodo carga ese estado.
  - Posibilidad de bifurcar desde una versión antigua.
- **Estimación:** L · **Prioridad:** P2

#### HU-14.3 · Skeleton screens consistentes
**Como** usuario, **quiero** ver placeholders coherentes mientras carga, **para** percibir la app como rápida y pulida.
- **Criterios:**
  - Componente `<Skeleton>` reutilizable.
  - Aplicado en: catálogo, generación IA, miniaturas, panel de capas, checkout.
  - Animación shimmer sutil, no distractora.
- **Estimación:** S · **Prioridad:** P1

#### HU-14.4 · Optimistic UI en acciones de capa
**Como** usuario, **quiero** ver el resultado de mis acciones inmediatamente, **para** que la app se sienta instantánea.
- **Criterios:**
  - Añadir capa, mover, escalar, duplicar: actualizar UI antes de confirmar render Konva.
  - Si falla, revertir con toast.
  - Manejo de errores graceful.
- **Estimación:** M · **Prioridad:** P1

#### HU-14.5 · Microinteracciones celebratorias
**Como** usuario, **quiero** sentir pequeñas recompensas en momentos clave, **para** disfrutar el proceso.
- **Criterios:**
  - Confetti sutil al añadir primera capa (`canvas-confetti`).
  - Animación de "pulse" al aplicar IA exitosa.
  - Sonido opcional (toggle) al completar checkout.
  - Badge animado al desbloquear logros (primera compra, 10 diseños, etc.).
- **Estimación:** S · **Prioridad:** P2

---

### 🛡️ Sprint 15 — Anti-fraude y operaciones (1 semana)

> **Objetivo:** Proteger márgenes contra abuso de la IA gratuita, fraude de pagos y devoluciones por dirección errónea.

#### HU-15.1 · Rate limiting visible y fingerprinting
**Como** producto, **necesito** limitar generaciones IA por sesión guest, **para** no quemar tokens.
- **Criterios:**
  - Fingerprint con FingerprintJS (free tier).
  - Límite por defecto: 10 generaciones gratis por device por día.
  - Contador visible: "Te quedan 7 generaciones gratis hoy".
  - Al agotar: CTA "Regístrate y obtén 50 más" o "Compra y siguen siendo ilimitadas por ese pedido".
  - Bypass para usuarios con compra histórica.
- **Estimación:** M · **Prioridad:** P0

#### HU-15.2 · Validación de direcciones con autocompletado
**Como** producto, **necesito** validar direcciones en checkout, **para** reducir devoluciones por mala dirección.
- **Criterios:**
  - Integración con Google Places Autocomplete (o alternativa local).
  - Sugerencias mientras escribe.
  - Valida que ciudad + país + código postal sean coherentes.
  - Mapa mini con pin para confirmar visualmente.
- **Estimación:** S · **Prioridad:** P0

#### HU-15.3 · Antifraude en pagos (3DS y reglas)
**Como** producto, **necesito** rechazar pagos sospechosos antes de producir, **para** evitar chargebacks.
- **Criterios:**
  - Habilitar 3D Secure 2.0 en gateway (Wompi/Mercado Pago lo traen).
  - Reglas: rechazar si BIN + IP en países distintos sin verificación, si email es throwaway, si la cantidad es atípica para nuevo cliente.
  - Manual review queue para casos ambiguos.
  - Métricas de tasa de aprobación / chargebacks.
- **Estimación:** M · **Prioridad:** P0

---

## Resumen ejecutivo y priorización sugerida

Si tuvieras que ordenar **el siguiente cuatrimestre** por impacto / esfuerzo, este sería el orden:

1. **HU-7.4** (Print Quality Score) — alto impacto en calidad y NPS, esfuerzo medio.
2. **HU-7.1** (Background removal automático) — sensación de magia inmediata, esfuerzo medio.
3. **HU-15.1** + **HU-15.2** (Rate limit y validación direcciones) — protege caja y operación.
4. **HU-9.6** (Referidos) — el motor de growth más barato.
5. **HU-9.2** (Carrito abandonado) — recupera ventas perdidas con poco esfuerzo.
6. **HU-8.1** (Roster mode) — destraba el segmento de mayor ticket promedio.
7. **HU-12.4** (Persistencia automática) — quick win con alto impacto en frustración.
8. **HU-11.4** (Core Web Vitals) — destraba SEO y mobile UX.
9. **HU-11.1** (WCAG AA) — destraba B2B y es deuda técnica creciente.
10. **HU-9.1** (Tracking en tiempo real) — cierra el ciclo de confianza post-compra.

El resto puede planearse en función de la estrategia comercial: si el foco es **B2B**, prioriza Sprint 8 completo; si es **D2C consumer**, prioriza Sprints 9, 10 y 13; si es **diferenciación de producto**, Sprint 7 entero.

---

## Métricas adicionales a las del V1

| Métrica | Por qué importa | Sprint relevante |
|---|---|---|
| Tasa de devolución por calidad de impresión | Mide impacto del Print Quality Score | 7 |
| Ticket promedio por pedido equipo vs individual | Valida modo equipos | 8 |
| Tasa de recompra a 90 días | Mide fidelización | 9 |
| Coeficiente viral (k-factor) de referidos | Mide growth orgánico | 9 |
| Tráfico orgánico SEO mensual | Mide SSR + galería | 10, 11 |
| LCP / INP / CLS p75 mobile | Mide calidad técnica | 11 |
| Tasa de instalación PWA | Mide adopción mobile | 12 |
| Tasa de finalización de tour | Mide claridad de onboarding | 13 |
| Chargeback rate | Mide salud antifraude | 15 |

---

**Próximo paso sugerido:** elegir 3 HU del top 10 y armar tickets ejecutables. ¿Quieres que arranque la implementación de **HU-7.4 (Print Quality Score)** o **HU-12.4 (Autosave)** como primer quick win medible?
