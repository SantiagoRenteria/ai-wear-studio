import { Garment, Gender } from '../types';

const SIZES_TOP_MALE = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SIZES_TOP_FEMALE = ['XS', 'S', 'M', 'L', 'XL'];
const SIZES_TOP_UNISEX = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SIZES_BOTTOM_MALE = ['S', 'M', 'L', 'XL', 'XXL'];
const SIZES_BOTTOM_FEMALE = ['XS', 'S', 'M', 'L', 'XL'];
const SIZES_CAP = ['S/M', 'M/L', 'L/XL'];

const STANDARD_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#0F172A' },
  { name: 'Navy', hex: '#1B2735' },
  { name: 'Red', hex: '#E21A1A' },
  { name: 'Stone', hex: '#D6D3D1', premium: true },
  { name: 'Olive', hex: '#65735A', premium: true },
  { name: 'Sand', hex: '#E7D5B7', premium: true },
  { name: 'Pink', hex: '#FBCFE8', premium: true },
];

const HOODIE_COLORS = [
  { name: 'Heather Gray', hex: '#A8A8A8' },
  { name: 'Black', hex: '#0F172A' },
  { name: 'Navy', hex: '#1B2735' },
  { name: 'Forest', hex: '#1F3D2B', premium: true },
  { name: 'Burgundy', hex: '#7C2D12', premium: true },
  { name: 'Cream', hex: '#FAF7F0' },
  { name: 'Pink', hex: '#FBCFE8', premium: true },
  { name: 'Olive', hex: '#65735A', premium: true },
];

const NEUTRAL_COLORS = [
  { name: 'Black', hex: '#0F172A' },
  { name: 'Navy', hex: '#1B2735' },
  { name: 'Gray', hex: '#94A3B8' },
  { name: 'Khaki', hex: '#A89F6E', premium: true },
  { name: 'White', hex: '#FFFFFF' },
];

export const GARMENT_CATALOG: Garment[] = [
  { id: 'tshirt-unisex', name: 'Camiseta Premium', type: 't-shirt', gender: 'unisex', basePrice: 24.99, availableSizes: SIZES_TOP_UNISEX, availableColors: STANDARD_COLORS, emoji: '👕', description: '100% algodón, fit clásico' },
  { id: 'tshirt-female', name: 'Camiseta Mujer', type: 't-shirt', gender: 'female', basePrice: 24.99, availableSizes: SIZES_TOP_FEMALE, availableColors: STANDARD_COLORS, emoji: '👚', description: 'Corte slim femenino' },
  { id: 'polo-male', name: 'Polo Hombre', type: 'polo', gender: 'male', basePrice: 34.99, availableSizes: SIZES_TOP_MALE, availableColors: STANDARD_COLORS, emoji: '🟦', description: 'Piqué clásico con cuello' },
  { id: 'tank-top', name: 'Tank Top', type: 'tank-top', gender: 'unisex', basePrice: 19.99, availableSizes: SIZES_TOP_UNISEX, availableColors: STANDARD_COLORS, emoji: '🎽', description: 'Sin mangas, ligero' },
  { id: 'long-sleeve', name: 'Manga Larga', type: 'long-sleeve', gender: 'unisex', basePrice: 29.99, availableSizes: SIZES_TOP_UNISEX, availableColors: STANDARD_COLORS, emoji: '🥼', description: 'Manga completa' },
  { id: 'hoodie-unisex', name: 'Sudadera con Capucha', type: 'hoodie', gender: 'unisex', basePrice: 49.99, availableSizes: SIZES_TOP_UNISEX, availableColors: HOODIE_COLORS, emoji: '🧥', description: 'Fleece pesado, capucha y bolsillo' },
  { id: 'sweatshirt', name: 'Buzo Crewneck', type: 'sweatshirt', gender: 'unisex', basePrice: 39.99, availableSizes: SIZES_TOP_UNISEX, availableColors: HOODIE_COLORS, emoji: '👔', description: 'Cuello redondo' },
  { id: 'shorts', name: 'Pantaloneta', type: 'shorts', gender: 'unisex', basePrice: 27.99, availableSizes: SIZES_BOTTOM_FEMALE, availableColors: NEUTRAL_COLORS, emoji: '🩳', description: 'Deportiva, secado rápido' },
  { id: 'sweatpants', name: 'Joggers', type: 'sweatpants', gender: 'unisex', basePrice: 39.99, availableSizes: SIZES_BOTTOM_MALE, availableColors: HOODIE_COLORS, emoji: '👖', description: 'Cintura elástica' },
  { id: 'cap', name: 'Gorra', type: 'cap', gender: 'unisex', basePrice: 22.99, availableSizes: SIZES_CAP, availableColors: NEUTRAL_COLORS, emoji: '🧢', description: 'Snapback frente plano' },
];

