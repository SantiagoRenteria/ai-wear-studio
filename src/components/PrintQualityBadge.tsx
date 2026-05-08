// HU-7.4 — Badge flotante del Print Quality Score.
// Click → abre popover con la lista de issues y botones "Corregir" que
// aplican un patch sobre la capa correspondiente.

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertOctagon, ChevronDown, Wand2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { usePrintQuality } from '../hooks/usePrintQuality';
import type { QualityFix, QualityIssue, QualityScore } from '../services/printQuality';

const SCORE_META: Record<QualityScore, {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  ring: string;
  Icon: typeof CheckCircle2;
}> = {
  excellent: {
    label: 'Excelente',
    sublabel: 'Listo para imprimir',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    Icon: CheckCircle2,
  },
  acceptable: {
    label: 'Aceptable',
    sublabel: 'Con observaciones',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    Icon: AlertTriangle,
  },
  issues: {
    label: 'Problemas',
    sublabel: 'Revisa antes de pagar',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    Icon: AlertOctagon,
  },
};

const SEVERITY_DOT: Record<QualityIssue['severity'], string> = {
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
};

export function PrintQualityBadge() {
  const [open, setOpen] = useState(false);
  const report = usePrintQuality();
  const updateLayer = useStore((s) => s.updateLayer);
  const setActiveLayer = useStore((s) => s.setActiveLayer);
  const setView = useStore((s) => s.setView);

  const meta = SCORE_META[report.score];
  const total = report.errorCount + report.warningCount;

  // Si no hay capas, no mostramos nada para no contaminar el canvas vacio.
  const totalLayers = useStore((s) =>
    s.layers.front.length + s.layers.back.length + s.layers.left_sleeve.length + s.layers.right_sleeve.length,
  );
  if (totalLayers === 0) return null;

  const applyFix = (issue: QualityIssue, fix: QualityFix) => {
    const patch: Record<string, unknown> = {};
    switch (fix.kind) {
      case 'set_text_color':
        patch.color = fix.color;
        break;
      case 'set_font_size':
        patch.fontSize = fix.fontSize;
        break;
      case 'set_scale':
        patch.scaleX = fix.scaleX;
        patch.scaleY = fix.scaleY;
        break;
      case 'set_stroke_color':
        patch.strokeColor = fix.strokeColor;
        break;
    }
    updateLayer(issue.view, issue.layerId, patch);
  };

  const focusLayer = (issue: QualityIssue) => {
    setView(issue.view);
    setActiveLayer(issue.layerId);
  };

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          'flex items-center gap-2.5 px-4 py-2 rounded-xl shadow-sm ring-1 transition-all backdrop-blur ' +
          meta.bg +
          ' ' +
          meta.ring +
          ' ' +
          (open ? 'shadow-md' : 'hover:shadow-md')
        }
        aria-expanded={open}
        aria-label={'Calidad de impresion: ' + meta.label}
      >
        <meta.Icon size={14} className={meta.color} />
        <div className="flex items-baseline gap-1.5">
          <span className={'text-[11px] font-black uppercase tracking-widest ' + meta.color}>
            {meta.label}
          </span>
          <span className="text-[10px] font-bold text-slate-500 hidden md:inline">
            · {meta.sublabel}
          </span>
        </div>
        {total > 0 && (
          <span className="bg-white/80 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
            {total}
          </span>
        )}
        <ChevronDown
          size={12}
          className={'text-slate-500 transition-transform ' + (open ? 'rotate-180' : '')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 -translate-x-1/2 mt-2 w-[360px] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                  Calidad de impresion
                </h4>
                <span className={'text-[10px] font-black uppercase tracking-widest ' + meta.color}>
                  {meta.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {report.score === 'excellent' &&
                  'Tu diseno cumple las recomendaciones para impresion profesional.'}
                {report.score === 'acceptable' &&
                  report.warningCount +
                    ' observacion' +
                    (report.warningCount === 1 ? '' : 'es') +
                    '. Puedes pagar pero revisa estas alertas.'}
                {report.score === 'issues' &&
                  report.errorCount +
                    ' problema' +
                    (report.errorCount === 1 ? '' : 's') +
                    ' critico' +
                    (report.errorCount === 1 ? '' : 's') +
                    '. Te recomendamos corregirlo antes de pagar.'}
              </p>
            </div>

            <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
              {report.issues.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                  <p className="text-[11px] font-bold text-slate-700 mt-2">Todo en orden</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    No detectamos problemas de impresion en tus capas.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {report.issues.map((issue) => (
                    <li key={issue.id} className="p-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={
                            'mt-1 w-2 h-2 rounded-full shrink-0 ' + SEVERITY_DOT[issue.severity]
                          }
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => focusLayer(issue)}
                            className="text-left w-full group"
                          >
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-bold text-slate-800 group-hover:text-violet-700 transition-colors">
                                {issue.title}
                              </p>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                {issue.layerName}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {issue.description}
                            </p>
                          </button>
                          {issue.fix && (
                            <button
                              onClick={() => issue.fix && applyFix(issue, issue.fix.patch)}
                              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                              <Wand2 size={10} />
                              {issue.fix.label}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
