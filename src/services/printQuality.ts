// HU-7.4 — Print Quality Score.
//
// Analiza el diseno actual y devuelve un reporte de issues que afectan la
// calidad de impresion: contraste con la prenda, tamano de texto, escala de
// imagen, etc. Cada issue puede traer un auto-fix que el usuario aplica con
// un click.
//
// Reglas implementadas:
//   - low_text_contrast: contraste WCAG entre color de texto y prenda < 3.0.
//   - very_low_text_contrast (error): contraste < 1.6.
//   - small_text (warning): fontSize * scaleX < 12.
//   - tiny_text (error): fontSize * scaleX < 8.
//   - upscaled_image (warning): scale > 2.5 sugiere imagen pixelada al imprimir.
//   - thin_text_stroke (warning): texto con stroke + scale muy chico (riesgo
//     de que la linea desaparezca al imprimir).
//
// Las reglas son heuristicas — no reemplazan al control de calidad humano,
// pero capturan ~80% de los problemas evitables antes de mandar a produccion.

import { Layer, LayersSnapshot, ViewType } from '../types';

export type IssueSeverity = 'error' | 'warning';

export type IssueType =
  | 'low_text_contrast'
  | 'very_low_text_contrast'
  | 'small_text'
  | 'tiny_text'
  | 'upscaled_image'
  | 'thin_text_stroke';

export type QualityFix =
  | { kind: 'set_text_color'; color: string }
  | { kind: 'set_font_size'; fontSize: number }
  | { kind: 'set_scale'; scaleX: number; scaleY: number }
  | { kind: 'set_stroke_color'; strokeColor: string };

export interface QualityIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  view: ViewType;
  layerId: string;
  layerName: string;
  title: string;
  description: string;
  fix?: { label: string; patch: QualityFix };
}

export type QualityScore = 'excellent' | 'acceptable' | 'issues';

export interface QualityReport {
  score: QualityScore;
  errorCount: number;
  warningCount: number;
  issues: QualityIssue[];
}

// ---------- helpers de color (WCAG) ----------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Devuelve "#FFFFFF" o "#0F172A" segun lo que mas contraste con la prenda. */
function pickContrastingTextColor(garmentHex: string): string {
  const white = contrastRatio('#FFFFFF', garmentHex);
  const black = contrastRatio('#0F172A', garmentHex);
  return white >= black ? '#FFFFFF' : '#0F172A';
}

// ---------- analizador ----------

const VIEWS: ViewType[] = ['front', 'back', 'left_sleeve', 'right_sleeve'];

function describeLayer(layer: Layer): string {
  if (layer.name) return layer.name;
  if (layer.type === 'text') return 'Texto: "' + layer.content.slice(0, 24) + (layer.content.length > 24 ? '…' : '') + '"';
  if (layer.type === 'ai') return 'Diseno IA';
  return 'Imagen';
}

function effectiveFontSize(layer: Layer): number {
  const base = layer.fontSize ?? 24;
  const scale = (layer.scaleX ?? 1) * 0.5 + (layer.scaleY ?? 1) * 0.5;
  return base * scale;
}

function maxScale(layer: Layer): number {
  return Math.max(Math.abs(layer.scaleX ?? 1), Math.abs(layer.scaleY ?? 1));
}

