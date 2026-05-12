export type ViewType = 'front' | 'back' | 'left_sleeve' | 'right_sleeve';

export type Gender = 'male' | 'female' | 'unisex';

export type GarmentType =
  | 't-shirt'
  | 'polo'
  | 'tank-top'
  | 'long-sleeve'
  | 'hoodie'
  | 'sweatshirt'
  | 'shorts'
  | 'sweatpants'
  | 'cap';

export enum PlacementZone {
  LeftChest = 'LeftChest',
  CenterChest = 'CenterChest',
  FullFront = 'FullFront',
  UpperBack = 'UpperBack',
  FullBack = 'FullBack',
  LeftSleeve = 'LeftSleeve',
  RightSleeve = 'RightSleeve',
  Front = 'Front'
}

export interface ColorOption {
  name: string;
  hex: string;
  premium?: boolean;
}

export interface Layer {
  id: string;
  type: 'image' | 'text' | 'ai';
  content: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  zIndex: number;
  placementZone: PlacementZone;
  hidden?: boolean;
  name?: string;
  textEffect?: 'none' | 'stroke' | 'shadow' | 'glow' | 'neon' | 'gradient' | '3d';
  strokeColor?: string;
  letterSpacing?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export interface Garment {
  id: string;
  name: string;
  type: GarmentType;
  gender: Gender;
  basePrice: number;
  availableSizes: string[];
  availableColors: ColorOption[];
  description?: string;
  emoji?: string;
  /** Vistas que aplican a esta prenda. Default: todas (4). */
  availableViews?: ViewType[];
}

export interface ProductState {
  garment: Garment;
  selectedColor: ColorOption;
  selectedSize: string;
  decorationMethod: 'DTG' | 'ScreenPrint' | 'Embroidery';
}

export interface DesignState {
  layers: Record<ViewType, Layer[]>;
}

export interface SessionState {
  user: {
    id: string;
    email: string;
    isGuest: boolean;
  } | null;
}

export type LayersSnapshot = Record<ViewType, Layer[]>;

/**
 * Override por zona (garmentType:view:zoneId). Cuando un campo esta seteado,
 * reemplaza el inset por defecto del catalogo. Insets absolutos en fracciones (0..1).
 */
export interface ZoneOverride {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface UploadDraft {
  originalImage: string | null;
  cleanedImage: string | null;
  tempImage: string | null;
  keepOriginal: boolean;
  tempScale: number;
  tempRotation: number;
  /** Si esta seteado, el drawer edita la capa existente en vivo en lugar de crear una nueva. */
  editLayerId?: string | null;
  editView?: 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | null;
}

export interface HydratePayload {
  garment: Garment;
  selectedColor: ColorOption;
  selectedSize: string;
  currentView: ViewType;
  layers: LayersSnapshot;
}

export interface AppState extends SessionState, ProductState, DesignState {
  currentView: ViewType;
  activeLayerId: string | null;
  selectedQuantity: number;

  history: LayersSnapshot[];
  redoStack: LayersSnapshot[];

  setGarment: (garment: Garment) => void;
  setColor: (color: ColorOption) => void;
  setSize: (size: string) => void;
  setQuantity: (quantity: number) => void;
  setView: (view: ViewType) => void;
  addLayer: (view: ViewType, layer: Omit<Layer, 'id' | 'zIndex'>) => void;
  updateLayer: (view: ViewType, id: string, updates: Partial<Layer>) => void;
  removeLayer: (view: ViewType, id: string) => void;
  setActiveLayer: (id: string | null) => void;
  toggleLayerVisibility: (view: ViewType, id: string) => void;
  reorderLayer: (view: ViewType, id: string, direction: 'up' | 'down') => void;
  duplicateLayer: (view: ViewType, id: string) => void;
  undo: () => void;
  redo: () => void;

  hydrate: (payload: HydratePayload) => void;

  uploadDraft: UploadDraft | null;
  setUploadDraft: (draft: UploadDraft | null) => void;

  canvasStageSize: { width: number; height: number };
  setCanvasStageSize: (size: { width: number; height: number }) => void;

  /** Overrides de zona por key 'garmentType:view:zoneId'. */
  customZones: Record<string, ZoneOverride>;
  setCustomZone: (key: string, override: ZoneOverride) => void;
  resetCustomZone: (key: string) => void;

  /** Zona seleccionada para edicion en el RightPanel (sincroniza con el highlight del canvas). */
  editingZoneId: string | null;
  setEditingZoneId: (id: string | null) => void;

  /** Zonas custom agregadas por el usuario por garmentType:view. */
  customZoneEntries: Record<string, CustomZoneEntry[]>;
  addCustomZone: (key: string, zone: CustomZoneEntry) => void;
  removeCustomZone: (key: string, zoneId: string) => void;
}

/** Definicion de zona personalizada agregada por el usuario. */
export interface CustomZoneEntry {
  id: string;
  label: string;
  technique: 'DTG' | 'ScreenPrint' | 'Embroidery' | 'DTF' | 'HeatTransfer';
  top: number;
  right: number;
  bottom: number;
  left: number;
}
