// HU-15.1 — Rate limit visible + fingerprint del device.
//
// Estrategia: fingerprint local sin librerias externas (UA + idioma + screen +
// timezone + canvas hash) suficiente para desincentivar el abuso casual sin
// pretender ser inviolable. El estado se guarda en localStorage por device,
// con reset automatico a las 24h del primer uso del dia.
//
// Bypass: si la sesion tiene `purchaseHistory` (futuro: cuenta logueada con
// pedidos confirmados), no se aplica el limite.

const STORAGE_KEY = 'aiwear:rateLimit';
const FINGERPRINT_KEY = 'aiwear:fingerprint';
const PURCHASE_HISTORY_KEY = 'aiwear:purchaseHistory';

export const FREE_DAILY_LIMIT = 10;
const MS_24H = 24 * 60 * 60 * 1000;

export interface RateLimitState {
  fingerprint: string;
  /** Inicio del periodo (timestamp). Reseteamos al pasar 24h. */
  windowStart: number;
  /** Generaciones consumidas en el periodo actual. */
  used: number;
  /** Override manual via "Compra desbloquea ilimitado por sesion". */
  unlockedUntil?: number;
}

/* ---------- fingerprint ---------- */

async function canvasHash(): Promise<string> {
  if (typeof document === 'undefined') return 'no-doc';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-2d';
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('AI Wear Studio 🎨', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('AI Wear Studio 🎨', 4, 17);
    const data = canvas.toDataURL();
    // Hash simple djb2.
    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash) + data.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  } catch {
    return 'canvas-err';
  }
}

async function computeFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'ssr';
  const parts: string[] = [];
  parts.push(navigator.userAgent.slice(0, 80));
  parts.push(navigator.language);
  parts.push(String(screen.width) + 'x' + String(screen.height));
  parts.push(String(screen.colorDepth));
  parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'utc');
  parts.push(String(navigator.hardwareConcurrency || 0));
  parts.push(await canvasHash());
  // Hash final.
  const joined = parts.join('|');
  let hash = 0;
  for (let i = 0; i < joined.length; i++) {
    hash = ((hash << 5) - hash) + joined.charCodeAt(i);
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

export async function getOrCreateFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'ssr';
  const cached = window.localStorage.getItem(FINGERPRINT_KEY);
  if (cached) return cached;
  const fp = await computeFingerprint();
  try {
    window.localStorage.setItem(FINGERPRINT_KEY, fp);
  } catch { /* swallow */ }
  return fp;
}

/* ---------- estado ---------- */

function readState(): RateLimitState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RateLimitState;
  } catch {
    return null;
  }
}

function writeState(state: RateLimitState) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* swallow */ }
}

function rolloverIfNeeded(state: RateLimitState, now: number): RateLimitState {
  if (now - state.windowStart >= MS_24H) {
    return { ...state, windowStart: now, used: 0 };
  }
  return state;
}

export function hasPurchaseHistory(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  const raw = window.localStorage.getItem(PURCHASE_HISTORY_KEY);
  if (!raw) return false;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
}

/** Marcar la sesion actual como "comprador" — desbloquea el limite por 24h. */
export function unlockForSession(durationMs: number = MS_24H) {
  const fp = window.localStorage.getItem(FINGERPRINT_KEY) || 'unknown';
  const state: RateLimitState = readState() ?? {
    fingerprint: fp, windowStart: Date.now(), used: 0,
  };
  state.unlockedUntil = Date.now() + durationMs;
  writeState(state);
}

/** Registrar un pedido confirmado (futuro: viene del checkout success). */
export function recordPurchase(orderId: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  let arr: string[] = [];
  try {
    arr = JSON.parse(window.localStorage.getItem(PURCHASE_HISTORY_KEY) || '[]');
  } catch { /* fallback */ }
  if (!arr.includes(orderId)) {
    arr.push(orderId);
    window.localStorage.setItem(PURCHASE_HISTORY_KEY, JSON.stringify(arr));
  }
}

/* ---------- API publica ---------- */

export interface RateLimitSnapshot {
  used: number;
  total: number;
  remaining: number;
  blocked: boolean;
  windowStart: number;
  resetsAt: number;
  unlocked: boolean;
}

export async function getSnapshot(): Promise<RateLimitSnapshot> {
  const fp = await getOrCreateFingerprint();
  const now = Date.now();
  let state = readState();
  if (!state) {
    state = { fingerprint: fp, windowStart: now, used: 0 };
  }
  if (state.fingerprint !== fp) {
    // El fingerprint cambio (otro device / clear storage), reseteamos.
    state = { fingerprint: fp, windowStart: now, used: 0 };
  }
  state = rolloverIfNeeded(state, now);
  writeState(state);

  const unlocked =
    hasPurchaseHistory() ||
    (state.unlockedUntil !== undefined && state.unlockedUntil > now);

  return {
    used: state.used,
    total: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - state.used),
    blocked: !unlocked && state.used >= FREE_DAILY_LIMIT,
    windowStart: state.windowStart,
    resetsAt: state.windowStart + MS_24H,
    unlocked,
  };
}

/**
 * Intenta consumir N unidades. Devuelve el snapshot resultante.
 * Si el resultado es `blocked`, el caller no debe ejecutar la accion.
 */
export async function tryConsume(amount: number = 1): Promise<RateLimitSnapshot> {
  const snap = await getSnapshot();
  if (snap.unlocked) return snap; // ilimitado
  if (snap.remaining < amount) {
    return { ...snap, blocked: true };
  }
  const fp = await getOrCreateFingerprint();
  const now = Date.now();
  let state = readState() ?? { fingerprint: fp, windowStart: now, used: 0 };
  state = rolloverIfNeeded(state, now);
  state.used += amount;
  state.fingerprint = fp;
  writeState(state);
  return {
    used: state.used,
    total: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - state.used),
    blocked: state.used >= FREE_DAILY_LIMIT,
    windowStart: state.windowStart,
    resetsAt: state.windowStart + MS_24H,
    unlocked: false,
  };
}

/** Devuelve un texto user-friendly del tiempo hasta el reset. */
export function timeUntilReset(resetsAt: number): string {
  const ms = Math.max(0, resetsAt - Date.now());
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h >= 1) return h + 'h ' + m + 'min';
  return m + ' min';
}
