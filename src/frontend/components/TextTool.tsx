import React, { useState, useEffect } from 'react';
import {
  Type, Bold, AlignLeft, AlignCenter, AlignRight, Plus, Sparkles, Search,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { PlacementZone } from '../types';
import { ColorPicker } from './ColorPicker';

/**
 * TextTool — HU-3.5 + HU-7.13 + HU-7.14 + HU-7.15 + HU-7.16
 *
 * 30 fuentes curadas (lazy-load de Google Fonts), ColorPicker reutilizable,
 * 7 efectos de texto (plano, stroke, sombra, glow, neón, gradiente, 3D),
 * espaciado entre letras (tracking).
 */

interface FontDef {
  id: string;
  label: string;
  family: string;
  category: 'sans' | 'serif' | 'display' | 'mono' | 'cursive' | 'decorative';
  google?: string;
}

const FONTS: FontDef[] = [
  // Sans
  { id: 'inter', label: 'Inter', family: 'Inter', category: 'sans' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', category: 'sans', google: 'Poppins:wght@400;700;900' },
  { id: 'manrope', label: 'Manrope', family: 'Manrope', category: 'sans', google: 'Manrope:wght@400;700;800' },
  { id: 'space-g', label: 'Space Grotesk', family: 'Space Grotesk', category: 'sans' },
  { id: 'archivo', label: 'Archivo', family: 'Archivo', category: 'sans', google: 'Archivo:wght@400;700;900' },
  // Serif
  { id: 'playfair', label: 'Playfair', family: 'Playfair Display', category: 'serif' },
  { id: 'lora', label: 'Lora', family: 'Lora', category: 'serif', google: 'Lora:wght@400;700' },
  { id: 'eb-garamond', label: 'Garamond', family: 'EB Garamond', category: 'serif', google: 'EB+Garamond:wght@400;700' },
  { id: 'libre', label: 'Libre Caslon', family: 'Libre Caslon Display', category: 'serif', google: 'Libre+Caslon+Display' },
  { id: 'georgia', label: 'Georgia', family: 'Georgia, serif', category: 'serif' },
  // Display
  { id: 'bebas', label: 'Bebas Neue', family: 'Bebas Neue', category: 'display', google: 'Bebas+Neue' },
  { id: 'anton', label: 'Anton', family: 'Anton', category: 'display', google: 'Anton' },
  { id: 'bowlby', label: 'Bowlby One', family: 'Bowlby One', category: 'display', google: 'Bowlby+One' },
  { id: 'oswald', label: 'Oswald', family: 'Oswald', category: 'display', google: 'Oswald:wght@400;700' },
  { id: 'staat', label: 'Staatliches', family: 'Staatliches', category: 'display', google: 'Staatliches' },
  // Mono
  { id: 'jetbrains', label: 'JetBrains Mono', family: 'JetBrains Mono', category: 'mono' },
  { id: 'fira', label: 'Fira Code', family: 'Fira Code', category: 'mono', google: 'Fira+Code:wght@400;700' },
  { id: 'sourcecode', label: 'Source Code', family: 'Source Code Pro', category: 'mono', google: 'Source+Code+Pro:wght@400;700' },
  { id: 'courier', label: 'Courier', family: 'Courier New, monospace', category: 'mono' },
  // Cursive
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico', category: 'cursive', google: 'Pacifico' },
  { id: 'caveat', label: 'Caveat', family: 'Caveat', category: 'cursive', google: 'Caveat:wght@400;700' },
  { id: 'dancing', label: 'Dancing Script', family: 'Dancing Script', category: 'cursive', google: 'Dancing+Script:wght@400;700' },
  { id: 'satisfy', label: 'Satisfy', family: 'Satisfy', category: 'cursive', google: 'Satisfy' },
  { id: 'shadows', label: 'Shadows Into Light', family: 'Shadows Into Light', category: 'cursive', google: 'Shadows+Into+Light' },
  // Decorative
  { id: 'bungee', label: 'Bungee', family: 'Bungee', category: 'decorative', google: 'Bungee' },
  { id: 'fascinate', label: 'Fascinate', family: 'Fascinate', category: 'decorative', google: 'Fascinate' },
  { id: 'monoton', label: 'Monoton', family: 'Monoton', category: 'decorative', google: 'Monoton' },
  { id: 'press-start', label: 'Press Start 2P', family: 'Press Start 2P', category: 'decorative', google: 'Press+Start+2P' },
  { id: 'creepster', label: 'Creepster', family: 'Creepster', category: 'decorative', google: 'Creepster' },
  { id: 'rubik-glitch', label: 'Rubik Glitch', family: 'Rubik Glitch', category: 'decorative', google: 'Rubik+Glitch' },
];

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'mono', label: 'Mono' },
  { id: 'cursive', label: 'Cursive' },
  { id: 'decorative', label: 'Deco' },
];

