import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, Wand2, Loader2, AlertCircle, Check, ArrowRight, Shuffle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { remixDesignImage } from '../services/gemini';

/**
 * RemixModal — HU-1.5 (AI Remix con img2img)
 *
 * Se abre desde el RightPanel cuando hay una capa de tipo 'ai' seleccionada.
 * Toma la imagen actual de la capa, le envía una instrucción al modelo
 * (gemini-2.5-flash-image-preview) y reemplaza el contenido de la capa
 * con el resultado.
 */

interface RemixModalProps {
  layerId: string;
  baseImageUrl: string;
  onClose: () => void;
}

const REMIX_SUGGESTIONS: { emoji: string; text: string }[] = [
  { emoji: '🎨', text: 'Cambialo a colores pastel suaves' },
  { emoji: '🌃', text: 'Conviertelo en estilo cyberpunk neon' },
  { emoji: '✏️', text: 'Hazlo en blanco y negro estilo lineart' },
  { emoji: '🌊', text: 'Agregale un fondo de olas' },
  { emoji: '⭐', text: 'Rodealo de estrellas y galaxias' },
  { emoji: '🔥', text: 'Anade llamas alrededor' },
  { emoji: '🌸', text: 'Cambialo a estilo acuarela japonesa' },
  { emoji: '👾', text: 'Conviertelo a pixel art 8-bit' },
];

export function RemixModal({ layerId, baseImageUrl, onClose }: RemixModalProps) {
  const store = useStore();
  const [instruction, setInstruction] = useState('');
  const [isRemixing, setIsRemixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [suggestionsSeed, setSuggestionsSeed] = useState(0);
  const [applied, setApplied] = useState(false);

  const visibleSuggestions = useMemo(() => {
    return [...REMIX_SUGGESTIONS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionsSeed]);

  const handleRemix = async () => {
    if (!instruction.trim() || isRemixing) return;
    setIsRemixing(true);
    setError(null);
    setResult(null);
    try {
      const variation = await remixDesignImage(baseImageUrl, instruction);
      setResult(variation.imageUrl);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido al remixar.');
    } finally {
      setIsRemixing(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    // Reemplazar el content de la capa con el remix.
    store.updateLayer(store.currentView, layerId, {
      content: result,
      name: 'Diseno IA (remix)',
    });
    setApplied(true);
    setTimeout(() => onClose(), 600);
  };

  const handleTryAnother = () => {
    setResult(null);
    setError(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-md shadow-violet-500/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">
                  AI Remix
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Modifica este diseno con una instruccion
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5 custom-scrollbar">
            {/* Lado izquierdo: Original + Resultado */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                {result ? 'Antes y despues' : 'Diseno actual'}
              </label>

              {result ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <img src={baseImageUrl} alt="Antes" className="w-full h-full object-contain" />
                    </div>
                    <span className="absolute top-2 left-2 text-[8px] font-black uppercase tracking-widest text-slate-600 bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm">
                      Antes
                    </span>
                  </div>
                  <div className="relative">
                    <div className="aspect-square rounded-xl overflow-hidden border-2 border-violet-500 ring-2 ring-violet-200 bg-slate-50 flex items-center justify-center">
                      <img src={result} alt="Despues" className="w-full h-full object-contain" />
                    </div>
                    <span className="absolute top-2 left-2 text-[8px] font-black uppercase tracking-widest text-violet-700 bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm">
                      Despues
                    </span>
                  </div>
                </div>
              ) : (
                <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center relative">
                  {isRemixing && (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-fuchsia-400/20 to-pink-400/20 animate-pulse z-10 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-full flex items-center gap-2 shadow-lg">
                        <Loader2 size={14} className="animate-spin text-violet-600" />
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                          Remixando...
                        </span>
                      </div>
                    </div>
                  )}
                  <img
                    src={baseImageUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {result && !applied && (
                <div className="flex gap-2">
                  <button
                    onClick={handleTryAnother}
                    className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Shuffle size={12} />
                    Probar otra
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-[2] py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 rounded-xl shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} />
                    Aplicar a la prenda
                  </button>
                </div>
              )}

              {applied && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">
                    Aplicado correctamente
                  </span>
                </div>
              )}
            </div>

            {/* Lado derecho: Instruction + Suggestions */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-between">
                  <span>Que quieres cambiar?</span>
                  <span className="text-slate-300 font-bold normal-case tracking-normal">
                    {instruction.length} / 200
                  </span>
                </label>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value.slice(0, 200))}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder:text-slate-400 font-medium resize-none"
                  placeholder="Ej: cambialo a colores pastel, agrega humo, hazlo mas oscuro..."
                  disabled={isRemixing}
                />
              </div>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Ideas de remix
                  </label>
                  <button
                    type="button"
                    onClick={() => setSuggestionsSeed((s) => s + 1)}
                    className="flex items-center gap-1 text-[9px] font-black text-violet-600 uppercase tracking-widest hover:text-violet-700 transition-colors"
                  >
                    <Shuffle size={11} />
                    Otras
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s.text}
                      type="button"
                      onClick={() => setInstruction(s.text)}
                      disabled={isRemixing}
                      className="group flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-left transition-all hover:border-violet-300 hover:bg-violet-50/30 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title={s.text}
                    >
                      <span className="text-base leading-none">{s.emoji}</span>
                      <span className="text-[11px] font-medium text-slate-700 leading-tight group-hover:text-slate-900 truncate">
                        {s.text}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <button
                onClick={handleRemix}
                disabled={!instruction.trim() || isRemixing}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemixing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Remixando...
                  </>
                ) : result ? (
                  <>
                    <Wand2 size={16} />
                    Remix de nuevo
                    <ArrowRight size={14} />
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Generar Remix
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              {error && !isRemixing && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-700 leading-snug">{error}</p>
                </div>
              )}

              <p className="text-center text-[9px] text-slate-400 italic">
                La IA conservara la composicion del original y aplicara solo el cambio que pidas.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
