---
title: 'AI Wear Studio — Especificación UX/UI'
version: '1.0'
created: '2026-05-12'
status: 'draft'
source: 'Extraído del prototipo src/frontend/ + PRD + Journeys de usuario'
owner: 'John (PM)'
next_review: 'Antes de iniciar Story 2.2'
---

# AI Wear Studio — Especificación UX/UI

> **Propósito:** Este documento define el sistema visual, flujos de usuario y especificaciones de pantalla que guían la implementación del frontend. Es la fuente de verdad para decisiones de diseño e interacción. Todo lo aquí documentado está basado en el prototipo existente (`src/frontend/`) o en decisiones explícitas del equipo.

---

## 1. Sistema de Diseño

### 1.1 Paleta de Colores

| Token | Valor hex | Uso |
|-------|-----------|-----|
| `brand-primary` | `#7C3AED` (violet-600) | CTAs principales, íconos de marca, bordes activos |
| `brand-secondary` | `#A855F7` (violet-500) | Hover states, gradientes intermedios |
| `brand-accent` | `#D946EF` (fuchsia-500) | Acentos, gradientes de marca, badges |
| `brand-gradient` | `from-violet-600 to-fuchsia-500` | Botones CTA, logo, LeftRail |
| `brand-dark` | `from-violet-900 via-violet-800 to-fuchsia-900` | LeftRail del editor, superficies oscuras |
| `surface-base` | `#FFFFFF` | Fondo principal, cards |
| `surface-muted` | `#F8FAFC` (slate-50) | Fondo de páginas, input backgrounds |
| `border-subtle` | `#E2E8F0` (slate-200) | Bordes de cards, separadores |
| `text-primary` | `#0F172A` (slate-900) | Texto principal |
| `text-secondary` | `#64748B` (slate-500) | Texto de soporte, labels, placeholders |
| `text-tertiary` | `#94A3B8` (slate-400) | Texto deshabilitado, metadata |
| `error` | `#FB7185` (rose-400) | Errores, alertas destructivas |
| `success` | `#34D399` (emerald-400) | Confirmaciones, estados positivos |

### 1.2 Tipografía

| Rol | Familia | Peso | Uso |
|-----|---------|------|-----|
| `font-brand` | Inter | 900 (Black) | Nombre de marca, headings de pantalla |
| `font-heading` | Inter | 700 (Bold) | Títulos de sección, nombres de prenda |
| `font-body` | Inter | 400 (Regular) | Texto de párrafo, descripciones |
| `font-label` | Inter | 700 Bold + uppercase + tracking-widest | Labels de campos, categorías |
| `font-micro` | Inter | 700 + uppercase + tracking-[0.25em] | Nombre de marca en header |
| `font-mono` | JetBrains Mono | 400/700 | Códigos, datos técnicos |

**Fuentes importadas:** Inter, JetBrains Mono, Playfair Display (disponible para títulos editoriales futuros), Space Grotesk (disponible).

### 1.3 Espaciado y Radios

| Elemento | Valor | Uso |
|----------|-------|-----|
| Header height | `h-16` (64px) | Barra de navegación global |
| LeftRail width | `w-20` (80px) | Barra de herramientas vertical del editor |
| Card radius | `rounded-2xl` (16px) | Cards de prendas, paneles principales |
| Button radius | `rounded-xl` (12px) / `rounded-2xl` (16px) | Botones normales / CTA principal |
| Badge radius | `rounded-lg` (8px) | Pills, tags |
| Avatar radius | `rounded-full` | Avatares de usuario |

### 1.4 Sombras

| Nombre | Clase | Uso |
|--------|-------|-----|
| Marca | `shadow-violet-500/20` | Logo, elementos de marca |
| Card hover | `shadow-violet-500/10` | Cards al hover |
| CTA | `shadow-lg shadow-violet-500/30` → hover `shadow-violet-500/50` | Botones de acción principal |
| Panel | `shadow-xl` | LeftRail, drawers |

### 1.5 Animaciones