const EFFECTS: { id: 'none' | 'stroke' | 'shadow' | 'glow' | 'neon' | 'gradient' | '3d'; label: string; emoji: string }[] = [
  { id: 'none', label: 'Plano', emoji: '⚪' },
  { id: 'stroke', label: 'Stroke', emoji: '🖋️' },
  { id: 'shadow', label: 'Sombra', emoji: '🌑' },
  { id: 'glow', label: 'Glow', emoji: '✨' },
  { id: 'neon', label: 'Neón', emoji: '💡' },
  { id: 'gradient', label: 'Degradado', emoji: '🌈' },
  { id: '3d', label: '3D', emoji: '🧊' },
];

const loadedGoogleFonts = new Set<string>();

function loadGoogleFont(family: string) {
  if (loadedGoogleFonts.has(family)) return;
  loadedGoogleFonts.add(family);
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=' + family + '&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

interface TextToolProps { onClose: () => void; }

export function TextTool({ onClose }: TextToolProps) {
  const store = useStore();
  const [text, setText] = useState('');
  const [fontFamily, setFontFamily] = useState(FONTS[0].family);
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#0F172A');
  const [strokeColor, setStrokeColor] = useState('#FFFFFF');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('bold');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [effect, setEffect] = useState<'none' | 'stroke' | 'shadow' | 'glow' | 'neon' | 'gradient' | '3d'>('none');
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');

  // Lazy load todas las fuentes Google al montar
  useEffect(() => {
    FONTS.forEach(f => { if (f.google) loadGoogleFont(f.google); });
  }, []);

  const filteredFonts = FONTS.filter(f => {
    if (activeCat !== 'all' && f.category !== activeCat) return false;
    if (search.trim() && !f.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = () => {
    if (!text.trim()) return;
    store.addLayer(store.currentView, {
      type: 'text',
      content: text,
      x: 50, y: 80,
      scaleX: 1, scaleY: 1, rotation: 0,
      color, fontFamily, fontSize, fontWeight, textAlign,
      letterSpacing,
      textEffect: effect,
      strokeColor: effect === 'stroke' ? strokeColor : undefined,
      placementZone: PlacementZone.CenterChest,
      name: text.slice(0, 24),
    });
    setText('');
    onClose();
  };

  // CSS para preview con efectos
  const previewStyle: React.CSSProperties = {
    fontFamily, fontSize: Math.min(fontSize, 56), fontWeight,
    letterSpacing: letterSpacing + 'px',
    textAlign: textAlign as any,
    wordBreak: 'break-word',
    color: effect === 'gradient' ? 'transparent' : color,
    backgroundImage: effect === 'gradient' ? 'linear-gradient(135deg, ' + color + ', #EC4899)' : undefined,
    WebkitBackgroundClip: effect === 'gradient' ? 'text' : undefined,
    backgroundClip: effect === 'gradient' ? 'text' : undefined,
    WebkitTextStroke: effect === 'stroke' ? '2px ' + strokeColor : undefined,
    textShadow:
      effect === 'shadow' ? '4px 4px 0 rgba(0,0,0,0.3)' :
      effect === 'glow' ? '0 0 20px ' + color :
      effect === 'neon' ? '0 0 8px ' + color + ', 0 0 16px ' + color + ', 0 0 24px ' + color :
      effect === '3d' ? '1px 1px 0 ' + color + 'cc, 2px 2px 0 ' + color + 'aa, 3px 3px 0 ' + color + '88, 4px 4px 0 ' + color + '66, 5px 5px 8px rgba(0,0,0,0.3)' :
      undefined,
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Live Preview */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 min-h-[110px] flex items-center justify-center overflow-hidden">
        {text ? (
          <p className="leading-tight break-words w-full" style={previewStyle}>{text}</p>
        ) : (
          <div className="flex flex-col items-center gap-1.5 opacity-40">
            <Type size={22} className="text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tu preview aparece aqui</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Texto</label>
        <input
          type="text" value={text} onChange={(e) => setText(e.target.value.slice(0, 60))}
          placeholder="Escribe tu texto..."
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none font-medium"
        />
      </div>

      {/* Font picker con buscador y categorías */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipografia ({filteredFonts.length})</label>
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-6 pr-2 py-1 text-[10px] w-24 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
          {CATEGORIES.map(c => (
            <button
              key={c.id} onClick={() => setActiveCat(c.id)}
              className={'shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ' + (activeCat === c.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            >{c.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
          {filteredFonts.map(f => {
            const active = fontFamily === f.family;
            return (
              <button
                key={f.id} onClick={() => setFontFamily(f.family)}
                className={
                  'flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border transition-all min-h-[44px] ' +
                  (active ? 'border-violet-500 bg-violet-50/60 ring-1 ring-violet-200' : 'border-slate-200 bg-white hover:border-slate-300')
                }
              >
                <span className="text-sm leading-none text-slate-900" style={{ fontFamily: f.family, fontWeight: 700 }}>Aa</span>
                <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-500 truncate w-full text-center">{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tamaño */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
          <span>Tamano</span>
          <span className="text-violet-600">{fontSize}px</span>
        </div>
        <input type="range" min="16" max="120" step="2" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full accent-violet-600 h-1 bg-slate-100 rounded-lg cursor-pointer" />
      </div>

      {/* Tracking */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
          <span>Tracking</span>
          <span className="text-violet-600">{letterSpacing}px</span>
        </div>
        <input type="range" min="-5" max="30" step="1" value={letterSpacing} onChange={(e) => setLetterSpacing(parseInt(e.target.value))} className="w-full accent-violet-600 h-1 bg-slate-100 rounded-lg cursor-pointer" />
      </div>

      {/* Peso + Alineación */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Peso</label>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => setFontWeight('normal')} className={'h-9 rounded-lg text-[11px] font-medium transition-all border ' + (fontWeight === 'normal' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200')}>Aa</button>
            <button onClick={() => setFontWeight('bold')} className={'h-9 rounded-lg text-[11px] font-black transition-all border ' + (fontWeight === 'bold' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200')}><Bold size={12} className="inline" /></button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Alineacion</label>
          <div className="grid grid-cols-3 gap-1">
            {([{ id: 'left', icon: AlignLeft }, { id: 'center', icon: AlignCenter }, { id: 'right', icon: AlignRight }] as const).map(({ id, icon: Icon }) => (
              <button key={id} onClick={() => setTextAlign(id)} className={'h-9 rounded-lg flex items-center justify-center transition-all border ' + (textAlign === id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200')}><Icon size={13} /></button>
            ))}
          </div>
        </div>
      </div>

      {/* Color (con ColorPicker avanzado) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Color</label>
        <ColorPicker value={color} onChange={setColor} compact />
      </div>

      {/* HU-7.15 — Efectos */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
          <Sparkles size={11} />
          Efectos
        </label>
        <div className="flex flex-wrap gap-1.5">
          {EFFECTS.map(e => {
            const active = effect === e.id;
            return (
              <button
                key={e.id} onClick={() => setEffect(e.id)}
                className={
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ' +
                  (active ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300')
                }
              >
                <span className="text-[11px] leading-none">{e.emoji}</span>
                {e.label}
              </button>
            );
          })}
        </div>
        {effect === 'stroke' && (
          <div className="pt-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Color del stroke</label>
            <ColorPicker value={strokeColor} onChange={setStrokeColor} compact />
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={handleAdd} disabled={!text.trim()}
        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Plus size={16} />
        Anadir al diseno
      </button>
    </div>
  );
}
