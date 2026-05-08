---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish"]
releaseMode: phased
classification:
  projectType: "saas_b2b"
  domain: "e-commerce / personalización textil"
  complexity: "medium"
  projectContext: "brownfield"
inputDocuments:
  - "_bmad-output/planning-artifacts/product-brief-ai-wear-studio.md"
  - "_bmad-output/planning-artifacts/product-brief-ai-wear-studio-distillate.md"
  - "docs/index.md"
  - "docs/project-overview.md"
  - "docs/architecture.md"
  - "docs/data-models.md"
  - "docs/component-inventory.md"
  - "docs/api-contracts.md"
  - "docs/development-guide.md"
  - "docs/source-tree-analysis.md"
workflowType: 'prd'
briefCount: 2
researchCount: 0
brainstormingCount: 0
projectDocsCount: 8
---

# Product Requirements Document - AI Wear Studio

**Author:** Santiago
**Date:** 2026-05-07

## Executive Summary

AI Wear Studio es una plataforma web de personalización de prendas de vestir que elimina la brecha entre lo que el cliente imagina y lo que el taller produce. Está compuesta por dos portales sobre un backend compartido: el **Portal del Cliente** (B2C) permite a cualquier persona — sin conocimientos de diseño — crear prendas personalizadas usando IA generativa, herramientas de texto e imágenes propias; el **Portal del Taller** (B2B interno) convierte cada diseño aprobado en una orden de producción estructurada con técnica asignada, cola de trabajo y seguimiento en tiempo real.

La promesa central es técnica y operativa a la vez: **el archivo que el cliente aprueba en pantalla es exactamente el archivo que entra a la máquina de producción**. No hay reinterpretación manual, no hay rediseño, no hay margen para error entre la idea y la prenda. Esto se hace posible por un canvas de diseño 100% local (sin latencia durante la edición), un validador de calidad que alerta sobre problemas de impresión antes de confirmar el pedido, y un submit atómico que transfiere el snapshot inmutable del diseño directamente a la cola de producción del taller.

El producto sirve a tres usuarios con igual peso: el **cliente externo** que quiere diseñar sin fricción y recibir exactamente lo que vio en pantalla; el **equipo o empresa** que necesita coordinar pedidos en volumen sin caos de WhatsApp; y el **operario del taller** en punto físico, que necesita trabajar más rápido y con mayor precisión en cada pedido, sin interpretaciones ni llamadas de aclaración.

El mercado de impresión bajo demanda crece al 24.81% anual (US$12.96B en 2025, proyectado a US$102B en 2035) y ningún competidor ha integrado nativamente el flujo completo: diseño asistido por IA + validación de producibilidad + gestión de taller en una sola plataforma para el mercado hispanohablante. AI Wear Studio cierra ese gap.

### Lo que hace especial a este producto

**1. Facilidad radical para no diseñadores.** El frontend es el corazón del producto — debe ser tan intuitivo que un cliente parado frente a una pantalla en un punto físico diseñe su prenda en minutos, sin aprendizaje previo. La IA generativa (Gemini) elimina la barrera del talento artístico: describes, y el sistema crea.

**2. Validador de calidad antes del pedido.** El sistema detecta en tiempo real si el diseño tendrá problemas de contraste texto/prenda, tamaño de fuente insuficiente o baja resolución de imagen — antes de que el cliente confirme. Ningún competidor ofrece esta garantía. El error se previene, no se absorbe como costo de reimpresión.

**3. Portal del taller como ciudadano de primera clase.** La cola de producción organizada por técnica, prioridad y estado es tan importante como el portal del cliente. El operario recibe el diseño exacto, las dimensiones de zona de impresión, la técnica recomendada y el estado actualizable — eliminando toda coordinación manual y reduciendo errores a cero.

**4. Arquitectura adaptable y abierta.** Frontend desacoplado del backend vía contrato OpenAPI — cada portal evoluciona de forma independiente según las condiciones del mercado. Monolito modular con bounded contexts definidos desde el día uno, diseñado para integrarse ágilmente con herramientas externas (pagos, carriers, ERPs) cuando el negocio lo demande.

**5. Diseñado para LATAM desde el origen.** Español nativo, soporte de direcciones en CO/MX/US/AR/CL/PE, operación para taller físico propio — no adaptado desde una plataforma anglosajona de dropshipping.

## Clasificación del Proyecto

- **Tipo:** Plataforma SaaS B2B/B2C (web app)
- **Dominio:** E-commerce / personalización textil
- **Complejidad:** Media — integración de IA generativa + canvas de diseño + flujo de producción + multi-tenancy en roadmap
- **Contexto:** Brownfield — prototipo React 19 funcional con lógica de negocio validada (canvas Konva, 23 zonas de impresión, 5 técnicas, validador WCAG, try-on fotorrealista). La nueva plataforma agrega backend .NET 10, autenticación real, bases de datos persistentes y portal de taller.
- **Fase actual:** MVP operación propia (1 taller) → SaaS multi-tenant (año 2+)

## Success Criteria

### User Success

- **Diseño sin fricción:** El 80% de los pedidos completan el flujo diseño → confirmación en menos de 10 minutos. Medido desde el primer clic en "diseñar" hasta el submit exitoso del pedido.
- **Cero sorpresas en producción:** Tasa de reimpresión por error de diseño < 2%. El validador de calidad intercepta los problemas antes de que lleguen al taller.
- **El cliente recibe lo que vio:** NPS del cliente externo ≥ 50 al mes 6 de operación. Medido vía encuesta automática post-entrega.
- **Adopción en punto físico:** Un cliente sin instrucciones previas completa su primer diseño en el punto físico en < 7 minutos sin asistencia del operario.

### Business Success

**Fase 1 — MVP (operación propia, 1 taller):**
- Pedidos procesados por operario/día: +40% vs. el flujo manual actual. *Baseline: establecer en las primeras 2 semanas de operación real antes de activar el sistema.*
- Tasa de recompra a 90 días: > 30% de clientes con al menos un segundo pedido.
- Ticket promedio: incremento medible respecto al promedio del taller pre-plataforma, impulsado por diseños complejos y pedidos en volumen.
- Tiempo de entrega percibido por el cliente: reducción ≥ 20% respecto al flujo anterior (menos idas y vueltas de aprobación).

**Fase 2 — SaaS (multi-taller):**
- Tiempo de onboarding de un nuevo taller: < 1 día de setup completo (catálogo configurado, primer operario activo).
- Retención mensual de talleres suscriptores: > 85%.
- Costo de adquisición de taller (CAC): a definir en Fase 2 según canal de venta.

### Technical Success

- Generación de imagen con IA (Gemini): < 15 segundos P95 bajo carga normal (< 30 s P99; hard timeout 45 s — ver NFR-PERF-01b).
- Disponibilidad del portal: > 99.0% en Fase 1 (operación propia), > 99.5% en Fase 2 (SaaS comercial). Targets por fase alineados con NFR-REL-01.
- Time-to-first-order para nuevo cliente: < 5 minutos desde registro hasta pedido confirmado.
- Submit atómico sin pérdida de datos: 0 pedidos perdidos por error de transacción entre `Orders`, `DesignEngine` y `ProductionQueue`.
- Tasa de alertas del validador de calidad que previenen reimpresiones: seguimiento mensual desde el día 1 — objetivo a largo plazo: 0 reimpresiones por errores prevenibles.

### Measurable Outcomes

| Métrica | Target | Cuándo medir | Baseline |
|---------|--------|--------------|----------|
| Tiempo diseño → pedido | < 10 min (80%) | Desde día 1 | A establecer en semana 1 |
| Tasa de reimpresión | < 2% | Mensual | A establecer en semana 1 |
| NPS cliente externo | ≥ 50 | Mes 6 | — |
| Pedidos/operario/día | +40% | Mensual | A establecer en semana 1 |
| Recompra 90 días | > 30% | Mes 3 | — |
| Onboarding nuevo taller | < 1 día | Fase 2 | — |
| Retención talleres SaaS | > 85% mensual | Fase 2 | — |
| Latencia IA P95 | < 15 seg | Continuo | — |
| Disponibilidad portal | > 99.5% | Continuo | — |

## Product Scope

### MVP — Mínimo Viable

**Portal del Cliente (B2C):**
- Selección de prenda, color y talla del catálogo (10 prendas, paletas por tipo)
- Canvas de diseño local: generación de imagen con IA (Gemini), herramienta de texto, carga de imagen/logo con remoción de fondo
- Diseño multi-vista (frente, espalda, mangas según prenda)
- Validador de calidad en tiempo real (contraste, resolución, tamaño de fuente)
- Try-on fotorrealista (4 estilos de modelo vía Gemini)
- Checkout con validación de dirección (CO, MX, US, AR, CL, PE)
- Pago manual — el pedido queda en estado "pendiente de pago" al confirmarse; el operario registra el pago al recibirlo
- Notificaciones de estado al cliente en cada transición de la cola

