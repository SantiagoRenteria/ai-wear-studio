---
title: "Product Brief Distillate: AI Wear Studio"
type: llm-distillate
source: "product-brief-ai-wear-studio.md"
created: "2026-05-07"
purpose: "Token-efficient context for downstream PRD and architecture creation"
---

# Product Brief Distillate — AI Wear Studio

## Identidad del Producto

- **Qué es:** Plataforma web de personalización de prendas de vestir con dos portales diferenciados: Portal del Cliente (B2C, diseña la prenda) + Portal del Taller (B2B interno, gestiona producción).
- **Promesa central:** El diseño que el cliente aprueba en pantalla ES el archivo exacto que entra a producción. Cero reinterpretación manual entre diseño y máquina.
- **Diferenciador clave #1:** Único en el mercado que integra diseño asistido por IA + validador de producibilidad + gestión de taller en una sola plataforma.
- **Diferenciador clave #2:** Validador de calidad de impresión que alerta al cliente ANTES del pedido si el diseño tendrá problemas de contraste, tamaño de fuente o resolución de imagen — ningún competidor tiene esto.
- **Target geográfico:** Latinoamérica hispanohablante. Países soportados V1: CO, MX, US, AR, CL, PE.

---

## Contexto del Desarrollador

- **Equipo:** Desarrollador único (Santiago) + asistencia de IA. No hay equipo externo.
- **Implicación arquitectónica crítica:** La arquitectura de microservicios es el objetivo de diseño, pero el MVP debe implementarse como **monolito modular** (mismos bounded contexts y contratos de interfaz que microservicios, desplegado como una sola unidad). Esto elimina service discovery, message broker y distributed tracing del día uno. Los servicios se extraen cuando el volumen lo justifique.
- **Stack backend elegido:** C# + .NET 10. Decisión del desarrollador, no negociable para este proyecto.
- **Gestión de bases de datos locales:** Docker Compose desde el día uno, una DB por dominio aunque el backend sea monolito modular.
- **Frontend:** El desarrollador no es experto en frontend — se deja a criterio del arquitecto. Existe un prototipo en React 19 que puede servir de referencia o migrarse.

---

## Prototipo Existente — Activos Reutilizables

El proyecto tiene una SPA React 19 funcional con lógica de negocio ya implementada. La migración al stack con backend .NET 10 debe considerar estos activos:

### Lógica de negocio ya validada:
- **Catálogo de prendas:** 10 garments definidos (t-shirt, hoodie, polo, crewneck-sweatshirt, tank-top, long-sleeve, baseball-tee, raglan, v-neck, zip-hoodie) con colores específicos por tipo.
- **Sistema de zonas de impresión:** 23 combinaciones prenda+vista definidas como insets normalizados (0..1 fracciones del canvas). Zona máxima = 80% del área. Las zonas incluyen: frente, espalda, manga izquierda, manga derecha, pecho izquierdo, pecho derecho, cuello.
- **5 técnicas de impresión:** DTG (Direct-to-Garment), ScreenPrint (Serigrafía), Embroidery (Bordado), DTF (Direct-to-Film), HeatTransfer (Transfer de calor). Cada zona tiene técnica recomendada.
- **Vistas disponibles por prenda:** front (todas), back (la mayoría), left-sleeve / right-sleeve (hoodies, raglan, baseball-tee, long-sleeve), left-chest / right-chest (algunas).
- **Rate limiting de IA:** 10 generaciones gratuitas/día por dispositivo (fingerprint = user-agent + screen resolution + canvas hash). Bypass permanente al confirmar compra. Persistido en localStorage.
- **Validador de calidad WCAG:** Analiza capas antes de confirmar pedido — verifica contraste texto/prenda (ratio WCAG 2.1), tamaño efectivo de texto (mínimo ~12px físicos), escala de imagen (no > 100% para evitar pixelado).
- **Remoción de fondo:** Algoritmo BFS flood-fill local (tolerancia 38, feather 1 pasada) + fallback a Gemini para casos complejos (detección por uniformidad y luminancia del borde, threshold confidence > 0.65).
- **Try-on fotorrealista:** 4 estilos de modelo (casual-m, casual-f, streetwear, editorial) vía Gemini. Útil para reducir disputas post-entrega.
- **Sistema de referidos:** Código base36 de 6 chars derivado de fingerprint. Recompensa COP 20.000 al referidor + bono al comprador en primera compra. Attribution first-touch vía ?ref=CODE en URL.
- **Persistencia de sesiones:** Hasta 5 sesiones en localStorage, con undo/redo de 30 snapshots por sesión. Autosave con debounce 5000ms + flush en beforeunload.
- **Validación de direcciones:** Validación de formato por país (CO, MX, US, AR, CL, PE), sugerencias de ciudades por prefix, embed de mapa OpenStreetMap sin API key.