export function findGarmentById(id: string): Garment | undefined {
  return GARMENT_CATALOG.find((g) => g.id === id);
}

export function getSizeScale(size: string): number {
  const map: Record<string, number> = {
    XS: 0.86, S: 0.91, M: 0.96, L: 1.0, XL: 1.04, XXL: 1.08, '3XL': 1.12,
    'S/M': 0.94, 'M/L': 1.0, 'L/XL': 1.06,
  };
  return map[size] || 1.0;
}

export function getSizeMeasurements(size: string, type: string): string {
  if (type === 'cap') return 'Ajustable';
  const m: Record<string, { chest: number; length: number }> = {
    XS: { chest: 92, length: 64 }, S: { chest: 96, length: 66 }, M: { chest: 100, length: 68 },
    L: { chest: 104, length: 70 }, XL: { chest: 108, length: 72 }, XXL: { chest: 112, length: 74 },
    '3XL': { chest: 116, length: 76 },
  };
  const x = m[size];
  if (!x) return '';
  return 'Pecho ' + x.chest + ' cm · Largo ' + x.length + ' cm';
}

export function genderLabel(g: Gender): string {
  if (g === 'male') return 'Hombre';
  if (g === 'female') return 'Mujer';
  return 'Unisex';
}

/**
 * HU-7.x — Print zones por garment + view.
 *
 * Cada prenda tiene una o mas areas "imprimibles" segun su tipo y la cara
 * que se este editando. Devolvemos un ARRAY: la zona primaria (la que se
 * usa por defecto al crear una capa) viene marcada con `primary: true`.
 *
 * Convencion de insets: { top, right, bottom, left } como fracciones (0..1)
 * del contenedor cuadrado del mockup. La zona NUNCA puede superar
 * MAX_ZONE_AREA (= 0.8) del area de la prenda.
 */
import type { GarmentType, ViewType } from '../types';
import { PlacementZone } from '../types';

export interface PrintZone {
  id: PlacementZone;
  top: number;
  right: number;
  bottom: number;
  left: number;
  /** Etiqueta humana, e.g. "Pecho centro". */
  label: string;
  /** Tecnica de impresion recomendada para esta zona. */
  technique: 'DTG' | 'ScreenPrint' | 'Embroidery' | 'DTF' | 'HeatTransfer';
  /** Si esta marcada como primary, es la zona por defecto cuando se agrega una capa. */
  primary?: boolean;
}

export const MAX_ZONE_AREA = 0.8;

/** Calcula el area (0..1) que ocupa la zona dentro del contenedor de la prenda. */
export function zoneArea(z: { top: number; right: number; bottom: number; left: number }): number {
  return Math.max(0, (1 - z.top - z.bottom)) * Math.max(0, (1 - z.left - z.right));
}

/** Valida que la zona no exceda MAX_ZONE_AREA — usado en runtime para detectar regresiones. */
export function isValidZoneArea(z: PrintZone): boolean {
  return zoneArea(z) <= MAX_ZONE_AREA + 1e-6;
}

/* ---------- Definicion de zonas por garment+view ---------- */

const FALLBACK_ZONES: PrintZone[] = [{
  id: PlacementZone.CenterChest,
  top: 0.28, right: 0.32, bottom: 0.22, left: 0.32,
  label: 'Pecho centro', technique: 'DTG', primary: true,
}];