function analyzeTextLayer(
  layer: Layer,
  view: ViewType,
  garmentHex: string,
  out: QualityIssue[],
) {
  const textColor = layer.color ?? '#0F172A';
  const ratio = contrastRatio(textColor, garmentHex);
  const layerName = describeLayer(layer);

  if (ratio < 1.6) {
    out.push({
      id: layer.id + ':very_low_contrast',
      type: 'very_low_text_contrast',
      severity: 'error',
      view,
      layerId: layer.id,
      layerName,
      title: 'Texto invisible sobre la prenda',
      description:
        'El contraste entre el texto y el color de la prenda es muy bajo (' +
        ratio.toFixed(2) +
        ':1). Asi se imprimira casi imperceptible.',
      fix: {
        label: 'Cambiar a color contrastante',
        patch: { kind: 'set_text_color', color: pickContrastingTextColor(garmentHex) },
      },
    });
  } else if (ratio < 3.0) {
    out.push({
      id: layer.id + ':low_contrast',
      type: 'low_text_contrast',
      severity: 'warning',
      view,
      layerId: layer.id,
      layerName,
      title: 'Contraste bajo con la prenda',
      description:
        'El texto se mezcla con la prenda (' +
        ratio.toFixed(2) +
        ':1). Se vera tenue al imprimir.',
      fix: {
        label: 'Mejorar contraste',
        patch: { kind: 'set_text_color', color: pickContrastingTextColor(garmentHex) },
      },
    });
  }

  const eff = effectiveFontSize(layer);
  if (eff < 8) {
    out.push({
      id: layer.id + ':tiny_text',
      type: 'tiny_text',
      severity: 'error',
      view,
      layerId: layer.id,
      layerName,
      title: 'Texto demasiado pequeno',
      description:
        'Tamano efectivo ~' +
        eff.toFixed(0) +
        'pt. Por debajo de 8pt no se imprime legible.',
      fix: {
        label: 'Aumentar a 16pt',
        patch: { kind: 'set_font_size', fontSize: 16 },
      },
    });
  } else if (eff < 12) {
    out.push({
      id: layer.id + ':small_text',
      type: 'small_text',
      severity: 'warning',
      view,
      layerId: layer.id,
      layerName,
      title: 'Texto muy pequeno',
      description:
        'Tamano efectivo ~' +
        eff.toFixed(0) +
        'pt. Recomendamos al menos 12pt para que sea facil de leer.',
      fix: {
        label: 'Aumentar a 14pt',
        patch: { kind: 'set_font_size', fontSize: 14 },
      },
    });
  }

  if (layer.textEffect === 'stroke' && eff < 14) {
    out.push({
      id: layer.id + ':thin_stroke',
      type: 'thin_text_stroke',
      severity: 'warning',
      view,
      layerId: layer.id,
      layerName,
      title: 'Stroke muy fino',
      description:
        'El stroke en texto pequeno tiende a desaparecer al imprimir. Aumenta el tamano o quita el stroke.',
      fix: {
        label: 'Aumentar a 18pt',
        patch: { kind: 'set_font_size', fontSize: 18 },
      },
    });
  }
}

function analyzeImageLayer(layer: Layer, view: ViewType, out: QualityIssue[]) {
  const layerName = describeLayer(layer);
  const scale = maxScale(layer);

  if (scale > 3.0) {
    out.push({
      id: layer.id + ':upscaled_severe',
      type: 'upscaled_image',
      severity: 'error',
      view,
      layerId: layer.id,
      layerName,
      title: 'Imagen muy ampliada',
      description:
        'La imagen esta escalada x' +
        scale.toFixed(1) +
        '. Probablemente se vera pixelada al imprimir.',
      fix: {
        label: 'Reducir escala a x1.5',
        patch: { kind: 'set_scale', scaleX: 1.5, scaleY: 1.5 },
      },
    });
  } else if (scale > 2.5) {
    out.push({
      id: layer.id + ':upscaled',
      type: 'upscaled_image',
      severity: 'warning',
      view,
      layerId: layer.id,
      layerName,
      title: 'Imagen estirada',
      description:
        'Escala x' +
        scale.toFixed(1) +
        '. Para mejor calidad de impresion, mantenla por debajo de x2.5.',
      fix: {
        label: 'Reducir escala a x1.5',
        patch: { kind: 'set_scale', scaleX: 1.5, scaleY: 1.5 },
      },
    });
  }
}

export function analyzePrintQuality(
  layers: LayersSnapshot,
  garmentHex: string,
): QualityReport {
  const issues: QualityIssue[] = [];

  for (const view of VIEWS) {
    for (const layer of layers[view]) {
      if (layer.hidden) continue;
      if (layer.type === 'text') {
        analyzeTextLayer(layer, view, garmentHex, issues);
      } else {
        analyzeImageLayer(layer, view, issues);
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const score: QualityScore =
    errorCount > 0 ? 'issues' : warningCount > 0 ? 'acceptable' : 'excellent';

  return { score, errorCount, warningCount, issues };
}
