import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, Wand2, Loader2, AlertCircle, Download, RefreshCw, Camera,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { tryOnDesign, TryOnModelStyle, GeneratedVariation } from '../services/gemini';
import { ViewType } from '../types';

interface TryOnModalProps { onClose: () => void; }

const MODEL_STYLES: { id: TryOnModelStyle; label: string; emoji: string; desc: string }[] = [
  { id: 'casual-m', label: 'Casual M', emoji: '👨', desc: 'Hombre, look relajado' },
  { id: 'casual-f', label: 'Casual F', emoji: '👩', desc: 'Mujer, look relajado' },
  { id: 'streetwear', label: 'Streetwear', emoji: '🌃', desc: 'Urbano, golden hour' },
  { id: 'editorial', label: 'Editorial', emoji: '📸', desc: 'Pose fashion' },
];

export function TryOnModal({ onClose }: TryOnModalProps) {
  const store = useStore();
  const [selectedStyle, setSelectedStyle] = useState<TryOnModelStyle>('casual-m');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);

  const designImageUrl = useMemo(() => {
    const views: ViewType[] = ['front', 'back', 'left_sleeve', 'right_sleeve'];
    for (const v of views) {
      const visible = store.layers[v]
        .filter((l) => !l.hidden)
        .filter((l) => l.type === 'image' || l.type === 'ai');
      if (visible.length > 0) return visible[0].content;
    }
    return null;
  }, [store.layers]);

  const canTryOn = !!designImageUrl;

  const handleGenerate = async () => {
    if (!designImageUrl || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setVariations([]);
    setSelectedVariation(null);
    try {
      const results = await tryOnDesign(
        designImageUrl, store.garment.type, store.selectedColor.name, selectedStyle, 2,
        (v) => setVariations((prev) => [...prev, v])
      );
      if (results.length > 0) setVariations(results);
    } catch (err: any) {
      setError(err?.message || 'Error en el try-on.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (v: GeneratedVariation) => {
    const a = document.createElement('a');
    a.href = v.imageUrl;
    a.download = 'aiwear-tryon-' + v.id + '.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-md">
                <Camera size={18} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">AI Try-On</h2>
                  <span className="text-[8px] font-black uppercase tracking-widest text-violet-700 bg-violet-100 border border-violet-200 px-1.5 py-0.5 rounded-full">Beta</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Mira tu diseno puesto en un modelo virtual</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5 custom-scrollbar">
            <div className="md:col-span-5 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tu diseno</label>
                <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center" style={{ backgroundColor: store.selectedColor.hex }}>
                  {designImageUrl ? (
                    <img src={designImageUrl} alt="Diseno" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center px-6 opacity-60">
                      <AlertCircle size={20} className="mx-auto mb-2 text-slate-500" />
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">No hay diseno aun</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Estilo de modelo</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODEL_STYLES.map(m => {
                    const active = selectedStyle === m.id;
                    return (
                      <button key={m.id} onClick={() => setSelectedStyle(m.id)} disabled={isGenerating}
                        className={'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all disabled:opacity-50 ' + (active ? 'border-violet-500 bg-violet-50/40 ring-1 ring-violet-200' : 'border-slate-200 bg-white hover:border-slate-300')}>
                        <span className="text-2xl leading-none">{m.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">{m.label}</p>
                          <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">{m.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleGenerate} disabled={!canTryOn || isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (<><Loader2 size={16} className="animate-spin" /> Generando fotos...</>)
                  : variations.length > 0 ? (<><RefreshCw size={16} /> Generar nuevas</>)
                  : (<><Wand2 size={16} /> Probar diseno con IA</>)}
              </button>

              {error && !isGenerating && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 leading-snug">{error}</p>
                </div>
              )}

              <p className="text-center text-[9px] text-slate-400 italic">
                La IA genera fotos sinteticas. 2 variaciones secuenciales (~30s).
              </p>
            </div>

            <div className="md:col-span-7">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
                Resultados ({variations.length})
              </label>

              {isGenerating && variations.length === 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {[0, 1].map(i => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 animate-pulse flex items-center justify-center"
                      style={{ animationDelay: (i * 150) + 'ms' }}>
                      <Sparkles size={20} className="text-violet-300" />
                    </div>
                  ))}
                </div>
              )}

              {!isGenerating && variations.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                  <Camera size={32} className="text-slate-300 mb-3" />
                  <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Tus modelos virtuales aparecen aqui</p>
                  <p className="text-[10px] text-slate-400 mt-2 max-w-xs">Selecciona un estilo y haz clic en Probar diseno con IA.</p>
                </div>
              )}

              {variations.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-400">
                  {variations.map(v => (
                    <div key={v.id}
                      className={'group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all cursor-pointer ' +
                        (selectedVariation === v.id ? 'border-violet-500 ring-2 ring-violet-200' : 'border-slate-200 hover:border-violet-400 hover:shadow-lg')}
                      onClick={() => setSelectedVariation(v.id)}
                    >
                      <img src={v.imageUrl} alt="Try-on" className="w-full h-full object-cover bg-slate-100" loading="lazy" />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent flex items-end justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(v); }}
                          className="px-2 py-1 bg-white text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1 hover:bg-slate-100">
                          <Download size={10} />Descargar
                        </button>
                      </div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 animate-pulse flex items-center justify-center">
                      <Sparkles size={20} className="text-violet-300" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