export function getPrintZones(type: GarmentType, view: ViewType): PrintZone[] {
  const key = type + ':' + view;
  switch (key) {
    /* === Camisetas, manga larga, sweatshirt — front: pecho centro + opcion logo izq === */
    case 't-shirt:front':
    case 'long-sleeve:front':
    case 'sweatshirt:front':
      return [
        { id: PlacementZone.CenterChest, top: 0.30, right: 0.32, bottom: 0.22, left: 0.32, label: 'Pecho centro', technique: 'DTG', primary: true },
        { id: PlacementZone.LeftChest, top: 0.30, right: 0.62, bottom: 0.55, left: 0.20, label: 'Pecho izquierdo', technique: 'Embroidery' },
      ];
    case 't-shirt:back':
    case 'long-sleeve:back':
    case 'sweatshirt:back':
      return [
        { id: PlacementZone.FullBack, top: 0.22, right: 0.30, bottom: 0.28, left: 0.30, label: 'Espalda completa', technique: 'DTG', primary: true },
        { id: PlacementZone.UpperBack, top: 0.18, right: 0.40, bottom: 0.62, left: 0.40, label: 'Cuello / etiqueta', technique: 'Embroidery' },
      ];
    case 't-shirt:left_sleeve':
    case 't-shirt:right_sleeve':
    case 'long-sleeve:left_sleeve':
    case 'long-sleeve:right_sleeve':
    case 'sweatshirt:left_sleeve':
    case 'sweatshirt:right_sleeve':
      return [{ id: PlacementZone.LeftSleeve, top: 0.40, right: 0.40, bottom: 0.40, left: 0.40, label: 'Manga', technique: 'HeatTransfer', primary: true }];

    /* === Polo === */
    case 'polo:front':
      return [
        { id: PlacementZone.LeftChest, top: 0.30, right: 0.50, bottom: 0.42, left: 0.20, label: 'Pecho izquierdo', technique: 'Embroidery', primary: true },
        { id: PlacementZone.CenterChest, top: 0.40, right: 0.34, bottom: 0.30, left: 0.34, label: 'Pecho centro', technique: 'DTF' },
      ];
    case 'polo:back':
      return [{ id: PlacementZone.FullBack, top: 0.28, right: 0.34, bottom: 0.30, left: 0.34, label: 'Espalda', technique: 'Embroidery', primary: true }];
    case 'polo:left_sleeve':
    case 'polo:right_sleeve':
      return [{ id: PlacementZone.LeftSleeve, top: 0.42, right: 0.42, bottom: 0.42, left: 0.42, label: 'Manga', technique: 'Embroidery', primary: true }];

    /* === Tank-top === */
    case 'tank-top:front':
      return [{ id: PlacementZone.CenterChest, top: 0.28, right: 0.36, bottom: 0.24, left: 0.36, label: 'Pecho centro', technique: 'DTG', primary: true }];
    case 'tank-top:back':
      return [{ id: PlacementZone.FullBack, top: 0.22, right: 0.34, bottom: 0.28, left: 0.34, label: 'Espalda completa', technique: 'DTG', primary: true }];

    /* === Hoodie === */
    case 'hoodie:front':
      return [
        { id: PlacementZone.CenterChest, top: 0.24, right: 0.32, bottom: 0.42, left: 0.32, label: 'Pecho sobre bolsillo', technique: 'DTF', primary: true },
        { id: PlacementZone.LeftChest, top: 0.26, right: 0.62, bottom: 0.58, left: 0.22, label: 'Pecho izquierdo', technique: 'Embroidery' },
      ];
    case 'hoodie:back':
      return [{ id: PlacementZone.FullBack, top: 0.22, right: 0.28, bottom: 0.28, left: 0.28, label: 'Espalda completa', technique: 'DTF', primary: true }];
    case 'hoodie:left_sleeve':
    case 'hoodie:right_sleeve':
      return [{ id: PlacementZone.LeftSleeve, top: 0.40, right: 0.40, bottom: 0.40, left: 0.40, label: 'Manga', technique: 'HeatTransfer', primary: true }];

    /* === Shorts === */
    case 'shorts:front':
      return [{ id: PlacementZone.LeftChest, top: 0.36, right: 0.55, bottom: 0.40, left: 0.18, label: 'Cadera izquierda', technique: 'Embroidery', primary: true }];
    case 'shorts:back':
      return [{ id: PlacementZone.UpperBack, top: 0.32, right: 0.20, bottom: 0.42, left: 0.55, label: 'Bolsillo trasero', technique: 'Embroidery', primary: true }];

    /* === Sweatpants === */
    case 'sweatpants:front':
      return [{ id: PlacementZone.LeftChest, top: 0.45, right: 0.55, bottom: 0.30, left: 0.18, label: 'Muslo izquierdo', technique: 'Embroidery', primary: true }];
    case 'sweatpants:back':
      return [{ id: PlacementZone.UpperBack, top: 0.30, right: 0.20, bottom: 0.50, left: 0.55, label: 'Bolsillo trasero', technique: 'Embroidery', primary: true }];

    /* === Cap === */
    case 'cap:front':
      return [{ id: PlacementZone.Front, top: 0.34, right: 0.36, bottom: 0.40, left: 0.36, label: 'Frente', technique: 'Embroidery', primary: true }];
    case 'cap:back':
      return [{ id: PlacementZone.UpperBack, top: 0.40, right: 0.38, bottom: 0.42, left: 0.38, label: 'Cierre trasero', technique: 'Embroidery', primary: true }];

    default:
      return FALLBACK_ZONES;
  }
}

