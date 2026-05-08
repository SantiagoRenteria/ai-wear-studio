import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pipette, X, Check, Clock } from 'lucide-react';

/**
 * ColorPicker — HU-7.4
 *
 * Componente reutilizable para selección de colores.
 * Modo "compact" (8 favoritos + botón "Más") y modal expandido con:
 * - Categorías: Básicos, Pasteles, Tierra, Vibrantes, Neón, Oscuros
 * - Picker HSL (sliders)
 * - Input hex
 * - EyeDropper API (si disponible)
 * - Recientes (localStorage)
 */

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  favorites?: string[]; // hex array
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

const RECENTS_KEY = 'aiwear:recentColors';
const MAX_RECENTS = 8;

const PALETTE_CATEGORIES: { id: string; label: string; emoji: string; colors: string[] }[] = [
  { id: 'basic', label: 'Básicos', emoji: '⚫', colors: ['#FFFFFF', '#0F172A', '#94A3B8', '#1B2735', '#475569', '#E2E8F0', '#1F2937', '#CBD5E1'] },
  { id: 'pastel', label: 'Pasteles', emoji: '🌸', colors: ['#FBCFE8', '#FED7AA', '#FEF3C7', '#D9F99D', '#A7F3D0', '#BAE6FD', '#DDD6FE', '#FBCFE8'] },
  { id: 'earth', label: 'Tierra', emoji: '🌿', colors: ['#A89F6E', '#65735A', '#7C2D12', '#78350F', '#451A03', '#1F3D2B', '#D6D3D1', '#E7D5B7'] },
  { id: 'vibrant', label: 'Vibrantes', emoji: '🌈', colors: ['#7C3AED', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#06B6D4', '#F97316'] },
  { id: 'neon', label: 'Neón', emoji: '⚡', colors: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF', '#06FFA5', '#39FF14', '#FF10F0'] },
  { id: 'dark', label: 'Oscuros', emoji: '🌑', colors: ['#000000', '#0F172A', '#1E1B4B', '#3F0E1A', '#0C0A09', '#1A1818', '#27272A', '#0A0A0A'] },
];

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecents(colors: string[]) {
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(colors)); } catch {}
}

function pushRecent(hex: string) {
  const current = loadRecents();
  const filtered = current.filter(c => c.toLowerCase() !== hex.toLowerCase());
  const next = [hex, ...filtered].slice(0, MAX_RECENTS);
  saveRecents(next);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const c = hex.replace('#', '');
  if (c.length !== 6) return { h: 0, s: 0, l: 50 };
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else h = ((r - g) / d + 4);
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}

const DEFAULT_FAVORITES = [
  '#FFFFFF', '#0F172A', '#7C3AED', '#EC4899',
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
];

export function ColorPicker({
  value, onChange, favorites = DEFAULT_FAVORITES, showLabels = false, compact = false, className = '',
}: ColorPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [recents, setRecents] = useState<string[]>(() => loadRecents());

  const handlePick = (hex: string) => {
    onChange(hex);
    pushRecent(hex);
    setRecents(loadRecents());
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {favorites.map((hex) => {
          const active = value.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => handlePick(hex)}
              className={
                'shrink-0 rounded-full border-2 transition-all ' +
                (compact ? 'w-6 h-6 ' : 'w-7 h-7 ') +
                (active ? 'border-violet-500 scale-110 ring-2 ring-violet-200' : 'border-slate-200 hover:border-slate-300')
              }
              style={{ backgroundColor: hex }}
              title={hex}
            />
          );
        })}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={
            'shrink-0 flex items-center justify-center rounded-full border-2 border-dashed border-slate-300 hover:border-violet-500 hover:bg-violet-50 transition-all text-slate-500 hover:text-violet-600 ' +
            (compact ? 'w-6 h-6' : 'w-7 h-7')
          }
          title="Más colores"
        >
          <Plus size={compact ? 11 : 13} />
        </button>
      </div>

      {showModal && (
        <ColorPickerModal
          value={value}
          recents={recents}
          onPick={(hex) => { handlePick(hex); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function ColorPickerModal({
  value, recents, onPick, onClose,
}: { value: string; recents: string[]; onPick: (hex: string) => void; onClose: () => void; }) {
  const [hex, setHex] = useState(value);
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [activeCat, setActiveCat] = useState<string>('basic');
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      const next = hexToHsl(hex);
      setHsl(next);
    }
  }, [hex]);

  const updateHsl = (h: number, s: number, l: number) => {
    const newHex = hslToHex(h, s, l);
    setHsl({ h, s, l });
    setHex(newHex);
  };

  const handleEyeDropper = async () => {
    try {
      const ed = new (window as any).EyeDropper();
      const result = await ed.open();
      if (result?.sRGBHex) setHex(result.sRGBHex);
    } catch {}
  };

  const handleApply = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onPick(hex);
      onClose();
    }
  };

  const activeColors = PALETTE_CATEGORIES.find(c => c.id === activeCat)?.colors || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Selector de color</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Preview + hex input */}
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-16 rounded-xl border border-slate-200 shadow-inner"
                style={{ backgroundColor: hex }}
              />
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hex</label>
                <input
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  placeholder="#7C3AED"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none uppercase"
                />
              </div>
              {hasEyeDropper && (
                <button
                  onClick={handleEyeDropper}
                  className="p-3 rounded-lg border border-slate-200 hover:border-violet-300 text-slate-600 hover:text-violet-600 transition-colors"
                  title="Eyedropper"
                >
                  <Pipette size={16} />
                </button>
              )}
            </div>

            {/* HSL sliders */}
            <div className="space-y-2.5">
              <SliderRow label="Matiz" value={hsl.h} max={360} unit="°"
                onChange={(v) => updateHsl(v, hsl.s, hsl.l)}
                gradient="linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
              />
              <SliderRow label="Saturación" value={hsl.s} max={100} unit="%"
                onChange={(v) => updateHsl(hsl.h, v, hsl.l)}
                gradient={'linear-gradient(to right, hsl(' + hsl.h + ', 0%, 50%), hsl(' + hsl.h + ', 100%, 50%))'}
              />
              <SliderRow label="Luminosidad" value={hsl.l} max={100} unit="%"
                onChange={(v) => updateHsl(hsl.h, hsl.s, v)}
                gradient={'linear-gradient(to right, #000, hsl(' + hsl.h + ', ' + hsl.s + '%, 50%), #fff)'}
              />
            </div>

            {/* Categorías */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
                {PALETTE_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={
                      'shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ' +
                      (activeCat === c.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                    }
                  >
                    <span>{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {activeColors.map(c => (
                  <button
                    key={c}
                    onClick={() => setHex(c)}
                    className="aspect-square rounded-md border border-slate-200 hover:scale-110 hover:border-violet-500 transition-all"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Recientes */}
            {recents.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <Clock size={10} /> Recientes
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {recents.map(c => (
                    <button
                      key={c}
                      onClick={() => setHex(c)}
                      className="w-6 h-6 rounded-md border border-slate-200 hover:scale-110 hover:border-violet-500 transition-all"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleApply}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-md shadow-violet-500/20 flex items-center justify-center gap-2"
            >
              <Check size={14} />
              Aplicar color
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SliderRow({
  label, value, max, unit, gradient, onChange,
}: { label: string; value: number; max: number; unit: string; gradient: string; onChange: (v: number) => void; }) {
  return (
    <div>
      <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
        <span>{label}</span>
        <span className="text-violet-600 normal-case tracking-normal font-mono">{value}{unit}</span>
      </div>
      <input
        type="range" min="0" max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: gradient }}
      />
    </div>
  );
}