| Nombre | Definición | Uso |
|--------|-----------|-----|
| `slide-up` | `translateY(20px)→0, opacity 0→1, 0.4s cubic-bezier(0.16,1,0.3,1)` | Modales, drawers, banners |
| `fade` | `opacity 0→1, 0.15s` | Overlays, drag-drop |
| Transiciones | `transition-all duration-200` | Estados hover/focus generales |

---

## 2. Arquitectura de Pantallas

```
App
├── [Phase: selection] GarmentSelector
│   ├── Step 1: Grid de prendas (estado: loading / error / lista)
│   └── Step 2: Configurar prenda (color + talla + cantidad + vistas)
│
└── [Phase: design] Canvas Editor
    ├── Header global (undo/redo, herramientas secundarias, user)
    ├── LeftRail (6 herramientas: Producto, IA Design, Subir Logo, Texto, Arte, Personalizar)
    ├── EditorDrawer (panel lateral colapsable según herramienta activa)
    ├── CanvasEngine (área central de diseño — React Konva)
    ├── RightPanel (panel de propiedades de la capa activa)
    └── BottomBar (información de prenda + CTA checkout)

Modales globales:
├── CheckoutPage (overlay full-screen)
├── ShareModal
├── ReferralModal
└── ResumeBanner (banner de sesión recuperable)

[PENDIENTE — no implementado en prototipo]:
├── LoginPage
├── RegisterPage
├── VerifyEmailPage / VerifyEmailBanner
└── Auth Gate Modal (al intentar usar IA sin verificar email)
```

---

## 3. Flujos de Usuario

### 3.1 Flujo Principal — Cliente Anónimo → Diseño → Checkout

```
Entrada → [Catálogo anónimo]
  ↓
Step 1: Elegir prenda (grid de cards)
  ↓
Step 2: Configurar (color + talla + cantidad)
  ↓ "Comenzar diseño →"
[Canvas Editor — fase design]
  ↓ usuario diseña libremente (texto, imagen/logo, arte)
  ↓ intenta herramienta IA (Sparkles)
  → [AUTH GATE] → modal "Necesitas una cuenta para usar IA"
       ↓ "Crear cuenta" → RegisterPage
       ↓ "Ya tengo cuenta" → LoginPage
       ↓ "Continuar sin IA" → cierra modal
  ↓
  BottomBar → "Confirmar pedido"
  → [AUTH GATE si no autenticado] → flujo registro/login
  → [CheckoutPage] → dirección + confirmación + ToS
  ↓
Pedido confirmado → pantalla de éxito
```

### 3.2 Flujo Auth — Registro de Cliente

```
RegisterPage
  ↓ email + password (min 8 chars)
  ↓ POST /api/v1/auth/register
  → 201: JWT con email_verified=false
     ↓ acceso inmediato al catálogo + canvas + preview logo
     ↓ banner "Verifica tu email para desbloquear IA"
     ↓ [usuario verifica en su inbox]
     ↓ GET /auth/verify-email?token=...
     ↓ POST /auth/refresh → JWT con email_verified=true
     ↓ herramientas IA desbloqueadas
```

### 3.3 Flujo Auth — Login

```
LoginPage
  ↓ email + password
  ↓ POST /api/v1/auth/login
  → 200: JWT + refreshToken
  → 401: "Email o contraseña incorrectos" (mensaje genérico)
  ↓ redirect a la pantalla anterior
```

### 3.4 Flujo — Catálogo (Epic 2 scope)

```
GarmentSelector [Step 1]
  Estado loading: spinner centrado + "Cargando catálogo…"
  Estado error:   ícono AlertCircle + "No se pudo cargar el catálogo" + botón "Reintentar"
  Estado vacío:   [PENDIENTE — ¿qué ve el cliente si el tenant no tiene prendas activas?]
  Estado datos:   grid responsive (2 cols mobile / 3 tablet / 4 desktop)
    → Card de prenda: imagen (placeholder 👕) + nombre + categoría + color swatches (máx 6 + "+N")
    → Hover: borde violet, shadow violet/10, bg violet-50 en placeholder

GarmentSelector [Step 2]
  Layout: 2 columnas en desktop (config izq, vistas der) / 1 columna en mobile
  Izq: nombre + categoría → selector color (círculos) → selector talla (pills) → cantidad (+/-) → CTA
  Der: lista de vistas disponibles (acordeón) → al expandir: ZoneSummary (nombre, dimensiones, técnica)
```