### Stack del prototipo (referencia para arquitectura frontend):
- React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4
- Zustand 5 para estado global, 30 snapshots de undo/redo
- Konva 10 + react-konva 19 para el canvas de diseño
- Motion (Framer Motion) para animaciones
- Lucide React para iconografía
- @google/genai v1.29.0 para Gemini API
- 30 Google Fonts disponibles en la herramienta de texto
- Paletas: STANDARD_COLORS (básicos), HOODIE_COLORS (colores específicos de hoodies), NEUTRAL_COLORS (blancos/grises/beige)

### Lo que NO migrar directamente:
- localStorage como persistencia — reemplazar por base de datos real con autenticación
- API key de Gemini en el bundle del cliente — mover a proxy backend
- Rate limiting por fingerprint de cliente — reemplazar por rate limiting en servidor con identidad de usuario autenticado
- Referidos basados en localStorage — migrar a modelo con tracking server-side

---

## Flujos de Usuario Detallados

### Flujo B2C (Cliente Externo)
1. Landing → Selecciona prenda del catálogo → Elige color y talla
2. Diseña: generación IA (prompt + estilo) | herramienta texto (fuente, tamaño, color, efectos) | carga imagen/logo (BG removal automático si se detecta fondo)
3. Cambia entre vistas (frente/espalda/mangas) y diseña en cada una
4. El validador de calidad corre en tiempo real — muestra warnings/errores antes de confirmar
5. Checkout: nombre, dirección (validada + autocompletado de ciudad), talla confirmada
6. Pago: manual en V1 (efectivo, transferencia u otro — acordado fuera del sistema). El sistema registra el pedido como "pendiente de pago".
7. Notificaciones de estado en tiempo real (recibido → en producción → listo → enviado)

### Flujo B2B Interno (Operario del Taller)
1. Login con rol operario/admin
2. Dashboard: cola de producción organizada por técnica de impresión y prioridad
3. Por pedido: ver diseño exacto aprobado + dimensiones de zona + técnica recomendada + talla + color de prenda en blanco
4. Actualizar estado: recibido → en producción → control de calidad → listo → enviado (dispara notificación al cliente en cada cambio)
5. Marcar como pagado (operario registra el pago manual recibido)
6. Admin: gestión de catálogo, usuarios, configuración del taller

### Flujo de Pedido de Equipo (B2B Cliente — V1 parcial, completo en V2)
- Sube CSV con nombres + tallas → obtiene mockups individuales
- Coordina pago en V1 manual (por fuera del sistema)
- El taller recibe los pedidos como N trabajos agrupados por equipo

---

## Modelo de Negocio — Detalles

- **Fase 1 MVP:** Un solo taller (operación propia del desarrollador). Sin monetización. Objetivo: validar flujo completo en condiciones reales.
- **Fase 2 SaaS:** Suscripción mensual por taller (Modelo A). Precio no definido aún — pendiente de validación con primeros clientes externos. Los créditos de IA (generaciones de imágenes) podrían ser add-on o incluidos en el plan.
- **Fase 3 Plataforma:** Red de talleres socios + marketplace de diseñadores (comisión por venta) + API embebible para marcas/influencers.
- **Monetización de IA:** En SaaS, considerar pool de créditos de generación de imagen por taller (ej. 500/mes incluidos, luego por consumo). Esto convierte el costo variable de Gemini API en un ingreso predecible.

