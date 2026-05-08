// HU-9.6 — Programa de referidos.
//
// Modelo simplificado para frontend-only. En produccion, el backend valida
// que el referido convirtio (compro) y emite el credito; aqui simulamos todo
// en localStorage para demo y prototipo.
//
// Conceptos:
//  - referralCode: codigo unico del usuario (derivado del fingerprint).
//  - referredBy: codigo del usuario que me invito (capturado al ?ref=...).
//  - invitations: lista de eventos {ts, status} que el dueno del codigo ve.
//  - credits: COP acumulados — gana al primer pedido del referido.

import { getOrCreateFingerprint } from './rateLimit';

const PREFIX = 'aiwear:referrals:';
const CODE_KEY = PREFIX + 'myCode';
const REFERRED_BY_KEY = PREFIX + 'referredBy';
const INVITATIONS_KEY = PREFIX + 'invitations';
const CREDITS_KEY = PREFIX + 'credits';
const CREDIT_LEDGER_KEY = PREFIX + 'creditLedger';

/** Recompensa al primer pedido confirmado del referido. */
export const REFERRAL_REWARD_COP = 20000;

export interface InvitationEvent {
  /** Codigo de quien fue invitado (ofuscado para privacidad). */
  inviteeId: string;
  status: 'visited' | 'designed' | 'purchased';
  ts: number;
  /** Solo presente si status === 'purchased'. */
  orderId?: string;
}

export interface CreditLedgerEntry {
  ts: number;
  amount: number;
  reason: string;
  /** id del referido si aplica. */
  refOf?: string;
}

export interface ReferralSummary {
  myCode: string;
  myLink: string;
  referredBy: string | null;
  totals: {
    visited: number;
    designed: number;
    purchased: number;
  };
  credits: number;
  invitations: InvitationEvent[];
  ledger: CreditLedgerEntry[];
}

/* ---------- helpers internos ---------- */

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* swallow */ }
}

function shortHash(input: string): string {
  // djb2 simple, 6 chars en base36 — facil de leer y compartir.
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36).slice(0, 6).toUpperCase().padStart(6, '0');
}

/* ---------- API publica ---------- */

/** Genera o devuelve el codigo del usuario actual. */
export async function getOrCreateMyCode(): Promise<string> {
  if (typeof window === 'undefined' || !window.localStorage) return 'GUEST';
  const cached = window.localStorage.getItem(CODE_KEY);
  if (cached) return cached;
  const fp = await getOrCreateFingerprint();
  // Mezclamos con timestamp inicial para que distintos navegadores con mismo
  // fp (poco probable) no colisionen.
  const code = shortHash(fp + ':' + Date.now());
  window.localStorage.setItem(CODE_KEY, code);
  return code;
}

export function getMyCodeSync(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(CODE_KEY);
}

/** Construye el link compartible. */
export function buildReferralLink(code: string): string {
  if (typeof window === 'undefined') return '?ref=' + code;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('ref', code);
  return url.toString();
}

/** Captura ?ref=CODE de la URL si existe. Llamar al montar la app. */
export function captureReferrerFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (!ref) return null;
  // No nos sobreescribimos a nosotros mismos.
  const myCode = getMyCodeSync();
  if (myCode && ref === myCode) return null;
  // Si ya tenemos un referidor, lo respetamos (first-touch attribution).
  const existing = window.localStorage.getItem(REFERRED_BY_KEY);
  if (!existing) {
    window.localStorage.setItem(REFERRED_BY_KEY, ref);
    // Tambien notificamos al "dueno" del codigo via un canal local
    // (otro tab del mismo browser): registramos un visit event en su ledger
    // simulado. Como no hay backend, esto solo funciona si AMBOS son el
    // mismo device. Suficiente para el demo.
    addInvitationToOwner(ref, 'visited');
  }
  return ref;
}

export function getReferredBy(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(REFERRED_BY_KEY);
}

/** Lee invitaciones del usuario actual (las que el ENVIO). */
export function getInvitations(): InvitationEvent[] {
  return readJSON<InvitationEvent[]>(INVITATIONS_KEY, []);
}