---

## 4. Especificación de Pantallas — Epic 2 Scope

### 4.1 Página de Catálogo (Story 2.2)

**URL/ruta:** `/` o pantalla inicial de la app (fase `selection`)

**Header:**
- Logo: ícono gradient violet→fuchsia + texto "AI Wear Studio" (brand gradient en "Studio")
- Sin autenticación visible en esta pantalla (el login/registro se solicita solo cuando se necesita)

**Breadcrumb stepper:**
```
1 · Elegir prenda  >  2 · Configurar
```
- Paso activo: `font-bold text-violet-600`
- Paso inactivo: `text-slate-400`

**Grid de prendas:**
- Columnas: 2 (< 640px) / 3 (640–1024px) / 4 (> 1024px)
- Gap: `gap-4`
- Max-width contenedor: `max-w-5xl mx-auto`

**Card de prenda:**
```
bg-white border border-slate-200 rounded-2xl p-4
Hover: border-violet-400 shadow-lg shadow-violet-500/10
Imagen: aspect-square bg-slate-100 rounded-xl (hover: bg-violet-50)
  → placeholder: emoji 👕 [TODO: reemplazar con imagen real del catálogo]
Nombre: text-sm font-bold text-slate-800
Categoría: text-[11px] text-slate-400
Swatches: círculos w-3.5 h-3.5 con borde slate-200, máx 6 + "+N más"
```

**Estados de carga:**
- Loading: `Loader2 size=32 text-violet-500 animate-spin` + "Cargando catálogo…"
- Error: `AlertCircle size=32 text-rose-400` + mensaje + botón "Reintentar" (violet-600)
- **Vacío [PENDIENTE]:** ¿Ilustración? ¿Mensaje? ¿CTA a contactar al taller? → Decisión requerida

### 4.2 Configuración de Prenda (Story 2.2 — Step 2)

**Selector de color:**
- Círculos `w-8 h-8 rounded-full border-2`
- Activo: `border-violet-500 scale-110 shadow-md shadow-violet-500/30`
- Inactivo: `border-slate-200 hover:border-slate-400`
- Label del color seleccionado debajo: `text-xs text-slate-500`

**Selector de talla:**
- Pills `px-3 py-1.5 rounded-lg border text-sm font-semibold`
- Activo: `bg-violet-600 text-white border-violet-600`
- Inactivo: `bg-white text-slate-700 border-slate-200 hover:border-violet-400`

**Selector de cantidad:**
- Botones `-` / `+` en `w-8 h-8 rounded-lg border border-slate-200`
- Número: `text-lg font-black w-8 text-center`
- Mínimo: 1 (botón `-` deshabilitado en 1)

**CTA principal:**
```
"Comenzar diseño →"
w-full py-3.5
bg-gradient-to-r from-violet-600 to-fuchsia-500
text-white font-black text-sm uppercase tracking-widest
rounded-2xl shadow-lg shadow-violet-500/30
hover: shadow-violet-500/50
disabled: opacity-40 cursor-not-allowed (si color/talla no seleccionados)
```

**Vista derecha — vistas y zonas:**
- Acordeón: click en vista la expande, click de nuevo la colapsa
- Activa: `border-violet-400 bg-violet-50`
- Inactiva: `border-slate-200 bg-white hover:border-violet-300`
- ZoneSummary: lista de zonas con ícono Ruler violet-400, nombre, dimensiones, badge de técnica (`bg-violet-50 text-violet-700`)

### 4.3 Layout del Editor de Canvas (Stories Epic 3+)

**Header global (h-16, bg-white, border-b border-slate-200, z-50):**
- Izquierda: Logo + separador + "← Cambiar prenda" + separador + SaveIndicator
- Centro (absolute left-1/2): Undo / Redo
- Derecha: Download PNG + Referral (Gift) + Share + Help + Cart (con badge contador) + Avatar de usuario

**LeftRail (w-20, dark gradient, z-50):**
- Logo "S" en círculo gradient
- 6 herramientas verticales:
  1. 👕 Producto (`Shirt`)
  2. ✨ IA Design (`Sparkles`) — requiere email verificado
  3. ⬆ Subir Logo (`Upload`)
  4. T Texto (`Type`)
  5. ◎ Arte (`Shapes`)
  6. # Personalizar (`Hash`)
