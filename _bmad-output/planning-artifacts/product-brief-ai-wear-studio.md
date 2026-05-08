---
title: "Product Brief: AI Wear Studio"
status: "complete"
created: "2026-05-07"
updated: "2026-05-07"
inputs:
  - "docs/project-overview.md"
  - "docs/architecture.md"
  - "docs/data-models.md"
  - "PLAN_DE_TRABAJO_V2.md"
  - "Investigación competitiva: Printful, Printify, CustomInk, DecoNetwork, Printavo, ImprintNext, Canva Custom Merch"
  - "Análisis de mercado: Print-on-Demand $12.96B (2025), CAGR 24.81%"
---

# Product Brief: AI Wear Studio

## Resumen Ejecutivo

Los puntos de venta de estampado y personalización de ropa operan hoy con herramientas fragmentadas: el cliente llega con una foto en el celular, el operario la interpreta a mano, el diseño se aprueba por WhatsApp, y los errores de producción se absorben como costo de operación. No existe un canal unificado donde el cliente diseñe con precisión y el taller reciba exactamente lo que debe producir.

AI Wear Studio es la plataforma que cierra esa brecha. Un sistema de dos portales sobre un backend de microservicios en .NET 10: el **Portal del Cliente** permite diseñar prendas personalizadas con asistencia de IA generativa, texto, imágenes y logos; el **Portal del Taller** convierte cada diseño aprobado en una orden de producción estructurada, con técnica de impresión asignada, cola de trabajo y seguimiento de estado en tiempo real.

El momento es ahora: el mercado global de impresión bajo demanda crece a 24.81% anual (US$12.96B en 2025, proyectado a US$102B en 2035), la IA en moda alcanza 40% de crecimiento interanual, y ningún competidor ha integrado de forma nativa el flujo completo: diseño asistido por IA + gestión de producción B2B en una sola plataforma.

---

## El Problema

**Para el cliente externo:** Hoy, pedir una camiseta personalizada implica describir verbalmente un diseño, esperar un boceto, aprobar por imagen comprimida de WhatsApp, y rezar porque el resultado final coincida con la idea original. El proceso es lento, propenso a malentendidos y genera frustración cuando la prenda llega diferente a lo imaginado.

**Para el operario del taller:** Cada pedido llega por un canal diferente (WhatsApp, llamada, presencial). No hay sistema de cola de producción. La técnica de impresión se decide ad-hoc. El control de calidad es manual. Cuando hay volumen alto —uniformes de equipo, pedidos corporativos— la coordinación se vuelve caótica y los errores cuestan dinero.

**El costo del status quo:** Reimpresiones no facturadas, tiempo de diseño duplicado, clientes insatisfechos que no regresan, y operarios que dedican horas a coordinación en lugar de producción. Las plataformas existentes no resuelven esto: Printful y Printify están optimizadas para dropshipping, no para tallers propios. DecoNetwork y Printavo son poderosas en producción pero no tienen diseño asistido por IA. Nadie ha construido el puente.

---

## La Solución

AI Wear Studio es una plataforma web con dos flujos diferenciados que comparten un núcleo de datos común:

**Portal del Cliente (B2C):**
El cliente selecciona la prenda, elige color y talla, y diseña usando tres herramientas: generación de imagen con IA (describe "un tigre en estilo acuarela" y la IA lo crea), herramienta de texto con efectos tipográficos, y carga de logos/imágenes propias con remoción automática de fondo. Las zonas de impresión son dinámicas por prenda y vista (frente, espalda, mangas), y el sistema sugiere la técnica de impresión óptima (DTG, serigrafía, bordado, sublimación) basándose en el diseño. Al confirmar, el pedido entra directamente al sistema del taller, con mockup de alta resolución, especificaciones técnicas y datos de envío validados.

**Portal del Taller (B2B Interno):**
Los operarios reciben los pedidos en una cola de producción organizada por técnica, prioridad y estado. Cada trabajo muestra el diseño exacto aprobado por el cliente, las dimensiones de la zona de impresión, la técnica recomendada, la talla y el color de la prenda en blanco. El sistema gestiona el flujo de trabajo completo: recibido → en producción → control de calidad → listo → enviado, con notificaciones automáticas al cliente en cada etapa.

**Arquitectura técnica:**
Backend en **C# + .NET 10** con arquitectura de microservicios como objetivo de diseño, cada dominio con su propia base de datos gestionada vía **Docker Compose** en desarrollo. Exposición mediante API Gateway con enrutamiento B2C / B2B. Despliegue cloud-native para producción.