**Portal del Taller (B2B interno):**
- Cola de producción organizada por técnica de impresión y prioridad
- Vista de pedido: diseño exacto aprobado + dimensiones de zona + técnica recomendada + talla + color
- Gestión de estados: recibido → en producción → control de calidad → listo → enviado
- Marcar pedido como pagado (registro manual de pago)
- Roles: operario (gestión de cola) y admin (gestión de catálogo, usuarios y configuración)

**Backend:**
- Monolito modular .NET 10 — bounded contexts: `Catalog`, `DesignEngine`, `Orders`, `ProductionQueue`, `Notifications`, `Users`
- Autenticación JWT — cuentas de cliente externo (registro público) + cuentas internas con roles (invitación por admin)
- `tenant_id` en schema desde el día uno
- PostgreSQL schemas separados por módulo — Docker Compose en desarrollo
- Contrato OpenAPI como fuente de verdad para el frontend

### Growth Features (Post-MVP — Fase 2)

- Gateway de pagos integrado (PSP a definir para LATAM)
- Modo de equipos: carga de roster CSV con mockups individuales por persona
- Programa de referidos (migración del sistema del prototipo a backend real)
- Carrito abandonado y recuperación
- SSR / SEO para posicionamiento orgánico
- Multi-tenancy activa: onboarding de talleres externos, billing, dashboard de administración SaaS
- Tracking de carriers integrado
- Moderación automática de contenido generado por IA

### Vision (Año 3+)

- Red de talleres socios en LATAM con marketplace de producción regional
- Marketplace de diseñadores: creadores publican diseños y reciben comisión por venta
- API embebible para marcas e influencers (editor de prendas con branding propio)
- Integración con ERPs y sistemas de inventario de talleres

## User Journeys

### Journey 1 — Andrés (Operario del taller) / Venta asistida en punto físico ⭐ *Journey primario del MVP*

**Escena inicial:** Son las 11am. Un cliente entra al local — quiere una camiseta con el logo de su empresa para el lanzamiento del jueves. No tiene cuenta, viene sin nada preparado. Andrés, operario del taller, toma la tablet del mostrador. Tiene su cuenta propia — rol operario.

**Rising action:** Andrés abre el sistema en la tablet. Selecciona camiseta blanca tipo polo, talla L. El cliente describe el logo: "es un círculo rojo con las letras MW en blanco". Andrés usa el generador de IA con ese prompt — en 12 segundos aparece algo cercano. El cliente lo ve en la pantalla y pide "más gruesas las letras". Andrés ajusta con la herramienta de texto, superpone el resultado sobre la imagen IA. El validador confirma que el contraste es bueno. Andrés gira la tablet hacia el cliente: "¿Así queda?". El cliente asiente. Andrés confirma la aprobación en el sistema — un tap de "Cliente aprobó el diseño".

**Clímax:** Andrés ingresa el nombre y teléfono del cliente (mínimo requerido — sin cuenta obligatoria). Selecciona "pago en local". Confirma el pedido. El sistema lo encola automáticamente en la cola de producción con prioridad "urgente" (fecha de entrega: jueves). El cliente recibe un SMS: *"Tu pedido está registrado. Te avisamos cuando esté listo."*

**Resolución:** Andrés pasa al siguiente cliente. El pedido ya está en la cola de Lucía con el diseño exacto, sin ninguna comunicación adicional entre ellos. El cliente recibe SMS de avance en cada fase. Jueves a las 10am: "Tu prenda está lista para recoger." El cliente llega, recoge, paga. Andrés marca "Entregado y pagado". El cliente pregunta si puede pedir más para el resto del equipo — Andrés le muestra la opción de crear cuenta para hacerlo desde casa.

**Capacidades reveladas:** UI optimizada para tablet (una mano, de pie), sesión de operario separada del cliente, flujo de venta asistida, aprobación explícita del cliente registrada en el sistema, pedido sin cuenta de cliente (nombre + teléfono), prioridad de pedido (urgente/normal), SMS como canal primario de notificación.

---

### Journey 2 — Valentina, 27 años / Cliente B2C online *(journey secundario, estratégicamente importante)*

**Escena inicial:** Valentina quiere regalarle una camiseta personalizada a su mejor amiga. Busca en Google, encuentra AI Wear Studio. Nunca ha usado Photoshop ni Canva. Su experiencia previa: envió una foto por WhatsApp y recibió algo irreconocible.

**Rising action:** Se registra en 2 minutos. Selecciona camiseta oversize negra. Escribe: *"un ramo de flores silvestres en acuarela, colores pastel"*. En 12 segundos tiene una imagen. La centra en el pecho. Agrega el nombre de su amiga en tipografía delicada. El validador detecta bajo contraste texto/tela — lo cambia a blanco. Ve el try-on sobre una modelo editorial. Se emociona. Cierra la pestaña sin confirmar — al volver, el diseño sigue ahí (autoguardado local en Zustand).

**Clímax:** Hace checkout con su dirección en Bogotá. El sistema la valida y autocompleta el barrio. Confirma talla M. Submit. El sistema genera el snapshot del diseño y lo envía al taller como pedido. Valentina recibe email de confirmación con el mockup aprobado adjunto — el archivo exacto que entró a producción.

**Resolución:** Notificaciones por email en cada fase. Al día siguiente: "Tu prenda está lista para recoger." La prenda es exactamente lo que vio en pantalla. Le manda el link a tres amigas.

**Capacidades reveladas:** Registro público, generador IA, herramienta de texto, validador de calidad, try-on, autoguardado local, checkout con validación de dirección, email como canal de notificación, mockup aprobado adjunto en confirmación.

---

### Journey 3 — Lucía, 29 años / Operaria de producción

**Escena inicial:** 9am. Lucía gestiona la cola de producción. Antes: WhatsApp, archivos sueltos, pedidos sin orden. Hoy: abre el Portal del Taller, ve 9 pedidos del día organizados por técnica.

**Rising action:** Empieza por los 4 DTG. Hace clic en el primero: camiseta gris, imagen exacta, dimensiones en cm, técnica confirmada, talla L. Sin ambigüedad. Cambia a "En producción". Imprime. Control de calidad visual — coincide con el mockup. Cambia a "Listo para recoger".

**Clímax:** Notificación automática al cliente. Lucía no envió ningún mensaje. En la tarde el cliente llega, Lucía marca "Entregado y Pagado". Procesó 11 pedidos hoy sin una sola llamada de aclaración.

**Resolución:** Cero reimpresiones. Cero interpretación manual del diseño. El throughput del taller subió sin contratar a nadie más.

**Capacidades reveladas:** Cola por técnica y prioridad, vista de pedido con diseño exacto + dimensiones, gestión de estados, notificación automática al cliente, registro de entrega y pago.

---

### Journey 4 — Rodrigo, 41 años / Admin del taller

**Escena inicial:** Rodrigo acaba de onboardear la plataforma. Configura el catálogo según su inventario real, crea cuentas para sus 2 operarios.

**Rising action:** Desactiva 2 prendas sin stock. Ajusta colores disponibles por prenda. Crea cuentas de Andrés y Lucía con rol "operario". A las 3pm detecta en el dashboard un pedido que lleva 4 horas en "producción" sin cambio. Llama a Lucía — era un bordado complejo. Estado actualizado.

**Resolución:** Fin de semana: 43 pedidos, 0 reimpresiones, ticket promedio +22%. Reactiva prendas reabastecidas en 3 minutos.

**Capacidades reveladas:** Panel de admin, gestión de catálogo (activar/desactivar prendas y colores), creación y gestión de usuarios con roles, monitoreo de cola en tiempo real, alertas por pedidos estancados, reportes de operación.

---

### Journey 5 — Sofía, 33 años / Cliente con problema post-entrega

**Escena inicial:** Sofía recibió su camiseta. El diseño tiene el texto descentrado respecto al mockup que aprobó. Quiere reclamar pero no sabe cómo.

**Rising action:** Entra a su historial de pedidos. Ve el mockup exacto que aprobó. Hace clic en "Reportar problema". El sistema crea un ticket vinculado al pedido — con el snapshot inmutable del diseño aprobado como referencia objetiva.

**Clímax:** Rodrigo recibe la alerta en el panel de admin. Compara el mockup aprobado con la descripción del problema. Autoriza la reimpresión.

**Resolución:** Sofía recibe: "Tu reclamación fue aceptada. Tu prenda se reimprimirá en 24 horas." La segunda prenda llega perfecta. Sofía no se convierte en detractora.

**Capacidades reveladas:** Historial de pedidos con mockup aprobado visible, flujo de reporte de problema, ticket vinculado al snapshot inmutable del diseño, gestión de tickets en panel de admin, notificación de resolución al cliente.

---

### Journey Requirements Summary