- Activo: bg gradient violet→fuchsia, ring white/30, shadow fuchsia/30
- Inactivo: text-violet-200/70, hover text-white, hover bg-white/10

**Zona de drag & drop:**
- Overlay: `bg-violet-600/15 backdrop-blur-sm` (cubre toda la pantalla)
- Panel central: bg-white rounded-3xl border-4 dashed border-violet-500, px-12 py-10
- Animación: scale 0.9→1, y 8→0

---

## 5. Componentes Pendientes de Diseño

Los siguientes elementos **no existen en el prototipo** y requieren diseño antes de implementarse:

### 5.1 Modales de Auth [DECISIÓN TOMADA — 2026-05-12]

**Patrón:** modal centrado sobre la pantalla actual — el usuario nunca abandona el flujo de diseño/catálogo. Login y Registro son vistas intercambiables dentro del mismo modal.

**Cuándo aparece:**
- Al intentar usar herramienta de IA (LeftRail → Sparkles) sin estar autenticado
- Al pulsar "Confirmar pedido" en BottomBar sin estar autenticado
- El catálogo y el editor de canvas son 100% accesibles sin auth

**AuthModal — estructura:**
```
Overlay: bg-slate-900/50 backdrop-blur-sm (inset-0)
Panel: bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto p-8
  Header: título + ícono X (cerrar)
  Tabs o toggle: "Iniciar sesión" / "Crear cuenta"
  Form según tab activo
  Footer: link para cambiar de tab
```

**Vista Login:**
- Campo: email (type=email, placeholder "tu@email.com")
- Campo: password (type=password, placeholder "••••••••")
- CTA: "Iniciar sesión" — gradient violet→fuchsia, w-full
- Link debajo: "¿No tienes cuenta? → Crear cuenta" (cambia de tab)
- Link: "¿Olvidaste tu contraseña?" (diferido — Epic 6)
- Error: banner inline rojo suave "Email o contraseña incorrectos"

**Vista Registro:**
- Campo: email
- Campo: password (min 8 chars, hint "Mínimo 8 caracteres")
- Validación inline: contorno rojo + mensaje si < 8 chars al blur
- CTA: "Crear cuenta" — gradient violet→fuchsia, w-full
- Link debajo: "¿Ya tienes cuenta? → Iniciar sesión"
- Post-submit exitoso: modal se cierra + banner aparece en pantalla: "📧 Revisa tu email para verificar tu cuenta y desbloquear IA"

**Contexto del trigger (copy adaptativo):**
- Trigger desde IA: título del modal = "Desbloquea el diseño con IA" + subtítulo "Crea una cuenta gratis para usar las herramientas de generación con IA."
- Trigger desde Checkout: título = "Identifícate para confirmar tu pedido" + subtítulo "Necesitamos tu cuenta para procesar y rastrear tu pedido."
- Trigger manual (ícono User en header): título genérico "Bienvenido a AI Wear Studio"

**Verificación de email — patrón on-demand [DECISIÓN TOMADA — 2026-05-12]:**
- **Sin banner persistente.** El aviso aparece únicamente cuando el usuario intenta usar una herramienta que requiere email verificado.
- Al intentar usar IA con `email_verified=false`: el Auth Gate Modal muestra estado especial:
  ```
  Título: "Verifica tu email para usar IA"
  Copy: "Enviamos un enlace de verificación a [email]. Revisa tu bandeja de entrada."
  CTA primario: "Reenviar email" → POST /auth/resend-verification
  CTA secundario: "Continuar sin IA" → cierra modal
  Feedback tras reenvío: "✉️ Email enviado. Revisa tu bandeja." (replace del botón, 3s)
  ```
- El usuario puede seguir usando el catálogo, el canvas, subir logos y hacer checkout sin verificar.
- Al verificar desde el inbox: el frontend llama POST /auth/refresh → JWT actualizado con `email_verified=true` → herramienta IA disponible sin recargar la página.

