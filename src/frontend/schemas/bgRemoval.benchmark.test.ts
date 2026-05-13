/**
 * ARCH-04 Benchmark: removeBackgroundData en buffer sintético 4K.
 *
 * Mide el tiempo de la etapa BFS (procesamiento puro de píxeles) sin I/O de Canvas.
 * La I/O de Canvas (drawImage + getImageData + putImageData + toDataURL) añade
 * ~30-80ms en hardware moderno y no es el cuello de botella.
 *
 * Imagen sintética: fondo blanco (RGB 255,255,255) con un rectángulo gris oscuro
 * en el centro (~30% del área) — representa el caso más común de logo sobre fondo blanco.
 */

import { describe, it, expect } from 'vitest';
import { removeBackgroundData } from '../services/bgRemoval';

const W = 3840;
const H = 2160;
const RUNS = 5;

function makeSyntheticBuffer(w: number, h: number): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(w * h * 4);
  const cx = w / 2, cy = h / 2, rw = w * 0.3, rh = h * 0.3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inRect = Math.abs(x - cx) < rw / 2 && Math.abs(y - cy) < rh / 2;
      buf[i]     = inRect ? 40 : 255;
      buf[i + 1] = inRect ? 40 : 255;
      buf[i + 2] = inRect ? 40 : 255;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

describe('ARCH-04: bgRemoval benchmark en 4K sintético', () => {
  it('reporta P50/P95/P99 y falla si P95 > 2000ms', () => {
    const buf = makeSyntheticBuffer(W, H);
    const times: number[] = [];

    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      const result = removeBackgroundData(buf, W, H);
      const elapsed = performance.now() - start;
      times.push(elapsed);
      // Verificar que el resultado es correcto: al menos 60% de píxeles removidos (fondo blanco)
      expect(result.removedRatio).toBeGreaterThan(0.6);
    }

    times.sort((a, b) => a - b);
    const p50 = times[Math.floor(RUNS * 0.5)];
    const p95 = times[Math.floor(RUNS * 0.95)] ?? times[times.length - 1];
    const p99 = times[times.length - 1];

    console.log('\n=== ARCH-04: bgRemoval benchmark (BFS puro, sin Canvas I/O) ===');
    console.log(`Imagen: ${W}x${H} px (${(W * H * 4 / 1024 / 1024).toFixed(1)} MB RGBA buffer)`);
    console.log(`Runs: ${RUNS}`);
    console.log(`P50: ${p50.toFixed(0)} ms`);
    console.log(`P95: ${p95.toFixed(0)} ms`);
    console.log(`P99: ${p99.toFixed(0)} ms`);
    console.log(`Decisión ARCH-04: ${p95 <= 2000 ? '✅ local primario (P95 ≤ 2000ms)' : '⚠️  invertir fallback (P95 > 2000ms)'}`);
    console.log('================================================================\n');

    // Documentar tiempos para bg-removal-benchmark.md
    expect({ p50: Math.round(p50), p95: Math.round(p95), p99: Math.round(p99) }).toBeDefined();

    // ARCH-04: si P95 > 2000ms, la estrategia debe invertirse (test documenta la condición)
    // Si falla, revisar el spec y ajustar la lógica de fallback antes de continuar.
    expect(p95).toBeLessThanOrEqual(2000);
  });
});