| Journey | Capacidades clave reveladas | Prioridad |
|---------|----------------------------|-----------|
| Andrés (venta asistida) | UI tablet, aprobación explícita, pedido sin cuenta, prioridad, SMS | MVP ⭐ |
| Valentina (B2C online) | IA, validador, try-on, autoguardado, checkout, email | MVP |
| Lucía (producción) | Cola por técnica, diseño exacto, estados, notificación auto | MVP |
| Rodrigo (admin) | Catálogo, usuarios/roles, monitoreo, reportes | MVP |
| Sofía (post-venta) | Historial+mockup, ticket de problema, gestión admin | MVP |
| Carlos (equipos) | CSV roster, mockups individuales, pedido grupal | Growth |

### Decisiones Diferidas

- **Trazabilidad por prenda (cadena de custodia física):** MVP registra estado global del pedido, no movimiento físico de cada pieza. Evaluar en Fase 2.
- **Flujo de aprobación de equipos con link compartido:** Diferido a Growth junto con el Journey de Carlos.

## Domain-Specific Requirements

> **Nota de scope:** El MVP se enfoca en la **experiencia del cliente en el sitio web**. La integración con maquinaria física de producción (impresoras DTG, sublimación, bordado), gestión de inventario de insumos y generación de archivos de producción por técnica son **Fase 2**. La "orden de producción" en MVP es la vista estructurada del pedido en el Portal del Taller — el operario la consulta en pantalla y trabaja a partir de ahí.

### Cumplimiento y Regulatorio

**Bloqueantes antes del lanzamiento (Colombia):**
- **Facturación electrónica DIAN:** El sistema genera un *comprobante de pedido interno* (no factura fiscal). El taller emite la factura por sus canales propios (Alegra, Siigo u otro proveedor habilitado DIAN). El PRD reserva un slot arquitectónico en `Orders` para integración futura con DIAN sin reescribir la lógica de pedidos.
- **Registro ante la SIC (RNBD):** Obligación del taller como responsable del tratamiento de datos — no bloqueante para desarrollo, sí prerequisito operativo del taller antes del lanzamiento público.
- **Derecho de retracto — Ley 1480/2011:** El flujo de confirmación incluye pantalla de transición "Tu diseño está listo" con aviso de no-retracto enmarcado como confirmación de autoría ("Este diseño es tuyo. Como es personalizado, no admite devolución una vez confirmado"). Aceptación explícita requerida. *Implementación: pantalla intermedia entre canvas y checkout — 40 segundos adicionales, dentro del presupuesto de 10 min.*
- **Protección de datos — Ley 1581/2013:** Política de privacidad publicada antes del lanzamiento. Mecanismo de solicitud de borrado de cuenta y datos asociados accesible desde el perfil del usuario.
- **Verificación de edad:** Declaración activa de mayoría de edad (14+ años) en el registro — tres tarjetas simples, sin documento de texto largo. *Implementación: pantalla de bienvenida al portal, 25 segundos.*
- **ToS con cláusula de responsabilidad de contenido IA:** El usuario declara que el contenido descrito o subido no infringe derechos de terceros y asume responsabilidad del diseño generado. Aceptado en el mismo flujo de onboarding.

**Comprobante de pedido — campos mínimos para validez probatoria:**
Número de pedido, fecha y hora de confirmación, nombre completo del cliente, descripción del diseño (técnica + prenda + color + talla), valor pactado, imagen del mockup aprobado adjunta. Registro inmutable post-confirmación.

### Restricciones Técnicas

**Bloqueantes de seguridad (Día 1):**
- **HTTPS/HSTS obligatorio** en todos los entornos de producción.
- **Gestión de secretos externa:** API key de Gemini y credentials de base de datos via variables de entorno en host como mínimo. Nunca en `appsettings.json` ni en repositorio.
- **JWT:** Access token TTL corto (15–60 min). Refresh token con rotation. Estrategia de revocación documentada.

**Segunda iteración (30–90 días post-lanzamiento):**
- **Prompt injection mitigation:** Sanitización de input de usuario antes de enviar a Gemini. El input del usuario son datos, no instrucciones al modelo.
- **Content Security Policy (CSP):** Política CSP para imágenes desde S3/CDN de terceros.
- **Audit log de operaciones sensibles:** Log inmutable de generaciones de diseño (quién, cuándo, qué prompt, qué versión de SafetySettings).
- **Pre-signed URLs con TTL diferenciado:** Preview: 60 min. Confirmación de pedido: 7 días con endpoint de refresco. En la pantalla post-pedido: *"Tu mockup estará disponible 48 horas en este link. Después, encuéntralo en tu cuenta"* — convierte la limitación técnica en invitación al registro.
- **Versionado del rendering engine en el snapshot:** El snapshot almacena la versión del frontend que generó el diseño, garantizando re-render fiel para resolución de disputas.

**Deuda técnica aceptable (Año 1):**
- PCI DSS scope planning (relevante cuando llegue gateway de pagos en Fase 2 — diseñar módulo de pagos para que el backend nunca toque datos de tarjeta directamente).
- Retención formal de snapshots 1 año con lifecycle policy automatizada en bucket.
- Planes de contingencia completos por dependencia.

### Notificaciones

- **INotificationChannel abstracta:** Módulo `Notifications` implementa interfaz intercambiable: `SmsChannel` (Twilio, MVP) y `WhatsAppChannel` (Fase 2). La lógica de orquestación no cambia al añadir canal.
- **Retry y fallback:** Si SMS falla → 1 reintento (5 min delay) → escalada a email. El cliente siempre recibe la notificación por al menos un canal.
- **Mapa de momentos UX para avisos legales:**

| Momento | Estado emocional | Acción |
|---------|-----------------|--------|
| Entrada al portal | Sin apego, disponible | Verificación edad + ToS (3 tarjetas, 25 seg) |
| Diseñando | Fluido, creativo | Sin interrupciones — zona sagrada |
| Transición diseño→pedido | Satisfecho, emocionado | Aviso no-retracto como confirmación de autoría |
| Confirmación final | Decidido | Checkbox formal, ya procesado |
| Post-pedido | Aliviado | TTL del mockup como invitación a crear cuenta |

### Dependencias Críticas y Contingencias

| Dependencia | Riesgo | Contingencia MVP |
|------------|--------|-----------------|
| Gemini API | Outage → diseño con IA bloqueado | Cola de espera con ETA ("volvemos en X min"). En punto físico: el operario diseña manualmente con herramientas de texto e imagen. No bloquea el submit. |
| Proveedor SMS (Twilio) | Fallo silencioso | Retry → escalada a email automática |
| Blob storage | Indisponibilidad | Los datos JSON del diseño son independientes del blob — el pedido se procesa aunque la imagen no cargue temporalmente |

### Decisiones Diferidas a Fase 2

- **Integración con maquinaria física de producción** (impresoras DTG, sublimación, bordado, serigrafía): formatos de archivo por técnica, DPI, separación de colores, digitalización de bordado. El operario usa la imagen del Portal del Taller como referencia visual en MVP.
- **Módulo `ProductionFileGenerator`** con estrategias por técnica (DtgFileStrategy, ScreenPrintStrategy, EmbroideryStrategy).
- **Gestión de inventario de insumos** (prendas en blanco, tintas, hilos).
- **Integración con carriers** para tracking automatizado.
- **WhatsApp Business API** como canal de notificaciones.
- **Detección automática de similitud con marcas registradas** en diseños generados por IA.
- **Timestamp certificado (TSA RFC 3161)** para snapshots como evidencia contractual reforzada.
- **Facturación electrónica DIAN** integrada en el sistema.
- **Verificación de menores con consentimiento del representante legal** (si hay señal del segmento).

---

## Innovación y Patrones Novedosos

### Jerarquía de Diferenciadores

El análisis de innovación distingue tres niveles: diferenciadores defensibles con moat arquitectónico, diferenciadores competitivos verificables, e innovaciones hipótesis pendientes de validación.

#### Nivel 1 — Moat Arquitectónico (defensible a 18+ meses)

**Zero-Reinterpretation Guarantee** es el único diferenciador que constituye un cambio de categoría, no una mejora de feature. La promesa "lo que ves es lo que recibes" se sostiene por arquitectura, no por marketing: el `DesignSnapshot` (canvasJson + previewUrl + printZones) es write-once, generado client-side y transferido en una única transacción ACID a la cola de producción. Ningún competidor puede replicar esta garantía sin reconstruir su arquitectura de persistencia. El valor de la garantía es asimétrico: construirla toma tiempo, destruirla toma un solo pedido fallido.

**Dimensión de riesgo incorporada:** La garantía es técnica, no organizacional. Si el operador del taller realiza override manual fuera del sistema, la garantía no aplica. El PRD reconoce esto explícitamente: la responsabilidad del sistema termina en el snapshot entregado a producción.

**Política de fallo:** Cuando la garantía falla por error del cliente (diseño aprobado con problemas que el cliente ignoró pese a las advertencias del validator), la política de reimpresión es responsabilidad del taller, no de la plataforma. Esta política debe comunicarse en los términos de servicio antes del submit.

#### Nivel 2 — Diferenciadores Competitivos Verificables