**Auth Gate Modal (al intentar IA sin verificar email):**
- Modal centrado, bg-white, rounded-2xl
- Título: "Desbloquea el diseño con IA"
- Copy: "Verifica tu email para usar las herramientas de generación con IA. Toma menos de un minuto."
- CTAs: "Reenviar email de verificación" (primario) + "Continuar sin IA" (secundario/ghost)

### 5.2 Estado Vacío del Catálogo [DECISIÓN TOMADA — 2026-05-12]

**Concepto de producto:** el cliente siempre trabaja con las prendas base disponibles en el taller y aplica su propio estilo. El catálogo está siempre sembrado (10 prendas base desde Story 2.1). El estado vacío solo ocurre si el workshop_admin desactivó todas las prendas manualmente — es una configuración incompleta, no el estado normal.

**Tratamiento UX:**
```
Ícono: Package (sin prendas) o similar neutro
Título: "Sin prendas disponibles"
Copy: "Este taller aún no ha configurado su catálogo. Contacta al administrador."
Sin CTA de compra — el cliente no puede avanzar sin prendas activas.
```
- Estado exclusivo para tenant con `TenantGarmentStatus` todo desactivado
- Si el tenant no tiene ningún registro en `TenantGarmentStatus`, aplica el default: todas las prendas activas (COALESCE true) → nunca estado vacío para talleres nuevos

### 5.3 Logo del Taller en Header [BAJO — Epic 3+]

El taller puede tener logo propio (Story 1.6 — configuración de marca). El header actualmente muestra el logo genérico de la plataforma. ¿Se reemplaza o se muestra junto al logo de la plataforma?

---

## 6. Keyboard Shortcuts (Editor)

| Acción | Shortcut |
|--------|----------|
| Deshacer | `Ctrl/Cmd + Z` |
| Rehacer | `Ctrl/Cmd + Shift + Z` |
| Duplicar capa | `Ctrl/Cmd + D` |
| Eliminar capa | `Delete` / `Backspace` |
| Deseleccionar | `Escape` |
| Mover capa 1px | `↑ ↓ ← →` |
| Mover capa 10px | `Shift + ↑ ↓ ← →` |

---

## 7. Responsividad

| Breakpoint | Comportamiento |
|------------|----------------|
| `< 640px` (mobile) | GarmentSelector: 2 columnas. Editor: LeftRail compacto. Columna única en Step 2. |
| `640–1024px` (tablet) | GarmentSelector: 3 columnas. "Cambiar prenda" visible en header. |
| `> 1024px` (desktop) | GarmentSelector: 4 columnas. Layout completo 2 columnas en Step 2. |

> ⚠️ **Nota:** El editor de canvas (`design` phase) no está optimizado para mobile en el prototipo. Dado que el PRD menciona uso en tablet para modo presencial, se requiere revisión del layout del editor para pantallas táctiles antes de Epic 3.

---

## 8. Decisiones Pendientes (Backlog de UX)

| ID | Decisión | Prioridad | Bloquea |
|----|----------|-----------|---------|
| UX-D1 | ~~Estado vacío del catálogo~~ | ✅ Resuelta | — |
| UX-D2 | ~~Login/Register como modal vs. página~~ | ✅ Modal — ver §5.1 | — |
| UX-D3 | ~~VerifyEmailBanner: posición y comportamiento~~ | ✅ On-demand en Auth Gate Modal — sin banner persistente | — |
| UX-D4 | Auth Gate Modal para herramientas IA | 🟡 Media | Epic 3 |
| UX-D5 | Imágenes reales de prendas en cards de catálogo (reemplazar emoji 👕) | 🟡 Media | Story 2.2 pulido |
| UX-D6 | Modo presencial — layout tablet del editor | 🟡 Media | Epic 4 |
| UX-D7 | Logo del taller en header vs. logo de plataforma | 🟢 Baja | Epic 3+ |
| UX-D8 | Página de historial de pedidos del cliente | 🟢 Baja | Epic 4 |
| UX-D9 | Portal del operario — cola de producción | 🟢 Baja | Epic 5 |

---

## 9. Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-05-12 | v1.0 — Creación inicial. Extraído de prototipo `src/frontend/`. Basado en retrospectiva Epic 1 (A1 blocker). |