---

## Inteligencia Competitiva

| Competidor | Fortaleza | Por qué no resuelve el problema |
|------------|-----------|--------------------------------|
| Printful / Printify | Dropshipping a escala global | No tienen portal de taller físico propio; no diseñado para operación local |
| DecoNetwork | Gestión de producción B2B robusta | Sin diseño asistido por IA; flujo de diseño es de 2015 |
| Printavo | Gestión de órdenes para talleres | Sin herramienta de diseño integrada; el cliente sigue mandando archivos por email |
| ImprintNext | Configurador de producto + recomendación de técnica | Limitado, en inglés, sin IA generativa, sin portal de taller unificado |
| Canva Custom Merch | IA generativa reciente | No tiene portal de taller; no cierra el flujo hasta producción; no para talleres propios |
| Gelato | POD global con red de impresores | Dropshipping; sin personalización para taller físico propio; sin LATAM nativo |

**Gap validado:** Ningún competidor cierra el flujo completo diseño asistido por IA → validación de producibilidad → gestión de cola de producción en una sola plataforma para taller físico propio.

---

## Decisiones de Arquitectura y Constraintss Técnicos

- **Backend:** C# + .NET 10. Monolito modular para MVP, microservicios cuando el volumen lo justifique.
- **Bounded contexts objetivo (para cuando se extraigan como servicios):**
  - `Catalog`: prendas, colores, zonas de impresión, técnicas
  - `DesignEngine`: assets, capas, composición del canvas, validación de calidad, exportación
  - `Orders`: ciclo de vida del pedido, estados, historial
  - `ProductionQueue`: cola de jobs por técnica, asignación, seguimiento
  - `Notifications`: email/SMS/push, plantillas, eventos de estado
  - `Users`: autenticación, roles (cliente externo, operario, admin taller), perfiles
- **Bases de datos:** PostgreSQL por dominio. Blob storage (S3-compatible) para imágenes generadas y assets de diseño. Gestionadas con Docker Compose en desarrollo.
- **API Gateway:** Enrutamiento B2C / B2B Interno. CORS, rate limiting, auth forwarding.
- **Integración IA:** Google Gemini API. Modelos en orden de preferencia: gemini-2.5-flash-image-preview → gemini-2.0-flash-preview-image-generation → gemini-2.0-flash-exp-image-generation → gemini-2.5-flash-image. Retry strategy: 1 retry ante rate limit, 10s delay. El costo de la API es variable — necesita cuantificarse para el pricing del SaaS.
- **Frontend:** A criterio del arquitecto. Prototipo en React 19 + Konva existe como referencia. El canvas de diseño con Konva (o similar) es el componente más complejo y debe evaluarse si se reusa o se reimplementa.
- **Autenticación:** Cuentas separadas: clientes externos (registro público) + cuentas internas con roles (invitación por admin). JWT probable.
- **Despliegue:** Cloud-native para producción. Provider no definido (AWS / Azure / GCP — pendiente).

---

## Alcance Explícito — In / Out / Pendiente V1