> **Nota de implementación para desarrollador único:** La arquitectura de microservicios es el target de diseño correcto a largo plazo. Para el MVP de operación propia, se recomienda un **monolito modular** — el código está organizado internamente como si fueran microservicios (mismos bounded contexts, mismas interfaces) pero desplegado como una sola unidad. Esto reduce drásticamente la complejidad operacional inicial (sin service discovery, sin message broker, sin distributed tracing) mientras preserva la estructura para extraer servicios individuales cuando el volumen lo justifique. Docker Compose gestiona las bases de datos de todos modos desde el día uno.

---

## Lo Que Nos Diferencia

La promesa central de la plataforma no es "unir diseño con producción" — es más precisa que eso: **el archivo que el cliente aprueba en pantalla es exactamente el archivo que entra a la máquina de producción**. No hay interpretación manual, no hay rediseño, no hay margen para el error humano entre la idea y la prenda.

| Dimensión | AI Wear Studio | Competidores |
|-----------|---------------|--------------|
| Diseño con IA generativa | ✅ Integrado nativamente | Canva (reciente, no para talleres propios) |
| Gestión de producción B2B | ✅ Portal de taller unificado | DecoNetwork, Printavo (sin diseño IA) |
| Flujo unificado diseño → producción | ✅ El diseño aprobado ES el archivo de producción | ❌ Nadie ofrece esta garantía end-to-end |
| Validador de calidad de impresión | ✅ Alerta antes del pedido si el diseño no imprimirá bien | ❌ Ninguno — el error se descubre en producción |
| Recomendación de técnica de impresión | ✅ Por IA según diseño y cantidad | Solo ImprintNext (limitado, en inglés) |
| Para taller propio (no dropshipping) | ✅ Diseñado para operación física propia | Printful/Printify son dropshipping |
| Mercado LATAM nativo | ✅ Español, CO/MX/AR/CL/PE/US, direcciones validadas | ❌ Inglés-first, USD-first |

La ventaja defensible no es la tecnología en sí — es la combinación de diseño asistido por IA + validación de producibilidad + gestión de taller en una sola plataforma, diseñada desde el principio para la operación de un taller físico real en el mercado hispanohablante.

---

## Modelo de Negocio

**Fase 1 — Operación propia (MVP):** La plataforma se despliega inicialmente en un taller propio. Sin cargo externo. El objetivo es validar el flujo completo (diseño → producción → entrega) en condiciones reales antes de cualquier comercialización.

**Fase 2 — SaaS por taller:** Una vez validado el MVP propio, se comercializa bajo modelo de suscripción mensual por taller (Modelo A). Cada taller paga una tarifa fija por acceso al portal del operario y al conjunto de features de producción; el portal del cliente es el canal de venta del taller. Los créditos de IA para generación de imágenes pueden operar como add-on o incluidos en el plan base (por definir en pricing).

**Fase 3 — Plataforma LATAM:** Red de talleres socios con marketplace de diseñadores y API embebible para marcas.

---

## A Quiénes Sirve

**Cliente externo (B2C):**
Persona entre 18-45 años que quiere una prenda única para uso personal, regalo, o evento. No tiene conocimientos de diseño gráfico. Su frustración hoy: el proceso es engorroso y el resultado impredecible. Su "aha moment": ver el mockup fotorrealista de su diseño en la prenda y poder pedirla con un clic.

**Equipo o empresa (B2B cliente):**
Capitán de equipo deportivo, coordinador de evento corporativo, responsable de merchandising de marca. Necesita 10-200 prendas con el mismo diseño pero diferentes tallas y nombres. Su frustración: coordinar cantidades, tallas y pagos por WhatsApp. Su "aha moment": el modo de roster donde sube un CSV y obtiene mockups individuales para cada persona.

> **Segmento de alta frecuencia:** Los equipos deportivos aficionados son el segmento de mayor recurrencia natural — uniformes al inicio de temporada, camisetas de torneo, celebraciones. Un solo equipo que compra 2-3 veces al año vale más que múltiples clientes individuales ocasionales.

**Operario del taller (B2B interno):**
Persona en el punto de venta responsable de recibir, producir y entregar los pedidos. Su frustración hoy: información fragmentada, sin sistema de cola, errores por interpretación manual del diseño. Su "aha moment": ver la cola de producción organizada, con la imagen exacta a imprimir, las dimensiones de zona, y el estado actualizable en tiempo real.

---

## Criterios de Éxito

**Métricas de usuario:**
- Tiempo desde inicio del diseño hasta pedido confirmado: < 10 minutos para el 80% de los pedidos
- Tasa de reimpresión por error de diseño: < 2% (vs. estimado actual > 10%)
- NPS del cliente externo: ≥ 50 al mes 6