**Pre-Order Print Quality Validator:** Gap de mercado verificable — ningún competidor analiza el diseño antes del pedido en el contexto de zonas de impresión reales. El claim preciso es: validación WCAG (contraste texto/prenda, tamaño de fuente efectivo, escala de imagen) *en el contexto de la técnica de impresión seleccionada*. Implementado como advisory (no blocking) en MVP con logging server-side del evento antes del submit, tanto para protección legal como para datos de producto. Métrica de validación: tasa de disputas post-entrega relacionadas con calidad visual (baseline desde Mes 1).

**AI Embedded in Production Constraints:** La IA generativa (Gemini) no es el diferenciador — Gemini es una commodity. El diferenciador es que la generación de imagen, la remoción de fondo y las recomendaciones de técnica están embebidas en el contexto de producción: zonas de impresión normalizadas, restricciones de área, técnica óptima por zona. El claim correcto es "diseño asistido por IA con contexto de producción", no "diseño con IA".

**Modo Presencial (canal físico digitalizado):** El operario del taller (Andrés) sirve a clientes presenciales desde el mismo sistema que gestiona pedidos digitales, cerrando el gap entre el punto de venta físico y la plataforma digital. En el mercado LATAM donde el taller familiar sigue siendo el punto de entrada dominante para pedidos de personalización, este canal tiene una economía de confianza diferente a la digital. Se presenta como hipótesis de alto potencial para validar en Fase 1.

#### Nivel 3 — Innovaciones Hipótesis (validar en Fase 1)

**Try-On Fotorrealista:** 4 estilos de modelo vía Gemini para reducir disputas post-entrega. Riesgo identificado: si el output visual difiere del producto real, puede aumentar las disputas en lugar de reducirlas. Tratado como hipótesis con métricas de validación desde Mes 1. Disclaimer explícito en UI: "imagen referencial — el resultado final puede variar levemente." Contingencia: desactivación sin impacto en el flujo principal si la hipótesis no se valida.

### Contexto de Mercado

| Innovación | Competidores más cercanos | Por qué AI Wear Studio cierra el gap |
|------------|--------------------------|--------------------------------------|
| Zero-Reinterpretation Guarantee | Ninguno en talleres físicos | Gap arquitectónico — requiere reconstruir persistencia de diseño |
| Pre-Order Quality Validator | Ninguno | Gap de mercado puro — el error se descubre en producción en todos los competidores |
| AI en contexto de producción | Canva (parcial, sin zonas), ImprintNext (limitado) | Integración contextual con técnica + zona + restricciones de área |
| Modo Presencial | Ninguno en LATAM | Canal físico no atendido por plataformas digitales de personalización |
| Workflow automation completo | DecoNetwork, Printavo (sin diseño IA) | Nadie cierra el loop design-to-production en una sola plataforma |

### Deuda Técnica Conocida Relacionada con Innovación

Documentada como decisión deliberada, no como omisión:

1. **Versionado de canvasJson:** El `DesignSnapshot` no incluye `konvaVersion` en MVP. Konva podría cambiar su schema de serialización en futuras versiones, haciendo que snapshots archivados no sean reproducibles sin error. Solución propuesta para Fase 2: agregar campo `konvaVersion: "x.y.z"` al snapshot y migration layer en la capa de lectura.

2. **Persistencia de borrador server-side:** El canvas vive exclusivamente en Zustand local en MVP. Un crash de navegador pierde el trabajo no enviado. Solución propuesta para Fase 2: auto-save periódico a endpoint `/drafts/{userId}` con resolución de conflictos de estado. Documentado como backlog conocido antes de que un caso de usuario lo fuerce como urgencia.

### Métricas de Validación de Innovación

| Innovación | Métrica | Cuándo medir |
|------------|---------|--------------|
| Zero-Reinterpretation | Tasa de reimpresión por error de diseño (target: < 2%) | Mes 1 post-lanzamiento |
| PrintQualityValidator | % pedidos con warning ignorados vs. abandonados | Mes 1 post-lanzamiento |
| Try-On fotorrealista | Tasa de disputas post-entrega vs. baseline | Mes 2 post-lanzamiento |
| Modo Presencial | % pedidos ingresados vía Andrés vs. self-service | Mes 1 post-lanzamiento |
| Workflow Automation | Tiempo promedio operario/pedido vs. flujo manual | Mes 1 post-lanzamiento |

---

## Alcance del Proyecto y Desarrollo por Fases

### Estrategia y Filosofía del MVP

**Tipo de MVP:** Experience MVP — validar que el flujo completo (cliente diseña → taller produce → cliente recibe exactamente lo que vio) es viable operativamente en condiciones reales. El aprendizaje que buscamos no es de mercado sino de operación.

**Hipótesis central que valida el MVP:** ¿Puede un taller de LATAM procesar pedidos de personalización con cero reinterpretación manual entre el diseño aprobado y la producción, y lograr que los clientes vuelvan?

**Alcance del MVP:** Un solo taller (el del desarrollador). Sin comercialización externa. Sin cobro. Objetivo: ciclo completo cliente diseña → orden existe → taller produce con datos reales y clientes reales.

**Equipo:** 1 desarrollador + asistencia de IA. Estimado de desarrollo: ~128–141 días hábiles core. Buffer disponible: ~80 días en 12 meses.

---

### Fase 1 — MVP (Operación Propia)

**Journeys soportados:**
- Valentina (cliente B2C digital): flujo completo diseño → pedido → seguimiento
- Andrés (operario modo presencial): atención a clientes físicos desde tablet *(hipótesis a validar)*
- Lucía (operaria de producción): gestión de cola y actualización de estados
- Rodrigo (admin de taller): gestión de usuarios y compañía

**Capacidades must-have:**

| Módulo | Capacidades | Sprint |
|--------|-------------|--------|
| **Auth + RBAC** | JWT stateless; 4 roles (platform_admin, workshop_admin, operator, customer); índices parciales de separación B2C/B2B; tenant isolation (RLS + BaseRepository); `ITenantContext` con ciclo de vida para HTTP, background jobs y platform_admin | 1 |
| **Company Admin (core)** | Schema Companies + CompanyFeatureFlags + Users con roles; seed del tenant único; feature flags por compañía vía `IFeatureFlagService`; planes Demo/SaaS/LicenciaPermanente como datos (sin UI de gestión en MVP) | 1 |
| **Catálogo** | 10 tipos de prenda, 23 zonas de impresión normalizadas, 5 técnicas; datos migrados desde prototipo como seeds SQL | 2 |
| **Canvas Frontend** | Port del prototipo React 19 + Konva; lógica de capas, zonas, multi-vista; estado 100% local en Zustand; herramienta de texto con 30 fuentes | 2 |
| **DesignEngine + AI** | Proxy Gemini en backend (generación, remoción de fondo, try-on); `DesignSnapshot` write-once (canvasJson + previewUrl + printZones); blob storage S3 | 3 |
| **PrintQualityValidator** | Validación WCAG client-side (contraste, fuente, escala) + logging server-side del evento pre-submit | 3 |
| **Orders + Checkout** | Carrito, validación de dirección (CO/MX/AR/CL/PE/US), submit atómico → `DesignSnapshot` frozen; pago manual (operador marca pagado) | 4 |
| **ProductionQueue + Portal Taller** | Cola de producción con 5 estados; vista de diseño aprobado (imagen + zonas + técnica + talla + color); actualización de estado; historial por compañía | 5 |
| **Notificaciones** | SMS vía Twilio (`INotificationChannel`): pedido confirmado, en producción, listo, enviado | 6 |
| **Company Admin UI** | Panel básico de gestión de compañías y planes para platform_admin | 6 *(si el tiempo lo permite; no bloquea lanzamiento)* |

**Fuera de Fase 1** *(decisión explícita, no omisión)*:

| Feature | Razón |
|---------|-------|
| Referidos | Sin usuarios activos, la mecánica es vacía. Migrar a Fase 2.1. |
| Modo equipos (team mode) | Sin demanda B2B validada. Migrar a Fase 2.1. |
| Dashboard de métricas del taller | Sin datos históricos, el tablero no aporta. Migrar a Fase 2.1. |
| Pasarela de pagos integrada | MVP opera con pago manual. Migrar a Fase 2.0. |
| WhatsApp Business API | SMS es suficiente para MVP. Migrar a Fase 2.1. |
| Facturación electrónica (DIAN/SAT/AFIP) | Manejable manualmente hasta ~50 facturas/mes. Migrar a Fase 2.2. |
| Canvas draft persistence (server-side) | Deuda técnica documentada. Migrar a Fase 2.0. |

**Hipótesis con criterios de éxito/fallo explícitos:**

| Hipótesis | Criterio de éxito | Criterio de fallo → Contingencia |
|-----------|------------------|----------------------------------|
| Try-on fotorrealista reduce disputas post-entrega | Tasa de disputas por expectativa visual < 10% en primeros 20 pedidos reales | > 15% → mover a opt-in en el sprint siguiente |
| Modo presencial (Andrés) genera adopción real | ≥ 20% de pedidos Phase 1 ingresan vía modo presencial | < 5% → mantener como feature de bajo perfil, no invertir más |

