---
title: 'ARCH-04 — Benchmark bgRemoval en PNG 4K'
date: '2026-05-12'
decision: 'local-primario'
---

# ARCH-04: Benchmark bgRemoval.ts en imagen 4K

## Objetivo

Determinar si el algoritmo de remoción de fondo local (`removeBackgroundData` en `bgRemoval.ts`) es suficientemente rápido en imágenes 4K, o si se debe invertir la lógica de fallback para usar Gemini como método primario.

**Umbral ARCH-04:** si P95 > 2000ms → invertir fallback (Gemini primario). Si P95 ≤ 2000ms → mantener local como primario.

## Entorno de Ejecución

- **Entorno:** vitest 4.1.6 / Node.js (V8) — representa el entorno del Web Worker
- **Imagen sintética:** 3840×2160 px (31.6 MB RGBA buffer)
- **Patrón:** fondo blanco (RGB 255,255,255) con rectángulo oscuro central (40% área útil)
- **Algoritmo testeado:** BFS puro sin I/O de Canvas (`removeBackgroundData`)

## Resultados

| Métrica | Tiempo |
|---------|--------|
| P50     | 112 ms |
| P95     | 127 ms |
| P99     | 127 ms |

*Runs: 5*

## Nota sobre la mejora algorítmica

La versión anterior del BFS usaba `Array.prototype.shift()` (O(n) por llamada → O(n²) total). El benchmark inicial arrojó P95 = 5329ms, superando el umbral. 

La corrección — reemplazar `shift()` con un índice de cabeza sobre un `Int32Array` pre-asignado — reduce la complejidad total a O(n), lo que reduce P95 de 5329ms a 127ms (42× más rápido) sin cambiar el resultado del algoritmo. Este fix es correcto y no cambia la semántica del BFS.

## Decisión

**✅ Mantener lógica actual: local primario, Gemini como fallback.**

P95 = 127ms ≤ 2000ms → no se requiere invertir el fallback. El algoritmo local es adecuado para imágenes 4K en el contexto de un Web Worker.

El flujo de remoción sigue siendo:
1. Auto-detección al subir imagen (`detectBackground`)
2. Si `confidence ≥ 0.55`: remoción automática con `removeBackgroundLocal` (via Web Worker)
3. Botón "Quitar fondo (IA)": usa Gemini para casos complejos (fotos, múltiples objetos)
