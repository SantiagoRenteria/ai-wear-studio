const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export interface CatalogViewDto {
  id: string;
  viewName: string;
}

export interface CatalogColorDto {
  id: string;
  colorName: string;
  hexCode: string;
}

export interface CatalogGarmentDto {
  id: string;
  name: string;
  category: string;
  colors: CatalogColorDto[];
  views: CatalogViewDto[];
}

export interface CatalogPrintZoneDto {
  id: string;
  name: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  heightCm: number;
  recommendedTechnique: string | null;
}

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export function fetchGarments(token: string): Promise<CatalogGarmentDto[]> {
  return apiFetch<CatalogGarmentDto[]>('/api/v1/catalog/garments', token);
}

export function fetchZones(
  garmentId: string,
  viewId: string,
  token: string,
): Promise<CatalogPrintZoneDto[]> {
  return apiFetch<CatalogPrintZoneDto[]>(
    `/api/v1/catalog/garments/${garmentId}/views/${viewId}/zones`,
    token,
  );
}

const SIZE_MAP: Record<string, string[]> = {
  'Camiseta MC':     ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Camiseta ML':     ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Polo':            ['S', 'M', 'L', 'XL', 'XXL'],
  'Buzo Crewneck':   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Hoodie':          ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Chaqueta':        ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Pantalón':        ['S', 'M', 'L', 'XL', 'XXL'],
  'Pantaloneta':     ['S', 'M', 'L', 'XL'],
  'Gorra':           ['S/M', 'M/L', 'L/XL'],
  'Tote Bag':        ['Único'],
};
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function getSizesForCategory(category: string): string[] {
  return SIZE_MAP[category] ?? DEFAULT_SIZES;
}