/**
 * Aplica un override (insets absolutos opcionales) a una zona.
 * Clampea cada inset para que la zona se mantenga dentro de la prenda y
 * conserve un area minima de 5% en cada eje.
 */
export function applyZoneOverride(
  zone: PrintZone,
  override: { top?: number; right?: number; bottom?: number; left?: number },
): PrintZone {
  const minSide = 0.05;
  const maxInset = 0.95;
  const top = Math.max(0, Math.min(maxInset, override.top ?? zone.top));
  const right = Math.max(0, Math.min(maxInset, override.right ?? zone.right));
  const bottom = Math.max(0, Math.min(maxInset, override.bottom ?? zone.bottom));
  const left = Math.max(0, Math.min(maxInset, override.left ?? zone.left));
  // Si la combinacion deja menos de 5% de ancho o alto, descartamos el override.
  if (1 - top - bottom < minSide || 1 - left - right < minSide) return zone;
  return { ...zone, top, left, right, bottom };
}

/** Key uniforme para el customZones del store. */
export function zoneKey(type: GarmentType, view: ViewType, zoneId: string): string {
  return type + ':' + view + ':' + zoneId;
}

/**
 * Devuelve la lista de zonas activas para el usuario.
 * Por default solo la zona PRIMARY del catalogo + las zonas custom que el
 * usuario haya agregado. Las zonas secundarias del catalogo (e.g. "Pecho
 * izquierdo" en t-shirt) NO se muestran automaticamente; el usuario las
 * agrega con "+ Zona" si las necesita.
 */
export function getAllZones(
  type: GarmentType,
  view: ViewType,
  customEntries: { id: string; label: string; technique: PrintZone['technique']; top: number; right: number; bottom: number; left: number }[] = [],
): PrintZone[] {
  const catalogZones = getPrintZones(type, view);
  // Solo incluir la zona primaria del catalogo por default.
  const primaryOnly = catalogZones.filter((z) => z.primary);
  const fallback = primaryOnly.length === 0 && catalogZones.length > 0 ? [catalogZones[0]] : primaryOnly;
  const customMapped: PrintZone[] = customEntries.map((e) => ({
    id: e.id as any,
    label: e.label,
    technique: e.technique,
    top: e.top, right: e.right, bottom: e.bottom, left: e.left,
  }));
  return [...fallback, ...customMapped];
}

/** Devuelve TODAS las zonas del catalogo (presets disponibles para "+ Zona"). */
export function getCatalogPresets(type: GarmentType, view: ViewType): PrintZone[] {
  return getPrintZones(type, view);
}