| Feature | V1 | Razón |
|---------|-----|-------|
| Portal cliente — diseño IA + texto + imagen | ✅ IN | Core del producto |
| Portal cliente — previsualización multi-vista | ✅ IN | Necesario para el flujo |
| Portal cliente — checkout con validación de dirección | ✅ IN | Necesario para confirmar pedido |
| Portal taller — cola de producción | ✅ IN | Core del producto |
| Portal taller — gestión de estados | ✅ IN | Core del producto |
| Autenticación con roles | ✅ IN | Seguridad básica necesaria |
| Notificaciones al cliente (cambio de estado) | ✅ IN | Parte del flujo completo |
| Validador de calidad de impresión | ✅ IN | Diferenciador clave, ya implementado en prototipo |
| Remoción de fondo de imágenes | ✅ IN | Ya implementado en prototipo |
| Try-on fotorrealista | ✅ IN | Ya implementado, reduce disputas |
| Pago manual (efectivo/transferencia) | ✅ IN (manual) | MVP de operación propia |
| Gateway de pagos integrado | ❌ OUT → V2 | Solo necesario para SaaS multi-taller |
| Modo equipos / roster CSV | ⚠️ PARCIAL V1 | Pedido básico; split payment en V2 |
| App móvil nativa | ❌ OUT | No prioritario para MVP |
| Marketplace de diseñadores | ❌ OUT → V2/V3 | Requiere masa crítica de talleres |
| Inventario de prendas en blanco | ❌ OUT | Complejidad sin retorno claro en MVP |
| B2B corporativo multi-step approval | ❌ OUT → V2 | Complejidad de flujo demasiado alta para MVP |
| SSR / SEO | ❌ OUT → V2 | No prioritario para taller propio |
| Tracking de carriers | ❌ OUT → V2 | Sin integración de carriers en V1 |
| Moderación automática de contenido IA | ⚠️ PENDIENTE PRE-LAUNCH | Riesgo legal — debe implementarse antes de lanzamiento público |
| Referidos | ⚠️ PARCIAL V1 | Ya implementado en prototipo; migrar a backend |
| Programa de puntos | ❌ OUT → V2 | |
| Carrito abandonado | ❌ OUT → V2 | |

---

## Ideas Rechazadas Durante Discovery

- **5 microservicios independientes desde el día uno:** Rechazado para MVP. Justificación: un solo desarrollador no puede gestionar la complejidad operacional (service discovery, message broker, distributed tracing, deployment multi-contenedor) mientras construye el producto. El monolito modular es el camino correcto con visión de microservicios.
- **Integración de gateway de pagos en V1:** Rechazado explícitamente. El MVP es operación propia; el pago manual (efectivo/transferencia) es suficiente y elimina complejidad de integración, PCI compliance y flujos de error de pago.
- **Aplicación móvil nativa desde V1:** Rechazada. La web responsive es suficiente para el MVP; la app es para cuando haya base de usuarios validada.
- **Fingerprinting de cliente para rate limiting en producción:** El prototipo usa fingerprint de navegador (UA + screen + canvas hash). En el backend real, el rate limiting debe estar atado a la identidad autenticada del usuario, no al dispositivo.

---

## Preguntas Abiertas para PRD / Arquitectura

1. **Cloud provider:** ¿AWS, Azure o GCP para producción? Afecta el servicio de blob storage, el modelo de deployment y el costo.
2. **Precio del plan SaaS:** ¿Cuánto cuesta la suscripción mensual por taller? Necesita validación con primeros clientes en Fase 2.
3. **Pool de créditos IA por taller:** ¿Incluidos en el plan base o add-on? El costo de Gemini API es variable y debe cuantificarse.
4. **Frontend stack definitivo:** ¿El arquitecto recomienda migrar el prototipo React 19 + Konva al nuevo stack, o reescribir el frontend desde cero con el backend .NET 10?
5. **Moderación de contenido generado por IA:** ¿Cuándo se implementa y con qué mecanismo? (filtros de Gemini + review manual + lista de términos prohibidos)
6. **Estrategia de autenticación:** ¿Identity server propio (Keycloak / Auth0) o implementación custom en .NET con JWT?
7. **Notificaciones:** ¿Email (SendGrid/Resend), SMS (Twilio) o ambos? ¿En qué canal se notifica primero en LATAM?
8. **Multi-tenancy en Fase 2:** ¿Un schema por taller o row-level tenancy en tablas compartidas? Afecta el modelo de datos desde V1.

---

*Distillate generado por bmad-product-brief Stage 5 — contiene overflow de contexto no incluido en el executive brief. Usar como input para PRD creation.*