---

### Gate para iniciar Phase 2

**Criterio único cuantificable:** 3 personas externas — no el desarrollador, no familia — que:
1. Completaron una orden de principio a fin (diseñaron → confirmaron → recibieron la prenda)
2. Pagaron (aunque sea en efectivo)
3. Volvieron a hacer un segundo pedido

Este criterio valida retención, no solo adopción inicial. Es el predictor más fuerte de que el modelo de negocio tiene fundamento antes de invertir en comercialización.

---

### Fase 2 — SaaS Comercial (Sub-faseada)

Fase 2 se ejecuta en tres sub-fases para evitar convertirse en un segundo proyecto de 24+ meses. Cada sub-fase tiene su propio gate de entrada.

**Fase 2.0 — Go-to-Market Mínimo** (~3–4 meses post-gate)

| Feature | Propósito |
|---------|-----------|
| Pasarela de pagos (Stripe / MercadoPago / Wompi) | Desbloqueador comercial — cobro automático de suscripciones |
| Activación automática de planes post-pago | Eliminar gestión manual del platform_admin |
| Canvas draft persistence (`/drafts/{userId}`) | Retención de trabajo del cliente; deuda técnica de Phase 1 resuelta |
| 1 plan de suscripción activo (SaaS mensual) | Simplificar el modelo comercial inicial |
| Company Admin UI completa | Permitir onboarding de nuevos talleres sin intervención técnica |
| Data portability al cancelar | Ley 1581 Colombia — requerido antes de primer cliente externo en CO |
| `konvaVersion` field en `DesignSnapshot` + migration layer | Deuda técnica de canvasJson; requerido antes de que existan 2 versiones de Konva en producción |

**Fase 2.1 — Retención y Escala** (~2–3 meses post-Fase 2.0)

- Referidos completos (server-side con tracking y recompensas)
- Modo equipos completo (roster CSV + mockups individuales)
- WhatsApp Business API como canal de notificaciones (`INotificationChannel` ya abstrae esto)
- Pausa de suscripción (reduce churn en temporadas bajas LATAM)
- Dashboard de métricas del taller
- Carrito abandonado

**Fase 2.2 — Compliance y Escala Operativa** (cuando volumen lo justifique, >50 facturas/mes)

- Facturación electrónica DIAN (Colombia) — integración con Alegra/Siigo o directa
- Facturación SAT (México), AFIP (Argentina): por mercado en orden de volumen
- Multi-seat por organización (licenciamiento por taller, no por usuario)
- Usage-based billing para generaciones IA adicionales

*Nota: La facturación electrónica era denominada "commercial blocker" en versiones anteriores. Se renombra a "compliance threshold para escala" — los primeros clientes de Fase 2.0 pueden facturarse manualmente sin bloquear el arranque comercial.*

---

### Fase 3 — Plataforma LATAM

*Activador: base de talleres validada con retención sostenida. Demanda de creadores externos confirmada.*

- Marketplace de diseñadores (comisión por venta)
- API embebible para marcas e influencers
- Integración con hardware de producción: `ProductionFileGenerator` con estrategias por técnica (DTG, ScreenPrint, Embroidery, DTF, HeatTransfer)
- Gestión de inventario de insumos
- Schema-per-tenant si el volumen operacional lo justifica

---

### Orden de Implementación (Phase 1)

```
Sprint 1: Auth/RLS/RBAC + Company Admin (core, sin UI) + tenant isolation tests
Sprint 2: Catalog BC + Canvas frontend port (paralelos con MSW mocks)
Sprint 3: DesignEngine BC + AI proxy (Gemini) + PrintQualityValidator logging
Sprint 4: Orders BC + checkout + atomic submit → DesignSnapshot freeze
Sprint 5: ProductionQueue BC + B2B portal
Sprint 6: Notifications (Twilio SMS) + polish + Company Admin UI (si el tiempo lo permite)
Buffer:   Bugs, refinamiento, pipeline de deploy
```

El tenant isolation layer (RLS policies + test suite `AC-RBAC-CROSS-TENANT`) debe completarse en Sprint 1 antes de cualquier otro bounded context. Un bug de RLS en producción con datos de múltiples tenants es un bloqueante legal, no un bug de funcionalidad.

---

### Estrategia de Mitigación de Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| PostgreSQL RLS con data leak silencioso | Media | Test suite de tenant isolation en Sprint 1; `HasQueryFilter` global en EF Core |
| canvasJson incompatible en futuras versiones de Konva | Media | Deuda técnica documentada; `konvaVersion` field en Fase 2.0 |
| Canvas local pierde estado por crash de navegador | Media | `beforeunload` warning en MVP; canvas draft persistence en Fase 2.0 |
| Try-on fotorrealista aumenta disputas | Media | Criterio de fallo explícito (>15% → opt-in); contingencia documentada |
| Scope creep invalida el timeline de 12 meses | Alta | Nice-to-haves y features de Fase 2 explícitamente excluidos del lanzamiento |
| Gemini API cambia pricing / falla | Media | Proxy en backend permite swap; contingencia: diseño manual con texto + imagen |

---

## Requisitos Específicos SaaS B2B

### Visión General del Tipo de Proyecto

AI Wear Studio es una plataforma SaaS B2B multi-tenant donde cada **compañía** (taller) es la unidad de tenancy. En MVP opera con un único tenant (el taller propio del desarrollador), pero la arquitectura de compañías y planes es funcional desde el día uno. El módulo de administración de compañías es necesario en MVP para que el dueño de la plataforma (Platform Admin) pueda gestionar talleres, asignar planes y controlar el acceso.

---

### Modelo de Tenancy

**Unidad de tenancy:** Compañía (taller). Cada compañía tiene su propio `tenant_id`, portal de taller, usuarios internos, catálogo de pedidos y configuración.

**Estrategia de datos:** Row-level tenancy con `tenant_id` en todas las tablas de dominio (Orders, ProductionQueue, DesignSnapshots, Users de taller). Schema único compartido en MVP — no schema-per-tenant.

**Aislamiento de datos:** Toda query sobre datos de negocio pasa por `BaseRepository<T>` que aplica `WHERE tenant_id = @currentTenant` automáticamente vía `HasQueryFilter` global en EF Core. El filtro es opt-out explícito a través de `ITenantContext.RequiresTenantFilter`, no opt-in por repositorio. Este es el control de seguridad más crítico de toda la arquitectura.

**Ciclo de vida del TenantContext (tres casos obligatorios):**

| Caso | Fuente del tenant_id | Comportamiento |
|------|---------------------|----------------|
| HTTP request normal | JWT claim `tenant_id` | Inyectado via DI, disponible en toda la cadena de request |
| Background job | Parámetro explícito del job | El job recibe `tenant_id` como argumento — nunca infiere del contexto HTTP |
| `platform_admin` | No aplica (`tenant_id` = null) | `RequiresTenantFilter = false` → acceso cross-tenant explícito; cualquier otro rol sin `tenant_id` lanza `SecurityException` |

**MVP:** Un único tenant activo (`tenant_id = 1`). El módulo de administración existe y es funcional desde el despliegue inicial.

---

### Módulo de Administración de Compañías

Panel de control exclusivo del **Platform Admin** para gestionar todas las compañías registradas.

**Entidad Company:**

```
Company
  id              UUID (PK)
  name            string
  slug            string           -- identificador URL único
  plan            enum             -- Demo | SaaS | LicenciaPermanente
  plan_status     enum             -- Active | Suspended | Expired | Trial
  trial_ends_at   datetime?        -- null si no es Demo
  activated_by    UUID?            -- FK a Users (platform_admin que activó el plan)
  activated_at    datetime?        -- timestamp de activación del plan
  created_at      datetime
  settings        jsonb            -- configuración del taller (logo, colores, notificaciones)
```

`activated_by` y `activated_at` son obligatorios aunque la gestión sea manual en V1. Ante cualquier disputa sobre activación de plan, estos campos son la evidencia.

**Tipos de plan:**

| Plan | Descripción | Límite IA | Soporte | Denominación en UI |
|------|-------------|-----------|---------|-------------------|
| `Demo` | Período de prueba gratuito, acceso completo | 20 generaciones totales durante el período de prueba | Auto-servicio | "Prueba gratuita" |
| `SaaS` | Suscripción mensual activa | Pool configurable por compañía | SLA según contrato | "Suscripción mensual" |
| `LicenciaPermanente` | Pago único, acceso permanente a la versión comprada | Pool fijo definido al momento del pago | Sin soporte incluido | "Licencia permanente" |

El plan `Demo` limita a **20 generaciones totales** (no mensuales) para crear presión de conversión real. Con límites mensuales el usuario permanece cómodo sin decidir; el límite total fuerza la evaluación dentro del período de prueba.

El plan `LicenciaPermanente` no se denomina "plan" en la interfaz para evitar expectativas de continuidad. El contrato de compra debe especificar explícitamente el alcance de features incluidas, ya que el cliente puede exigir funcionalidades de versiones posteriores.

