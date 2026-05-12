// HU-12.4 — Indicador discreto de autosave en el header.
// Muestra "Guardando…", "Guardado hace 3s", "Sin cambios" o "Error" segun el
// estado del hook useAutosave.

import { useEffect, useState } from 'react';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import type { AutosaveStatus } from '../hooks/useAutosave';

interface Props {
  status: AutosaveStatus;
  lastSavedAt: number | null;
}

function formatRelative(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 5) return 'Guardado';
  if (sec < 60) return 'Guardado hace ' + sec + 's';
  const min = Math.floor(sec / 60);
  if (min < 60) return 'Guardado hace ' + min + ' min';
  const h = Math.floor(min / 60);
  if (h < 24) return 'Guardado hace ' + h + ' h';
  const d = Math.floor(h / 24);
  return 'Guardado hace ' + d + ' d';
}

export function SaveIndicator({ status, lastSavedAt }: Props) {
  // Tick para que el "hace X" se actualice solo.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (status === 'saving') {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
        <Loader2 size={12} className="animate-spin" />
        <span>Guardando…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-amber-600 font-medium" title="No se pudo guardar localmente">
        <CloudOff size={12} />
        <span>Sin guardar</span>
      </div>
    );
  }

  if (status === 'saved' && lastSavedAt) {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium" title="Guardado automaticamente en este navegador">
        <Check size={12} className="text-emerald-500" />
        <span>{formatRelative(Date.now() - lastSavedAt)}</span>
      </div>
    );
  }

  return null;
}
