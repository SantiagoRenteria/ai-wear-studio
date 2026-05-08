// HU-7.1 — Background removal local heuristico.
//
// Estrategia: para el caso comun (logo sobre fondo claro y uniforme — blanco,
// gris claro, beige) hacemos flood-fill desde las 4 esquinas y eliminamos los
// pixeles "similares" al promedio del borde. Es instantaneo, no necesita
// descargar modelos y resuelve ~70% de los uploads reales.
//
// Para casos complejos (fotos con fondo no uniforme, multiples objetos) el
// usuario tiene el boton "Quitar fondo (IA)" que llama a Gemini en
// services/gemini.ts.
//
// La calidad del resultado depende del threshold; permitimos al UI exponerlo.

export interface BgDetection {
  /** Promedio del color de las 4 esquinas. */
  borderColor: { r: number; g: number; b: number };
  /** Que tan uniforme es el borde (0-1). 1 = todas las esquinas iguales. */
  borderUniformity: number;
  /** Que tan claro es el borde (0-1). */
  borderLuminance: number;
  /** Confianza de que hay un fondo removible (0-1). */
  confidence: number;
}

export interface BgRemovalResult {
  /** Data URL PNG con alpha. */
  cleaned: string;
  /** % de pixeles marcados como fondo. */
  removedRatio: number;
  detection: BgDetection;
}

interface RemoveOptions {
  /** Distancia maxima en RGB para considerar "mismo fondo". 0-441 (default 40). */
  tolerance?: number;
  /** Suavizado del borde alpha (0 desactiva, default 1 = un paso). */
  featherPasses?: number;
}

/* ---------- helpers internos ---------- */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function getCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D no disponible.');
  return { canvas, ctx };
}

function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function relLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function sampleCorners(data: Uint8ClampedArray, w: number, h: number, sample = 6) {
  // Muestreamos un cuadradito de sample x sample en cada esquina.
  const corners: { r: number; g: number; b: number }[] = [];
  const offsets = [
    [0, 0],
    [w - sample, 0],
    [0, h - sample],
    [w - sample, h - sample],
  ];
  for (const [ox, oy] of offsets) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 0; y < sample; y++) {
      for (let x = 0; x < sample; x++) {
        const i = ((oy + y) * w + (ox + x)) * 4;
        r += data[i]; g += data[i + 1]; b += data[i + 2];
        n++;
      }
    }
    corners.push({ r: r / n, g: g / n, b: b / n });
  }
  return corners;
}

/* ---------- API publica ---------- */

/**
 * Inspecciona la imagen y devuelve confianza de que hay un fondo removible.
 * No modifica la imagen. Util para decidir si auto-disparar la limpieza.
 */
export async function detectBackground(dataUrl: string): Promise<BgDetection> {
  const img = await loadImage(dataUrl);
  const { ctx } = getCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);

  const corners = sampleCorners(data, img.width, img.height);
  // Promedio de las esquinas.
  const avg = corners.reduce(
    (acc, c) => ({ r: acc.r + c.r / 4, g: acc.g + c.g / 4, b: acc.b + c.b / 4 }),
    { r: 0, g: 0, b: 0 },
  );

  // Uniformidad: 1 - desviacion promedio respecto al promedio (normalizada).
  const avgDist =
    corners.reduce(
      (acc, c) => acc + colorDistance(c.r, c.g, c.b, avg.r, avg.g, avg.b),
      0,
    ) / corners.length;
  // 441 ≈ distancia maxima posible en RGB (negro <-> blanco).
  const borderUniformity = Math.max(0, 1 - avgDist / 80);

  const borderLuminance = relLuminance(avg.r, avg.g, avg.b);

  // Confianza: alta si el borde es uniforme y claro (logo sobre blanco).
  // Tambien si el borde es uniforme oscuro pero homogeneo (logo sobre negro).
  const lightBg = borderLuminance > 0.6 ? borderLuminance : 0;
  const darkUniform = borderLuminance < 0.15 && borderUniformity > 0.85 ? 0.6 : 0;
  const confidence = Math.max(
    Math.min(1, borderUniformity * (0.4 + lightBg)),
    darkUniform,
  );

  return {
    borderColor: { r: Math.round(avg.r), g: Math.round(avg.g), b: Math.round(avg.b) },
    borderUniformity,
    borderLuminance,
    confidence,
  };
}