**Métricas de negocio (Fase 1 — operación propia):**
- Pedidos procesados por operario/día: +40% vs. flujo manual actual
- Ticket promedio: incremento por diseños complejos y pedidos en volumen
- Tasa de recompra a 90 días: > 30%

**Métricas de negocio (Fase 2 — SaaS):**
- Tiempo de onboarding de un nuevo taller: < 1 día de setup
- Retención mensual de talleres suscriptores: > 85%

**Métricas técnicas:**
- Tiempo de generación de imagen IA: < 15 segundos P95
- Disponibilidad del portal: > 99.5% (requiere definir infraestructura cloud antes de comprometer este SLA)
- Time-to-first-order para nuevo cliente: < 5 minutos
- Tasa de pedidos rechazados por validador de calidad antes de producción: seguimiento mensual (objetivo: cero reimpresiones por error de diseño prevenible)

---

## Alcance

### V1 — Plataforma Funcional

**Incluido:**
- Portal del cliente: selección de prenda, herramientas de diseño (IA + texto + imagen), previsualización multi-vista, checkout con validación de dirección
- Portal del taller: cola de producción, gestión de estados de pedido, vista de diseño aprobado por pedido, notificaciones al cliente
- Autenticación: cuentas de cliente externo + cuentas internas con roles (operario, admin del taller)
- Backend microservicios .NET 10: Servicio de Catálogo, Motor de Diseño, Gestión de Pedidos, Cola de Producción, Servicio de Notificaciones
- Bases de datos independientes por servicio vía Docker Compose
- API Gateway para enrutamiento B2C / B2B
- Integración con Google Gemini API para generación de imágenes

**Explícitamente fuera del V1:**
- Integración con gateway de pagos — **el pago es manual**: efectivo, transferencia bancaria u otro método acordado entre cliente y taller. El operario marca el pedido como pagado en el sistema. Esta decisión es deliberada para el MVP de operación propia; la integración con pasarela de pagos se incluirá en V2 para la fase SaaS.
- Aplicación móvil nativa
- Marketplace de diseñadores externos
- Gestión de inventario de prendas en blanco
- Módulo de B2B corporativo con aprobación de diseño multi-step
- SSR/SEO para posicionamiento orgánico
- Integración con carriers para tracking automatizado
- Moderación automática de contenido generado por IA (*nota: requerirá implementación antes del lanzamiento público para gestionar riesgo legal*)

### V2 — Expansión Comercial
Pagos integrados, modo de equipos con split payment, rastreo de pedido en tiempo real, programa de puntos y referidos, carrito abandonado, y marketplace de diseñadores.

---

## Dominio de Microservicios (Referencia para Arquitectura)

```
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│              (Routing B2C / B2B Interno)                │
└───────┬──────────────────────────────┬──────────────────┘
        │                              │
   Portal Cliente               Portal Taller
        │                              │
┌───────▼──────────────────────────────▼──────────────────┐
│                    Microservicios                         │
│                                                           │
│  [Catálogo]   [Motor de Diseño]   [Gestión de Pedidos]  │
│  Prendas,     IA generativa,      Ciclo de vida del     │
│  colores,     assets, mockups,    pedido, estados,      │
│  zonas        zonas de impresión  historial             │
│                                                           │
│  [Cola de Producción]   [Notificaciones]   [Usuarios]   │
│  Jobs por técnica,      Email/SMS/push,    Auth, roles,  │
│  estados, asignación    eventos de estado  perfiles      │
└───────────────────────────────────────────────────────────┘
        │              │              │
   [DB Catálogo]  [DB Diseños]  [DB Pedidos]  ...
   (PostgreSQL)   (PostgreSQL   (PostgreSQL)
                  + blob storage)
```

---

## Visión a 2-3 Años

AI Wear Studio se convierte en la **plataforma de referencia para talleres de personalización textil en Latinoamérica**. Los talleres no solo usan el software: son socios de producción que reciben pedidos de clientes que no están físicamente en su ciudad, formando una red distribuida de producción regional con entrega rápida.

El modelo evoluciona en tres capas:
1. **SaaS para talleres**: licencia mensual por taller con portal B2B completo
2. **Marketplace de diseñadores**: creadores publican diseños y reciben comisión en cada venta
3. **API embebible**: influencers y marcas integran el editor en sus propios sitios con su branding

La plataforma se diferencia por su profundidad en el flujo de producción — no es otro generador de mockups, es el sistema operativo del taller de personalización textil del siglo XXI.
