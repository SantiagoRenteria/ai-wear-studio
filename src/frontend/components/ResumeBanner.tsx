// HU-12.4 — Banner que aparece al cargar la app si hay una sesion previa con
// trabajo en curso. Permite retomar la sesion mas reciente o ver las ultimas 5.

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Layers, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import {
  deleteSession,
  findResumableSession,
  getSession,
  listSessionSummaries,
  type SessionSummary,
} from '../services/persistence';
import type { PersistedSession } from '../services/persistence';

interface Props {
  onResume: (session: PersistedSession) => void;
  onDismiss: () => void;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'hace ' + sec + 's';
  const min = Math.floor(sec / 60);
  if (min < 60) return 'hace ' + min + ' min';
  const h = Math.floor(min / 60);
  if (h < 24) return 'hace ' + h + ' h';
  const d = Math.floor(h / 24);
  return 'hace ' + d + ' d';
}

export function ResumeBanner({ onResume, onDismiss }: Props) {
  const [primary, setPrimary] = useState<PersistedSession | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);

  useEffect(() => {
    setPrimary(findResumableSession());
    setSummaries(listSessionSummaries().filter((s) => s.layerCount > 0));
  }, []);

  const others = useMemo(
    () => summaries.filter((s) => s.id !== primary?.id),
    [summaries, primary],
  );

  if (!primary) return null;

  const handleResumeId = (id: string) => {
    const session = getSession(id);
    if (session) onResume(session);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(id);
    if (id === primary.id) {
      const next = findResumableSession();
      if (next) {
        setPrimary(next);
      } else {
        onDismiss();
      }
    }
    setSummaries(listSessionSummaries().filter((s) => s.layerCount > 0));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 12, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-6 pb-4 relative">
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>

            <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/30 mb-3">
              <Sparkles size={20} className="text-white" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Tienes un diseno en progreso</h2>
            <p className="text-sm text-slate-500 mt-1">
              Lo guardamos automaticamente en este navegador. Puedes retomarlo o empezar uno nuevo.
            </p>
          </div>

          <div className="px-6 pb-2">
            <button
              onClick={() => onResume(primary)}
              className="w-full bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-2xl p-4 flex items-center gap-3 transition-all group text-left"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ring-2 ring-white shadow-sm"
                style={{ backgroundColor: primary.selectedColor.hex }}
              >
                <span className="drop-shadow-sm">{primary.garment.emoji ?? '👕'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {primary.garment.name}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Layers size={10} />
                    {primary.layers.front.length +
                      primary.layers.back.length +
                      primary.layers.left_sleeve.length +
                      primary.layers.right_sleeve.length}{' '}
                    capas
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatRelative(primary.updatedAt)}
                  </span>
                </div>
              </div>
              <div className="text-violet-600 group-hover:translate-x-0.5 transition-transform">
                <RotateCcw size={18} />
              </div>
            </button>
          </div>

          {others.length > 0 && (
            <div className="px-6 pt-2 pb-2">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showAll
                  ? 'Ocultar disenos anteriores'
                  : 'Ver ' + others.length + ' diseno(s) anteriores'}
              </button>

              <AnimatePresence>
                {showAll && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-1.5">
                      {others.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleResumeId(s.id)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all text-left group"
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ring-1 ring-slate-200"
                            style={{ backgroundColor: s.colorHex }}
                          >
                            {s.garmentEmoji ?? '👕'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {s.garmentName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {s.layerCount} capas · {formatRelative(s.updatedAt)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDelete(s.id, e)}
                            className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="p-6 pt-3 flex gap-2">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
            >
              Empezar nuevo
            </button>
            <button
              onClick={() => onResume(primary)}
              className="flex-[2] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/40 transition-all"
            >
              Retomar diseno
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
