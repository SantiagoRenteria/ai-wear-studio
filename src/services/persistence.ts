// HU-12.4 — Persistencia automatica del trabajo en curso.
// Guarda hasta MAX_SESSIONS sesiones en localStorage, cada una con un id unico
// y timestamp. La sesion "actual" (la que se esta editando) se identifica por
// CURRENT_SESSION_KEY; las demas viven en SESSIONS_KEY.

import { ColorOption, Garment, LayersSnapshot, ViewType } from '../types';

const STORAGE_PREFIX = 'aiwear:';
const SESSIONS_KEY = STORAGE_PREFIX + 'sessions';
const CURRENT_SESSION_KEY = STORAGE_PREFIX + 'currentSessionId';

export const MAX_SESSIONS = 5;
const STORAGE_VERSION = 1;

export interface PersistedSession {
  id: string;
  version: number;
  updatedAt: number;
  createdAt: number;
  garment: Garment;
  selectedColor: ColorOption;
  selectedSize: string;
  currentView: ViewType;
  layers: LayersSnapshot;
}

export interface SessionSummary {
  id: string;
  updatedAt: number;
  createdAt: number;
  garmentName: string;
  garmentEmoji?: string;
  colorHex: string;
  layerCount: number;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readSessions(): PersistedSession[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  return safeParse<PersistedSession[]>(window.localStorage.getItem(SESSIONS_KEY), []);
}

function writeSessions(sessions: PersistedSession[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    // Si se llena el localStorage, podamos las sesiones mas viejas y reintentamos.
    if (sessions.length > 1) {
      const trimmed = [...sessions]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, Math.max(1, sessions.length - 1));
      try {
        window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
      } catch {
        // Si sigue fallando, dejamos pasar — no queremos romper la app por autosave.
        console.warn('[persistence] No se pudo guardar la sesion en localStorage', err);
      }
    } else {
      console.warn('[persistence] No se pudo guardar la sesion en localStorage', err);
    }
  }
}

export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(CURRENT_SESSION_KEY);
}

export function setCurrentSessionId(id: string | null) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (id) {
    window.localStorage.setItem(CURRENT_SESSION_KEY, id);
  } else {
    window.localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function listSessions(): PersistedSession[] {
  return [...readSessions()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function listSessionSummaries(): SessionSummary[] {
  return listSessions().map((s) => ({
    id: s.id,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
    garmentName: s.garment.name,
    garmentEmoji: s.garment.emoji,
    colorHex: s.selectedColor.hex,
    layerCount:
      s.layers.front.length +
      s.layers.back.length +
      s.layers.left_sleeve.length +
      s.layers.right_sleeve.length,
  }));
}

export function getSession(id: string): PersistedSession | null {
  return readSessions().find((s) => s.id === id) ?? null;
}

export function deleteSession(id: string) {
  writeSessions(readSessions().filter((s) => s.id !== id));
  if (getCurrentSessionId() === id) setCurrentSessionId(null);
}

export interface SaveSessionInput {
  id: string;
  garment: Garment;
  selectedColor: ColorOption;
  selectedSize: string;
  currentView: ViewType;
  layers: LayersSnapshot;
}

export function saveSession(input: SaveSessionInput): PersistedSession {
  const sessions = readSessions();
  const now = Date.now();
  const existing = sessions.find((s) => s.id === input.id);
  const next: PersistedSession = {
    id: input.id,
    version: STORAGE_VERSION,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
    garment: input.garment,
    selectedColor: input.selectedColor,
    selectedSize: input.selectedSize,
    currentView: input.currentView,
    layers: input.layers,
  };

  const others = sessions.filter((s) => s.id !== input.id);
  const all = [next, ...others]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS);

  writeSessions(all);
  setCurrentSessionId(input.id);
  return next;
}

export function isSessionEmpty(layers: LayersSnapshot): boolean {
  return (
    layers.front.length === 0 &&
    layers.back.length === 0 &&
    layers.left_sleeve.length === 0 &&
    layers.right_sleeve.length === 0
  );
}

/** Devuelve la mejor candidata para "Retomar diseño": la mas reciente con capas. */
export function findResumableSession(): PersistedSession | null {
  return listSessions().find((s) => !isSessionEmpty(s.layers)) ?? null;
}
