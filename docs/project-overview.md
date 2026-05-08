# AI Wear Studio — Visión General del Proyecto

**Generado:** 2026-05-07  
**Versión del escaneo:** 1.2.0 (Exhaustive Scan)

---

## Resumen Ejecutivo

**AI Wear Studio** es una plataforma e-commerce de diseño de prendas personalizado potenciada por IA generativa. Permite a usuarios finales diseñar camisetas, sudaderas, gorras y más, en tiempo real, directamente en el navegador — sin software adicional ni conocimientos de diseño.

El producto combina un **editor de canvas vectorial/raster** (Konva) con **generación de imágenes por IA** (Google Gemini), **zonas de impresión dinámicas por prenda**, **autosave**, **Try-On virtual** y un **flujo de checkout** completo, todo en una SPA React desplegada en Google AI Studio.

---

## Datos del Proyecto

| Campo | Valor |
|-------|-------|
| **Nombre** | AI Wear Studio |
| **Owner** | Felipe Quintero (gfquinterol@siesa.com) |
| **Stack** | React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS v4 · Zustand 5 · Konva · Gemini |
| **Tipo** | SPA Monolito (despliegue único) |
| **Plataforma** | Google AI Studio / Navegador web |
| **Lenguaje UI** | Español (es-CO) |
| **Moneda** | COP (Colombia Pesos) |
| **Versión del plan** | Plan V2 (Sprints 7-15) |

---

## Propuesta de Valor

- **Para el usuario final**: Crea camisetas y prendas únicas con IA en minutos, sin saber diseño.
- **Para equipos**: Modo Equipo para pedidos bulk con personalización individual por nombre/número.
- **Para diseñadores**: Marketplace donde publican sus diseños y reciben comisiones.
- **Para marcas**: Widget embebible con branding propio.

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| UI Framework | React | 19.0.1 | Renderizado de componentes |
| Lenguaje | TypeScript | 5.8.2 | Tipado estático |
| Build | Vite | 6.2.3 | Bundling y dev server |
| CSS | Tailwind CSS | 4.1.14 | Estilos utilitarios |
| Estado global | Zustand | 5.0.12 | Store reactivo |
| Canvas/Gráficos | Konva + react-konva | 10.3.0 / 19.2.3 | Editor de diseños 2D |
| Animaciones | Motion | 12.23.24 | Transiciones fluidas |
| Íconos | Lucide React | 0.546.0 | Iconografía consistente |
| IA generativa | @google/genai | 1.29.0 | Generación de imágenes |
| Backend mínimo | Express | 4.21.2 | Servidor auxiliar (dev) |
| Persistencia | localStorage | — | Sesiones locales |

---

## Catálogo de Prendas

10 tipos de prenda disponibles:

| ID | Nombre | Tipo | Género | Precio base |
|----|--------|------|--------|-------------|
| tshirt-unisex | Camiseta Premium | t-shirt | Unisex | $24.99 |
| tshirt-female | Camiseta Mujer | t-shirt | Femenino | $24.99 |
| polo-male | Polo Hombre | polo | Masculino | $34.99 |
| tank-top | Tank Top | tank-top | Unisex | $19.99 |
| long-sleeve | Manga Larga | long-sleeve | Unisex | $29.99 |
| hoodie-unisex | Sudadera con Capucha | hoodie | Unisex | $49.99 |
| sweatshirt | Buzo Crewneck | sweatshirt | Unisex | $39.99 |
| shorts | Pantaloneta | shorts | Unisex | $27.99 |
| sweatpants | Joggers | sweatpants | Unisex | $39.99 |
| cap | Gorra | cap | Unisex | $22.99 |

---

## Técnicas de Impresión Soportadas

| Código | Nombre |
|--------|--------|
| DTG | Impresión directa a prenda |
| ScreenPrint | Serigrafía |
| Embroidery | Bordado |
| DTF | Transferencia directa |
| HeatTransfer | Vinilo térmico |

---

## Estado de Implementación (Plan V2)

| Sprint | Tema | Estado |
|--------|------|--------|
| 0-6 (V1) | Foundation, IA generativa, canvas, catálogo, pricing, checkout, Try-On | ✅ Completado |
| 7 | IA Operacional (Print Quality, BG Removal, Rate Limit) | ✅ Parcialmente completado |
| 8 | Modo Equipos / B2B | ❌ Pendiente |
| 9 | Post-compra y fidelización (Referidos ✅) | 🔄 En progreso |
| 10-15 | Comunidad, Accesibilidad, PWA, Onboarding, Anti-fraude | ❌ Pendiente |

---

## Flujo Principal del Usuario

```
Aterrizaje → Seleccionar prenda → Elegir color/talla
    → Crear diseño (IA / texto / imagen)
    → Previsualizar en Try-On
    → Revisar calidad de impresión
    → Checkout + validación de dirección
    → Pago
```

---

## Limitaciones Conocidas

- Sin backend real (todo en localStorage); no escala a múltiples dispositivos.
- Sin autenticación real (solo guest).
- Rate limit de IA basado en fingerprint local (eludible).
- Sin SSR/SEO (SPA pura).
- Sin tests automatizados.
- Sin diseño responsivo para mobile (pendiente Sprint 12).
