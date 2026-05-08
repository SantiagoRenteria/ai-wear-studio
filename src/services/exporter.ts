// HU-4.3 — Exporter del preview con watermark.
//
// CanvasEngine registra una funcion exportPreview() al montar; App.tsx la llama
// desde el boton "Descargar PNG". El export genera un PNG 1080x1080 con el
// mockup de la prenda al fondo, las capas Konva en el centro y el watermark
// "made with AI Wear Studio" en la esquina inferior derecha.

let exporter: (() => Promise<string | null>) | null = null;

/** Registra la funcion de export. Llamada desde CanvasEngine.useEffect. */
export function registerExporter(fn: () => Promise<string | null>) {
  exporter = fn;
}

/** Devuelve un dataURL del PNG, o null si no hay exporter o algo falla. */
export async function exportPreviewPng(): Promise<string | null> {
  if (!exporter) return null;
  try {
    return await exporter();
  } catch (err) {
    console.error('[exporter] export fallo:', err);
    return null;
  }
}

/* ---------------- helpers de composicion ---------------- */

/** Convierte un nodo SVG a un blob URL compatible con <img>. */
export function svgNodeToDataUrl(svg: SVGElement): string {
  const clone = svg.cloneNode(true) as SVGElement;
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const xml = new XMLSerializer().serializeToString(clone);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}

/** Carga una imagen desde dataURL/URL y la devuelve cuando termina de decode. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** Dibuja el watermark "made with AI Wear Studio" en la esquina inferior derecha. */
export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const padding = Math.round(w * 0.025);
  const fontSize = Math.round(w * 0.018);
  ctx.save();
  ctx.font = '700 ' + fontSize + 'px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  // Sombra blanca para que sea legible sobre cualquier fondo.
  ctx.shadowColor = 'rgba(255,255,255,0.7)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.fillText('made with AI Wear Studio', w - padding, h - padding);
  ctx.restore();
}
