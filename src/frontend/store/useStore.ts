import { create } from 'zustand';
import { AppState, Layer, LayersSnapshot } from '../types';
import { GARMENT_CATALOG, getAvailableViews } from '../data/catalog';

const INITIAL_GARMENT = GARMENT_CATALOG[0];
const MAX_HISTORY = 30;

function cloneSnapshot(snapshot: LayersSnapshot): LayersSnapshot {
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot);
  }
  return JSON.parse(JSON.stringify(snapshot));
}

function pushHistory(state: AppState) {
  const snapshot = cloneSnapshot(state.layers);
  return {
    history: [...state.history, snapshot].slice(-MAX_HISTORY),
    redoStack: [],
  };
}

export const useStore = create<AppState>((set) => ({
  user: null,

  garment: INITIAL_GARMENT,
  selectedColor: INITIAL_GARMENT.availableColors[0],
  selectedSize: INITIAL_GARMENT.availableSizes[Math.floor(INITIAL_GARMENT.availableSizes.length / 2)],
  decorationMethod: 'DTG',

  currentView: 'front',
  activeLayerId: null,
  selectedQuantity: 1,
  layers: { front: [], back: [], left_sleeve: [], right_sleeve: [] },

  history: [],
  redoStack: [],

  setGarment: (garment) => set((state) => {
    // Si el color actual no existe en la nueva prenda, usar el primero
    const colorMatch = garment.availableColors.find(c => c.hex === state.selectedColor.hex);
    const newColor = colorMatch || garment.availableColors[0];
    // Mismo con la talla
    const sizeMatch = garment.availableSizes.includes(state.selectedSize);
    const newSize = sizeMatch ? state.selectedSize : garment.availableSizes[Math.floor(garment.availableSizes.length / 2)];
    // Si la vista actual no aplica al nuevo garment, switch a la primera disponible.
    const validViews = getAvailableViews(garment);
    const newView = validViews.includes(state.currentView) ? state.currentView : validViews[0];
    return { garment, selectedColor: newColor, selectedSize: newSize, currentView: newView };
  }),
  setColor: (selectedColor) => set({ selectedColor }),
  setSize: (selectedSize) => set({ selectedSize }),
  setQuantity: (selectedQuantity) => set({ selectedQuantity }),
  setView: (currentView) => set({ currentView, activeLayerId: null }),

  addLayer: (view, layerData) => set((state) => {
    const id = crypto.randomUUID();
    const maxZ = state.layers[view].reduce((m, l) => Math.max(m, l.zIndex), -1);
    const zIndex = maxZ + 1;
    const newLayer: Layer = { ...layerData, id, zIndex };
    return {
      ...pushHistory(state),
      layers: { ...state.layers, [view]: [...state.layers[view], newLayer] },
      activeLayerId: id,
    };
  }),

  updateLayer: (view, id, updates) => set((state) => ({
    ...pushHistory(state),
    layers: {
      ...state.layers,
      [view]: state.layers[view].map((l) => (l.id === id ? { ...l, ...updates } : l)),
    },
  })),

  removeLayer: (view, id) => set((state) => ({
    ...pushHistory(state),
    layers: {
      ...state.layers,
      [view]: state.layers[view].filter((l) => l.id !== id),
    },
    activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
  })),

  setActiveLayer: (activeLayerId) => set({ activeLayerId }),

  toggleLayerVisibility: (view, id) => set((state) => ({
    ...pushHistory(state),
    layers: {
      ...state.layers,
      [view]: state.layers[view].map((l) => (l.id === id ? { ...l, hidden: !l.hidden } : l)),
    },
  })),

  reorderLayer: (view, id, direction) => set((state) => {
    const ordered = [...state.layers[view]].sort((a, b) => a.zIndex - b.zIndex);
    const idx = ordered.findIndex((l) => l.id === id);
    if (idx === -1) return state;
    const swapWith = direction === 'up' ? idx + 1 : idx - 1;
    if (swapWith < 0 || swapWith >= ordered.length) return state;
    const a = ordered[idx];
    const b = ordered[swapWith];
    const newLayers = state.layers[view].map((l) => {
      if (l.id === a.id) return { ...l, zIndex: b.zIndex };
      if (l.id === b.id) return { ...l, zIndex: a.zIndex };
      return l;
    });
    return { ...pushHistory(state), layers: { ...state.layers, [view]: newLayers } };
  }),

  duplicateLayer: (view, id) => set((state) => {
    const original = state.layers[view].find((l) => l.id === id);
    if (!original) return state;
    const newId = crypto.randomUUID();
    const maxZ = state.layers[view].reduce((m, l) => Math.max(m, l.zIndex), -1);
    const clone: Layer = {
      ...original, id: newId, x: original.x + 20, y: original.y + 20, zIndex: maxZ + 1,
      name: original.name ? original.name + ' (copia)' : undefined,
    };
    return {
      ...pushHistory(state),
      layers: { ...state.layers, [view]: [...state.layers[view], clone] },
      activeLayerId: newId,
    };
  }),

  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    const previous = state.history[state.history.length - 1];
    return {
      history: state.history.slice(0, -1),
      redoStack: [...state.redoStack, cloneSnapshot(state.layers)].slice(-MAX_HISTORY),
      layers: previous,
      activeLayerId: null,
    };
  }),

  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state;
    const next = state.redoStack[state.redoStack.length - 1];
    return {
      redoStack: state.redoStack.slice(0, -1),
      history: [...state.history, cloneSnapshot(state.layers)].slice(-MAX_HISTORY),
      layers: next,
      activeLayerId: null,
    };
  }),

  // HU-12.4 — Restaurar estado completo desde una sesion persistida.
  // Limpia el historial para que el undo no devuelva al estado pre-hidratacion.
  hydrate: (payload) => set(() => ({
    garment: payload.garment,
    selectedColor: payload.selectedColor,
    selectedSize: payload.selectedSize,
    currentView: payload.currentView,
    layers: cloneSnapshot(payload.layers),
    activeLayerId: null,
    history: [],
    redoStack: [],
  })),

  // Bug-fix UX — borrador de upload persistente.
  uploadDraft: null,
  setUploadDraft: (draft) => set({ uploadDraft: draft }),

  // Bug-fix Vista Resumen — tamano de referencia del stage.
  canvasStageSize: { width: 240, height: 330 },
  setCanvasStageSize: (size) => set({ canvasStageSize: size }),

  // HU-7.x — overrides de zona arrastradas por el usuario.
  customZones: {},
  setCustomZone: (key, override) => set((state) => ({
    customZones: { ...state.customZones, [key]: override },
  })),
  resetCustomZone: (key) => set((state) => {
    const next = { ...state.customZones };
    delete next[key];
    return { customZones: next };
  }),

  editingZoneId: null,
  setEditingZoneId: (id) => set({ editingZoneId: id }),

  customZoneEntries: {},
  addCustomZone: (key, zone) => set((state) => ({
    customZoneEntries: {
      ...state.customZoneEntries,
      [key]: [...(state.customZoneEntries[key] || []), zone],
    },
  })),
  removeCustomZone: (key, zoneId) => set((state) => {
    const list = state.customZoneEntries[key] || [];
    return {
      customZoneEntries: {
        ...state.customZoneEntries,
        [key]: list.filter((z) => z.id !== zoneId),
      },
    };
  }),
}));