function addInvitationToOwner(
  ownerCode: string,
  status: InvitationEvent['status'],
  orderId?: string,
) {
  // Si ownerCode coincide con my code (mismo device, demo), guardamos en su lista.
  const myCode = getMyCodeSync();
  if (myCode === ownerCode) {
    const invs = getInvitations();
    const inviteeId = 'inv_' + Math.random().toString(36).slice(2, 8);
    invs.push({ inviteeId, status, ts: Date.now(), orderId });
    writeJSON(INVITATIONS_KEY, invs);
  }
  // En produccion: aqui habria un POST al backend para registrar el evento.
}

/**
 * Llamar cuando el usuario haya completado un diseno (al primer guardado
 * post-referral). Mejora el conteo de "designed".
 */
export function trackDesignActivity() {
  const ref = getReferredBy();
  if (!ref) return;
  // Anti-spam: solo una vez por sesion.
  const flag = sessionStorage.getItem(PREFIX + 'designedReported');
  if (flag) return;
  sessionStorage.setItem(PREFIX + 'designedReported', '1');
  addInvitationToOwner(ref, 'designed');
}

/**
 * Llamar al confirmar un pedido. Si el usuario fue referido:
 *  1. Registra el evento de purchase en el ledger del referidor.
 *  2. Le da credito al referidor.
 *  3. Da credito al recien comprador (welcome bonus).
 */
export function rewardOnPurchase(orderId: string): {
  rewardedReferrer: boolean;
  rewardedSelf: boolean;
} {
  const ref = getReferredBy();
  if (!ref) return { rewardedReferrer: false, rewardedSelf: false };

  // Anti-doble: solo se premia el primer pedido.
  const flag = window.localStorage.getItem(PREFIX + 'firstPurchaseRewarded');
  if (flag) return { rewardedReferrer: false, rewardedSelf: false };
  window.localStorage.setItem(PREFIX + 'firstPurchaseRewarded', '1');

  addInvitationToOwner(ref, 'purchased', orderId);

  // Acumular credito al referidor (solo funciona en demo si es mismo device).
  const myCode = getMyCodeSync();
  let rewardedReferrer = false;
  if (myCode === ref) {
    addCredit(REFERRAL_REWARD_COP, 'Recompensa por referir', ref);
    rewardedReferrer = true;
  }

  // Welcome bonus al referido.
  addCredit(REFERRAL_REWARD_COP, 'Bono de bienvenida (referido)');
  return { rewardedReferrer, rewardedSelf: true };
}

export function getCredits(): number {
  return readJSON<number>(CREDITS_KEY, 0);
}

export function getCreditLedger(): CreditLedgerEntry[] {
  return readJSON<CreditLedgerEntry[]>(CREDIT_LEDGER_KEY, []);
}

function addCredit(amount: number, reason: string, refOf?: string) {
  const current = getCredits();
  writeJSON(CREDITS_KEY, current + amount);
  const ledger = getCreditLedger();
  ledger.push({ ts: Date.now(), amount, reason, refOf });
  writeJSON(CREDIT_LEDGER_KEY, ledger);
}

/** Resumen consolidado para el modal. */
export async function getReferralSummary(): Promise<ReferralSummary> {
  const myCode = await getOrCreateMyCode();
  const myLink = buildReferralLink(myCode);
  const referredBy = getReferredBy();
  const invitations = getInvitations();
  const totals = {
    visited: invitations.filter(i => i.status === 'visited').length,
    designed: invitations.filter(i => i.status === 'designed').length,
    purchased: invitations.filter(i => i.status === 'purchased').length,
  };
  return {
    myCode,
    myLink,
    referredBy,
    totals,
    credits: getCredits(),
    invitations,
    ledger: getCreditLedger(),
  };
}

/** Mensaje para WhatsApp / Twitter / IG con el link. */
export function buildShareMessage(link: string): string {
  return (
    'Hola! Te paso AI Wear Studio para que disenes tu propia camiseta con IA. ' +
    'Si la pides, ambos recibimos $' +
    REFERRAL_REWARD_COP.toLocaleString('es-CO') +
    ' en credito ✨\n\n' +
    link
  );
}

export function whatsappShareUrl(link: string): string {
  return 'https://wa.me/?text=' + encodeURIComponent(buildShareMessage(link));
}

export function twitterShareUrl(link: string): string {
  return 'https://twitter.com/intent/tweet?text=' +
    encodeURIComponent(buildShareMessage(link));
}

export function emailShareUrl(link: string): string {
  return 'mailto:?subject=' + encodeURIComponent('Te invito a AI Wear Studio') +
    '&body=' + encodeURIComponent(buildShareMessage(link));
}