**Gestión de planes en V1:** Manual. El Platform Admin activa el plan en el sistema; el cobro ocurre fuera del sistema (transferencia bancaria, efectivo). La integración con pasarela de pagos se incluye en Fase 2.

**Feature flags por compañía:**

```sql
CompanyFeatureFlags
  tenant_id    UUID (FK → Companies, CASCADE DELETE)
  feature_key  VARCHAR(100)    -- constante string definida en FeatureFlags class
  enabled      BOOLEAN NOT NULL DEFAULT false
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_by   UUID NULL (FK → Users)   -- auditoría obligatoria
  PRIMARY KEY (tenant_id, feature_key)
```

Los feature flags permiten activar o desactivar features por compañía sin deployment. El plan define los flags que se activan al crear la empresa (seed inicial), pero el control operacional vive en la tabla. El acceso a flags se realiza exclusivamente a través de `IFeatureFlagService.IsEnabled(companyId, FeatureFlags.AiGeneration)` — nunca acceso directo a la tabla desde el dominio.

---

### Matriz de Roles y Permisos

**Cuatro roles del sistema:**

| Rol | Scope | Creación | Permisos |
|-----|-------|----------|---------|
| `platform_admin` | Toda la plataforma (cross-tenant) | Seed en deploy inicial | Gestión de compañías, planes, acceso total |
| `workshop_admin` | Su compañía | Invitado por `platform_admin` | Gestión de catálogo, usuarios del taller, configuración, reportes |
| `operator` | Su compañía | Invitado por `workshop_admin` | Ver cola de producción, actualizar estados, marcar pedido como pagado |
| `customer` | Su cuenta personal | Registro público | Diseñar, hacer pedidos, ver historial propio |

**Regla dura de separación de cuentas:**

Un mismo email no puede existir como `customer` y como `operator`/`workshop_admin`/`platform_admin` simultáneamente. Esta regla se enforcea a nivel de base de datos con índices parciales:

```sql
-- Un email no puede ser customer Y B2B al mismo tiempo
CREATE UNIQUE INDEX uix_email_b2c ON Users(email) WHERE role = 'customer';
CREATE UNIQUE INDEX uix_email_b2b ON Users(email)
  WHERE role IN ('operator', 'workshop_admin', 'platform_admin');
```

La DB rechaza el cruce con constraint violation antes de que la lógica de aplicación intervenga.

**JWT claims:**

```json
// Usuario de taller
{ "sub": "userId", "tenant_id": "companyId", "role": "operator" }

// Platform admin (sin tenant)
{ "sub": "userId", "scope": "platform", "role": "platform_admin" }
```

El `platform_admin` usa `scope: "platform"` en lugar de `tenant_id` para hacer explícito el intent. Un token sin `tenant_id` y sin `scope: "platform"` → `SecurityException` inmediata.

**Acceptance criteria de seguridad (tests de integración contra DB real, no mocks):**

| AC | Descripción | Respuesta esperada |
|----|-------------|-------------------|
| AC-RBAC-CROSS-TENANT | Operator del Tenant A solicita recurso del Tenant B | 404 (no 403, no 200) — no confirmar existencia del recurso |
| AC-RBAC-EMAIL-CONFLICT | Intentar registrar email existente como customer en rol B2B | 409 con mensaje explícito |
| AC-RBAC-ADMIN-BYPASS | platform_admin accede a recursos de múltiples tenants | 200 con datos correctos |
| AC-RBAC-INVITE-SCOPE | workshop_admin intenta invitar operator a otra compañía | 403 |
| AC-RBAC-SUSPENSION | Tenant en estado Suspended intenta operar | 403 en todas las rutas excepto módulo de billing |

La razón para 404 y no 403 en cross-tenant: un 403 confirma al attacker que el recurso existe. El 404 es la respuesta correcta cuando el recurso no existe en el contexto del tenant actual.

---

### Lista de Integraciones

| Integración | Propósito | Provider | Estado V1 |
|-------------|-----------|---------|-----------|
| Google Gemini API | Generación de imágenes, remoción de fondo, try-on | gemini-2.5-flash-image-preview + fallbacks | ✅ Activo |
| Twilio SMS | Notificaciones de estado al cliente | Twilio REST API | ✅ Activo |
| OpenStreetMap | Embed de mapa en checkout | Tile layer OSM (sin API key) | ✅ Activo |
| S3-compatible Blob Storage | Previews y assets de diseño | AWS S3 / Backblaze / MinIO local | ✅ Activo |
| Pasarela de pagos | Cobro de suscripciones y pedidos | TBD (Stripe / MercadoPago) | ❌ Fase 2 |
| WhatsApp Business API | Canal de notificaciones alternativo | Meta Business API | ❌ Fase 2 |
| DIAN / SAT / AFIP / SII / SUNAT | Facturación electrónica por país | TBD por país | ❌ Fase 2 — **bloqueador de ventas B2B en CO/MX/AR** |

La facturación electrónica local no es un nice-to-have de Fase 3. En Colombia (DIAN), México (SAT) y Argentina (AFIP), emitir factura electrónica es requisito legal para transacciones B2B. Un cliente SaaS en Bogotá no puede pagar sin recibir factura electrónica DIAN. Es un bloqueador de ventas que debe resolverse antes de la comercialización en Fase 2.

---

### Compliance

*(Requisitos completos documentados en la sección Domain-Specific Requirements — referencia)*

Adiciones específicas del modelo SaaS B2B:

- **Audit trail de planes:** Todo cambio de estado de plan (activación, suspensión, expiración) debe registrar `activated_by` + `activated_at` + motivo. Obligatorio en V1 aunque la gestión sea manual.
- **Data portability al cancelar:** Ley 1581 (Colombia) y equivalentes en LATAM otorgan al cliente derecho a exportar sus datos antes de cancelar. Requerido antes del lanzamiento comercial en Fase 2.

---

### Deuda Técnica de SaaS Documentada para Fase 2

Nombrada explícitamente como decisión, no como omisión:

| Item | Descripción | Impacto si se retrasa |
|------|-------------|----------------------|
| Política de pausa de suscripción | Talleres con estacionalidad alta (Navidad, temporada escolar) pueden pausar sin cancelar | Sin pausa, el cliente cancela en temporada baja y no regresa |
| Usage-based billing | El pool de generaciones IA es un subsidio temporal; en Fase 3 con clientes enterprise el modelo correcto es facturación por consumo adicional | Pricing no sostenible con escala |
| Multi-seat por organización | Un taller mediano tiene diseñador, cortador, vendedor — el modelo de licenciamiento debe ser por organización, no por usuario | Bloqueador para talleres medianos |
| Integración con pasarela de pagos | Stripe / MercadoPago para cobro automático de suscripciones | Sin esto el crecimiento en Fase 2 es operacionalmente insostenible |

---

## Requisitos Funcionales

**Este listado es el contrato de capacidades del producto.** Todo lo que no aparezca aquí no existirá en el producto final. UX diseña a partir de esto. El arquitecto soporta esto. Los epics implementan esto. Cualquier capacidad ausente debe agregarse explícitamente antes de pasar a implementación.

*Nota sobre separación FR/NFR: los atributos de calidad (tiempo de respuesta, nivel de fidelidad visual, cobertura geográfica) se documentan en la sección de Requisitos No Funcionales. Los FRs aquí capturan únicamente QUÉS, no CÓMOs.*

---

### Autenticación y Gestión de Identidad

- **FR1:** Un cliente externo puede crear una cuenta con email y contraseña mediante registro público.
- **FR2:** Un usuario interno (operario, workshop_admin) puede acceder al sistema mediante invitación enviada por un administrador con permisos para ello.
- **FR3:** Todo usuario puede iniciar sesión con sus credenciales y recibir un token de acceso.
- **FR4:** El sistema impide que un mismo email exista en el sistema como cuenta de cliente externo (rol `customer`) Y como cuenta de usuario interno (roles `operator`, `workshop_admin`, `platform_admin`) simultáneamente. *(Aclaración: el email es globalmente único en el contexto del sistema de roles — un email puede ser customer O interno, no ambos.)*
- **FR5:** Un usuario puede recuperar el acceso a su cuenta mediante un enlace enviado a su dirección de email.
- **FR6:** El sistema revoca el acceso de un usuario desactivado de forma inmediata, incluyendo la invalidación de tokens activos existentes sin requerir que el usuario cierre sesión.
- **FR7:** Un platform_admin puede crear, editar, activar y suspender cuentas de workshop_admin.
- **FR8:** Un workshop_admin puede invitar y desactivar cuentas de operario dentro de su compañía.

---

### Catálogo de Prendas

- **FR9:** Un cliente puede explorar el catálogo de prendas disponibles con sus variantes de color para la compañía activa.
- **FR10:** Un cliente puede seleccionar tipo de prenda, color, talla y cantidad de unidades antes de iniciar el diseño.
- **FR11:** El sistema muestra las zonas de impresión disponibles y la técnica recomendada para cada combinación prenda–vista seleccionada, de forma que el cliente comprenda qué área puede decorar y con qué técnica.
- **FR12:** El sistema presenta el diseño del cliente posicionado sobre la prenda seleccionada en cada vista disponible (frente, espalda, mangas, pecho).
- **FR13:** Un workshop_admin puede configurar qué prendas, colores y técnicas están disponibles para su compañía.