/** Genera un id unico para una zona custom. */
export function generateCustomZoneId(): string {
  return 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

/** Devuelve la zona primaria del garment+view. */
export function getPrimaryZone(type: GarmentType, view: ViewType): PrintZone {
  const zones = getPrintZones(type, view);
  return zones.find((z) => z.primary) ?? zones[0];
}

/** Devuelve la zona que matchea el placementZone de la capa, o la primaria si no encuentra. */
export function getZoneByPlacement(
  type: GarmentType, view: ViewType, placement: PlacementZone,
): PrintZone {
  const zones = getPrintZones(type, view);
  return zones.find((z) => z.id === placement) ?? zones.find((z) => z.primary) ?? zones[0];
}

/** Compatibilidad con el codigo previo: devuelve la zona primaria. */
export function getPrintZone(type: GarmentType, view: ViewType): PrintZone {
  return getPrimaryZone(type, view);
}

/**
 * Vistas disponibles segun el tipo de prenda. Si el garment define availableViews
 * lo respetamos; en caso contrario, derivamos por tipo.
 */
export function getAvailableViews(g: Garment): ViewType[] {
  if (g.availableViews && g.availableViews.length > 0) return g.availableViews;
  switch (g.type) {
    case 'tank-top':
    case 'shorts':
    case 'sweatpants':
    case 'cap':
      return ['front', 'back'];
    default:
      return ['front', 'back', 'left_sleeve', 'right_sleeve'];
  }
}

/** Etiqueta legible de la tecnica de impresion. */
export function techniqueLabel(t: PrintZone['technique']): string {
  switch (t) {
    case 'DTG': return 'DTG (impresion directa)';
    case 'ScreenPrint': return 'Serigrafia';
    case 'Embroidery': return 'Bordado';
    case 'DTF': return 'DTF (transfer)';
    case 'HeatTransfer': return 'Vinilo termico';
  }
}

/**
 * Calcula la transicion de scale + posicion al mover una capa entre zonas.
 * - shrinkRatio: factor a aplicar al scale (cap 1 — nunca auto-grow).
 * - x, y: nueva posicion sugerida (10% margin del nuevo stage).
 *
 * stagePxW / stagePxH son las dimensiones actuales del stage en pixels (zona vieja).
 */
export function computeZoneTransition(
  oldZone: PrintZone,
  newZone: PrintZone,
  stagePxW: number,
  stagePxH: number,
): { shrinkRatio: number; x: number; y: number } {
  const oldW = Math.max(1e-6, 1 - oldZone.left - oldZone.right);
  const oldH = Math.max(1e-6, 1 - oldZone.top - oldZone.bottom);
  const newW = Math.max(1e-6, 1 - newZone.left - newZone.right);
  const newH = Math.max(1e-6, 1 - newZone.top - newZone.bottom);
  const widthRatio = newW / oldW;
  const heightRatio = newH / oldH;
  const shrinkRatio = Math.min(widthRatio, heightRatio, 1);
  const newStageW = (stagePxW || 220) * widthRatio;
  const newStageH = (stagePxH || 280) * heightRatio;
  return {
    shrinkRatio,
    x: Math.round(newStageW * 0.10),
    y: Math.round(newStageH * 0.10),
  };
}

/* Validacion en dev: si alguna zona excede MAX_ZONE_AREA, lo logueamos para
   que se note en el desarrollo. */
if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
  const types: GarmentType[] = ['t-shirt', 'polo', 'tank-top', 'long-sleeve', 'hoodie', 'sweatshirt', 'shorts', 'sweatpants', 'cap'];
  const views: ViewType[] = ['front', 'back', 'left_sleeve', 'right_sleeve'];
  for (const t of types) for (const v of views) {
    for (const z of getPrintZones(t, v)) {
      if (!isValidZoneArea(z)) {
        // eslint-disable-next-line no-console
        console.warn('[catalog] Zone excede MAX_ZONE_AREA:', t, v, z.id, 'area=' + zoneArea(z).toFixed(3));
      }
    }
  }
}