/**
 * Quita el fondo uniforme via flood-fill desde las esquinas.
 * Devuelve un PNG con alpha.
 */
export async function removeBackgroundLocal(
  dataUrl: string,
  opts: RemoveOptions = {},
): Promise<BgRemovalResult> {
  const tolerance = opts.tolerance ?? 38;
  const featherPasses = opts.featherPasses ?? 1;

  const img = await loadImage(dataUrl);
  const w = img.width;
  const h = img.height;
  const { canvas, ctx } = getCanvas(w, h);
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const detection = await detectBackgroundFromData(data, w, h);
  const target = detection.borderColor;

  // Flood-fill BFS desde las 4 esquinas. mask[i] = 1 si es fondo.
  const total = w * h;
  const mask = new Uint8Array(total);
  const queue: number[] = [];
  const seedPixels = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  for (const [sx, sy] of seedPixels) {
    const idx = sy * w + sx;
    if (!mask[idx]) {
      mask[idx] = 1;
      queue.push(idx);
    }
  }

  let removed = 0;
  while (queue.length > 0) {
    const idx = queue.shift()!;
    const x = idx % w;
    const y = (idx - x) / w;
    const di = idx * 4;
    const dist = colorDistance(
      data[di], data[di + 1], data[di + 2],
      target.r, target.g, target.b,
    );
    if (dist > tolerance) {
      mask[idx] = 0;
      continue;
    }
    removed++;
    // 4-vecinos
    if (x > 0) {
      const n = idx - 1;
      if (!mask[n]) { mask[n] = 1; queue.push(n); }
    }
    if (x < w - 1) {
      const n = idx + 1;
      if (!mask[n]) { mask[n] = 1; queue.push(n); }
    }
    if (y > 0) {
      const n = idx - w;
      if (!mask[n]) { mask[n] = 1; queue.push(n); }
    }
    if (y < h - 1) {
      const n = idx + w;
      if (!mask[n]) { mask[n] = 1; queue.push(n); }
    }
  }

  // Aplicar mask al canal alpha.
  for (let i = 0; i < total; i++) {
    if (mask[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  // Feather: para cada pixel opaco que tenga vecino transparente, bajar alpha
  // un poco. Suaviza bordes duros sin requerir gauss completo.
  for (let pass = 0; pass < featherPasses; pass++) {
    const snapshot = new Uint8Array(total);
    for (let i = 0; i < total; i++) snapshot[i] = mask[i];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (snapshot[idx]) continue;
        const neighbors =
          snapshot[idx - 1] +
          snapshot[idx + 1] +
          snapshot[idx - w] +
          snapshot[idx + w];
        if (neighbors >= 2) {
          // Borde suavizable.
          data[idx * 4 + 3] = Math.min(data[idx * 4 + 3], 160);
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const cleaned = canvas.toDataURL('image/png');

  return {
    cleaned,
    removedRatio: removed / total,
    detection,
  };
}

// Variante interna que no recarga la imagen — reusa el ImageData ya extraido.
async function detectBackgroundFromData(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): Promise<BgDetection> {
  const corners = sampleCorners(data, w, h);
  const avg = corners.reduce(
    (acc, c) => ({ r: acc.r + c.r / 4, g: acc.g + c.g / 4, b: acc.b + c.b / 4 }),
    { r: 0, g: 0, b: 0 },
  );
  const avgDist =
    corners.reduce(
      (acc, c) => acc + colorDistance(c.r, c.g, c.b, avg.r, avg.g, avg.b),
      0,
    ) / corners.length;
  const borderUniformity = Math.max(0, 1 - avgDist / 80);
  const borderLuminance = relLuminance(avg.r, avg.g, avg.b);
  const lightBg = borderLuminance > 0.6 ? borderLuminance : 0;
  const darkUniform = borderLuminance < 0.15 && borderUniformity > 0.85 ? 0.6 : 0;
  const confidence = Math.max(
    Math.min(1, borderUniformity * (0.4 + lightBg)),
    darkUniform,
  );
  return {
    borderColor: { r: Math.round(avg.r), g: Math.round(avg.g), b: Math.round(avg.b) },
    borderUniformity,
    borderLuminance,
    confidence,
  };
}