---

### Herramientas de Diseño

- **FR14:** Un cliente puede generar imágenes mediante descripción en lenguaje natural con asistencia de IA generativa. *(Aclaración: cada solicitud de generación individual consume un crédito del cuota del plan, independientemente del resultado.)*
- **FR15:** Un cliente puede agregar texto a su diseño con opciones de tipografía, tamaño, color y efectos básicos.
- **FR16:** Un cliente puede cargar una imagen o logo propio como elemento de diseño. *(Aclaración: el proceso de carga y remoción de fondo es asíncrono — el sistema indica visualmente el estado de procesamiento y notifica cuando está disponible para usar.)*
- **FR17:** El sistema puede remover automáticamente el fondo de una imagen cargada por el cliente.
- **FR18:** Un cliente puede diseñar de forma independiente en cada vista disponible de la prenda.
- **FR19:** Un cliente puede deshacer y rehacer acciones dentro de su sesión de diseño activa.
- **FR20:** El sistema evalúa el diseño en tiempo real y alerta al cliente sobre problemas de calidad de impresión (contraste texto/prenda, tamaño de fuente efectivo, escala de imagen) sin bloquear la confirmación del pedido. El sistema registra si el cliente confirmó el pedido con advertencias activas. *(Aclaración: la alerta se ejecuta tanto en tiempo real durante el diseño como en el momento del checkout; es advisory, no blocking.)*
- **FR21:** Un cliente puede solicitar la generación de un mockup fotorrealista de su diseño sobre un modelo antes de confirmar el pedido.
- **FR22:** Un cliente puede posicionar, escalar y rotar elementos de diseño dentro de la zona de impresión de cada vista.
- **FR23:** El sistema controla la cantidad de generaciones de imagen con IA disponibles para cada compañía según su plan activo. El ciclo de contador (total acumulado para Demo, pool mensual por período de facturación para SaaS y LicenciaPermanente) está definido por el tipo de plan.
- **FR23b:** Cuando una solicitud de generación de IA falla por error del servicio externo, el sistema preserva el estado actual del diseño, informa al cliente del fallo y le permite reintentar sin consumir un crédito adicional de su cuota.

---

### Pedidos y Checkout

- **FR24:** Un cliente puede revisar un resumen completo de su pedido antes de confirmar, que incluye como mínimo: vista del diseño final por cada vista activa, tipo de prenda y color seleccionados, talla y cantidad, precio total, y dirección de entrega ingresada.
- **FR25:** El sistema solicita y valida la dirección de entrega del cliente según el formato requerido por el país seleccionado. Cuando la dirección no puede ser validada automáticamente, el cliente puede elegir continuar con la dirección ingresada mediante confirmación explícita.
- **FR26:** El sistema requiere que el cliente acepte explícitamente los términos de servicio y la política de no-retracto para prendas personalizadas antes de confirmar el pedido.
- **FR27:** Al confirmar el pedido, el sistema ejecuta de forma atómica la creación del DesignSnapshot (artefacto inmutable que contiene: representación serializada del canvas, URL de imagen de preview, zonas de impresión activas, técnica seleccionada, versión del catálogo usada, precio en el momento de la confirmación) y la creación de la entrada en la cola de producción. Si alguna de las dos operaciones falla, ninguna persiste. A partir de la confirmación, el diseño asociado a la orden no puede ser modificado bajo ninguna circunstancia.
- **FR28:** Un cliente puede cancelar un pedido dentro de un período definido tras la confirmación, siempre que el estado del pedido sea `Recibido` y no haya sido marcado como pagado.
- **FR29:** Un cliente puede consultar el historial de sus pedidos y el estado actual de cada uno.
- **FR30:** Un cliente puede ver los detalles de cualquier pedido histórico, incluyendo el diseño aprobado.
- **FR31:** Un operario puede registrar manualmente la recepción del pago de un pedido.
- **FR31b:** El sistema muestra al cliente el precio de su pedido antes de confirmar, calculado en función de la prenda, técnica de impresión, número de zonas activas y cantidad de unidades.

---

### Cola de Producción y Portal del Taller

- **FR32:** Un operario puede visualizar la cola de pedidos pendientes de producción de su compañía. El estado inicial de toda orden recién confirmada en la cola es `Recibido`.
- **FR33:** Un operario puede filtrar y ordenar la cola de producción por técnica de impresión, estado y fecha de pedido.
- **FR34:** Un operario puede ver el diseño exacto aprobado por el cliente para cada pedido, incluyendo la imagen del diseño, las dimensiones de la zona de impresión, la técnica recomendada, la talla, la cantidad y el color de la prenda.
- **FR35:** Un operario puede actualizar el estado de un pedido a través del flujo de producción: `Recibido` → `En Producción` → `Control de Calidad` → `Listo` → `Enviado`. Un operario puede revertir un estado al inmediatamente anterior cuando el pedido no ha sido marcado como `Enviado`.
- **FR36:** Un workshop_admin puede consultar el historial completo de pedidos de su compañía con filtros por estado y rango de fechas.
- **FR36b:** El sistema registra incidencias de producción categorizadas (error de diseño, error de talla, error de insumo, otro) que el operario puede asociar a un pedido. Estas incidencias alimentan el indicador de tasa de error de producción.

---

### Notificaciones

- **FR37:** El cliente recibe una notificación automática por SMS cuando su pedido cambia de estado durante el proceso de producción. *(Aclaración: el canal inicial es SMS; la arquitectura de notificaciones está desacoplada para soportar canales adicionales como WhatsApp en fases posteriores sin reescribir lógica de negocio.)*
- **FR38:** El cliente recibe una confirmación automática por SMS al momento de confirmar el pedido con el resumen del pedido y los datos de entrega.
- **FR39:** Un workshop_admin puede configurar qué eventos de cambio de estado generan notificaciones automáticas al cliente.
- **FR39b:** El sistema dispara automáticamente una solicitud de calificación de experiencia al cliente cuando su pedido alcanza el estado `Enviado`, a través del mismo canal de notificación configurado.

---

### Administración de Compañías y Planes

- **FR40:** Un platform_admin puede crear y gestionar compañías (talleres) en el sistema, incluyendo la asignación y modificación del plan activo.
- **FR41:** Un platform_admin puede activar, suspender y restaurar el acceso de una compañía. Al suspender una compañía, el sistema define un comportamiento explícito para los pedidos activos (quedan en su estado actual, sin nuevas transiciones) y para los usuarios activos (pierden acceso inmediatamente).
- **FR42:** El sistema restringe las capacidades disponibles para cada compañía según su plan activo. Cuando un cliente intenta usar una capacidad no disponible en su plan, el sistema presenta un mensaje explicativo del motivo de la restricción.
- **FR43:** Un workshop_admin puede configurar los datos y preferencias de su compañía, incluyendo como mínimo: nombre del taller, logo, colores de marca y configuración de notificaciones. El modelo de datos soporta configuración de dominio personalizado para uso en fases posteriores.
- **FR44:** El sistema registra toda activación y cambio de plan con la identidad del administrador que realizó el cambio, el plan anterior, el plan nuevo y el timestamp de la operación.
- **FR45:** Un platform_admin puede consultar métricas de uso por compañía, incluyendo: pedidos totales, generaciones de IA consumidas, usuarios activos y pedidos completados por operador por período.
- **FR45b:** El sistema registra eventos de consumo facturables (generaciones de IA utilizadas, pedidos procesados) de forma estructurada y asociada a la compañía, para soporte de modelos de facturación por uso en fases posteriores.
- **FR45c:** Un workshop_admin o platform_admin puede exportar los datos de pedidos de una compañía en formato estructurado (CSV o equivalente).

---

### Modo Presencial

- **FR46:** Un operario puede iniciar una sesión de diseño asistida en nombre de un cliente que está físicamente presente en el taller.
- **FR47:** Un cliente presencial puede revisar y aprobar el diseño en el dispositivo del operario antes de que se confirme el pedido.
- **FR48:** Los pedidos originados en modo presencial son procesados con el mismo flujo que los pedidos digitales y aparecen en la misma cola de producción del taller.

---

*Total: 54 requisitos funcionales · 8 áreas de capacidad · Cobertura validada por UX, ingeniería y análisis de negocio · Cada FR es testeable de forma independiente y libre de detalles de implementación.*

---

## Requisitos No Funcionales

*Sección validada con análisis multi-agente (Winston — Arquitecto, Mary — QA, Amelia — UX). Incorpora hallazgos de Party Mode: NFR-PERF-01b, ajuste de fiabilidad por fase, reencuadre mobile, cumplimiento Ley 26.653 AR, y sección completa de Observabilidad.*

---

### Performance

| ID | Requisito | Valor Objetivo | Condición |
|----|-----------|---------------|-----------|
| NFR-PERF-01 | Tiempo de respuesta API (P95) | < 500 ms | Operaciones CRUD estándar bajo carga normal |
| NFR-PERF-01b | Tiempo de generación IA (P99) | < 30 s · Hard timeout 45 s | Generación de imagen con Gemini; 45 s retorna error al cliente, no bloquea |
| NFR-PERF-02 | Tiempo de carga inicial SPA (TTI) | < 3 s | Conexión 4G estándar desde Colombia/México |
| NFR-PERF-03 | Renderizado del canvas de diseño | < 100 ms por interacción | Adición/movimiento de capas con diseño de complejidad media (≤ 10 capas) |
| NFR-PERF-04 | Generación de mockup final | < 5 s (P95) | Composición canvas → imagen exportada de alta resolución |
| NFR-PERF-05 | Capacidad concurrente (Phase 1) | 50 usuarios simultáneos | Sin degradación de PERF-01; escala vertical antes de horizontal |
| NFR-PERF-06 | Capacidad concurrente (Phase 2) | 500 usuarios simultáneos | Con degradación graceful; cola de generación IA sin bloqueo de UI |
| NFR-PERF-07 | Tiempo de respuesta cola de producción | < 200 ms | Carga y actualización de estado del dashboard del operario |

---

### Seguridad

| ID | Requisito |
|----|-----------|
| NFR-SEC-01 | Toda comunicación cliente-servidor sobre HTTPS/TLS 1.2+. Sin endpoints HTTP en producción. |
| NFR-SEC-02 | Autenticación JWT con expiración ≤ 60 minutos y refresh token rotativo. Tokens invalidables en logout. |
| NFR-SEC-03 | Rate limiting por usuario autenticado en endpoints de generación IA. En Phase 1: 10 generaciones gratuitas/día por cuenta; bypass permanente post-confirmación de pedido. |
| NFR-SEC-04 | Aislamiento de tenants en todas las queries de base de datos. Test de aceptación obligatorio: **AC-RBAC-CROSS-TENANT** — operario de Tenant A solicitando recurso de Tenant B → respuesta 404 (no 403, no 200). |
| NFR-SEC-05 | API keys de Gemini y secretos de infraestructura almacenados en variables de entorno o gestor de secretos. Nunca en código fuente ni en el bundle del cliente. |
| NFR-SEC-06 | Inputs de usuario sanitizados antes de procesamiento. Prompts de IA con sistema de filtrado básico de contenido en Phase 1; moderación automática antes del lanzamiento público. |
| NFR-SEC-07 | Logs de auditoría para: cambios de estado de pedido, acciones administrativas, actualizaciones de feature flags, y acciones de platform_admin en cualquier tenant. |
| NFR-SEC-08 | Contraseñas almacenadas con bcrypt (cost ≥ 12) o argon2id. Sin almacenamiento de credenciales en texto plano. |

---

### Escalabilidad

| ID | Requisito |
|----|-----------|
| NFR-SCALE-01 | La arquitectura monolito modular debe soportar extracción de módulos como servicios independientes sin cambios de contrato de API. |
| NFR-SCALE-02 | Blob storage (S3-compatible) para todos los assets de diseño e imágenes generadas. Sin almacenamiento de binarios en la base de datos relacional. |
| NFR-SCALE-03 | Las consultas de alto volumen (cola de producción, historial de pedidos) deben tener índices definidos desde el diseño inicial del schema. |
| NFR-SCALE-04 | La generación de imágenes IA debe ser asíncrona con feedback de progreso al cliente. No bloquear el hilo de la petición HTTP durante la espera de Gemini. |

---

### Confiabilidad

| ID | Requisito | Phase 1 | Phase 2 |
|----|-----------|---------|---------|
| NFR-REL-01 | Disponibilidad del servicio (uptime mensual) | 99.0% (≤ 7.2 h/mes downtime) · RTO 4 h | 99.5% (≤ 3.6 h/mes downtime) · RTO 1 h |
| NFR-REL-02 | Persistencia de sesión de diseño | Auto-save cada 5 s (debounce) + flush en cierre de pestaña. Sin pérdida de trabajo en desconexión temporal. | ← mismo |
| NFR-REL-03 | Rollback de transacción de pedido | La confirmación de pedido es una transacción ACID atómica: DesignSnapshot + entrada en ProductionQueue. Si alguna falla, ambas se revierten. | ← mismo |
| NFR-REL-04 | Retry de generación IA | 1 reintento automático ante error 429 (rate limit) con delay de 10 s. Errores de otro tipo se reportan al usuario sin reintentar automáticamente. | ← mismo |
| NFR-REL-05 | Idempotencia del endpoint de confirmación | El endpoint `POST /orders/confirm` requiere header `Idempotency-Key`. El sistema mantiene tabla `ProcessedRequests` para prevenir pedidos duplicados en reintentos de red. | ← mismo |

---

### Integridad de Datos

| ID | Requisito |
|----|-----------|
| NFR-INT-01 | El DesignSnapshot confirmado es inmutable. No puede modificarse después de la confirmación del pedido. Cualquier corrección genera un nuevo pedido. |
| NFR-INT-02 | El DesignSnapshot incluye versión del catálogo al momento de confirmación para detectar incompatibilidades si el catálogo cambia después. |
| NFR-INT-03 | Backups automáticos de base de datos con retención mínima de 30 días. En Fase 1: snapshots diarios. En Fase 2: WAL streaming + snapshots diarios. |
| NFR-INT-04 | Migración de schema con herramienta de migración versionada (EF Core Migrations o equivalente). Sin cambios de schema manuales en producción. |
| NFR-INT-05 | Header `Idempotency-Key` obligatorio en `POST /orders/confirm`. Respuesta idéntica para key duplicada dentro de ventana de 24 h. |
| NFR-INT-06 | Contrato de errores RFC 7807 (`application/problem+json`) en todos los endpoints. Distingue errores de validación (4xx con detalle de campo) de errores de infraestructura (5xx genérico). |

---

### Accesibilidad

| ID | Requisito |
|----|-----------|
| NFR-ACC-01 | El portal del cliente cumple WCAG 2.1 nivel AA en todos los flujos críticos: selección de prenda, herramientas de diseño, checkout, y tracking de pedido. **Nota regulatoria AR:** Argentina Ley 26.653 exige WCAG 2.1 AA para plataformas que sirven al público general — es cumplimiento legal, no solo best practice. |
| NFR-ACC-02 | El validador de calidad de impresión (PrintQualityValidator) aplica ratio de contraste WCAG 2.1 como criterio de advertencia de producción. No reemplaza la responsabilidad de accesibilidad de la UI. |
| NFR-ACC-03 | Todos los elementos interactivos del canvas tienen alternativa de teclado. Usuarios que no pueden usar mouse deben poder completar el flujo de diseño básico. |

---

### Compatibilidad

| ID | Requisito |
|----|-----------|
| NFR-COMPAT-01 | Soporte de navegadores: últimas 2 versiones de Chrome, Firefox, Safari, Edge. El canvas de diseño (Konva) requiere navegadores con soporte WebGL. |
| NFR-COMPAT-02 | **Mobile (< 768px):** Experiencia de consulta y aprobación — ver pedidos en curso, aprobar diseño en modo presencial, tracking de estado. El flujo de creación de diseño completo no está en scope para mobile en Fase 1. **Tablet (≥ 10"):** Experiencia presencial completa — referencia para modo operario asistiendo a cliente físico. |
| NFR-COMPAT-03 | La plataforma soporta los 6 países objetivo desde Fase 1 (CO, MX, US, AR, CL, PE): validación de formatos de dirección por país, ciudades por prefijo, y moneda de referencia local en la vista de pedido. |

---

### Observabilidad

| ID | Requisito |
|----|-----------|
| NFR-OBS-01 | El sistema expone un endpoint de health check (`GET /health`) con estado de componentes críticos: API, base de datos, blob storage, y conectividad a Gemini API. Responde en < 200 ms. |
| NFR-OBS-02 | Todos los eventos de negocio relevantes se registran en logs estructurados (JSON): pedidos confirmados, generaciones IA ejecutadas, cambios de estado de producción, errores de validación de calidad, y acciones administrativas. |
| NFR-OBS-03 | La plataforma expone métricas de latencia P95 y P99 para los endpoints críticos (generación IA, confirmación de pedido, carga de cola de producción). Alertas configurables cuando P95 supera los umbrales de PERF-01/PERF-01b. |
| NFR-OBS-04 | Los eventos de consumo facturable (generaciones IA, pedidos procesados) se registran de forma estructurada y asociada al tenant, con timestamp y metadatos suficientes para auditoría y futura facturación por uso en Fase 2. |

---

*Total: 41 requisitos no funcionales · 8 categorías · Validados por análisis multi-agente (arquitectura, QA, UX) · Valores de Fase 1 calibrados para operación de taller propio; valores de Fase 2 para escala SaaS comercial.*
