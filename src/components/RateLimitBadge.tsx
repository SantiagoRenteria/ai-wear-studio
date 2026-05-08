// HU-15.1 — Badge inline que muestra "X de N generaciones gratis hoy".
// Cuando se agota, el badge se vuelve rojo y muestra cuanto falta para reset.

import { Sparkles, Infinity as InfinityIcon, Lock } from 'lucide-react';
import type { RateLimitSnapshot } from '../services/rateLimit';
import { timeUntilReset } from '../services/rateLimit';

interface Props {
  snapshot: RateLimitSnapshot | null;
  compact?: boolean;
}

export function RateLimitBadge({ snapshot, compact }: Props) {
  if (!snapshot) {
    return (
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
        ...
      </div>
    );
  }

  if (snapshot.unlocked) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
        <InfinityIcon size={11} />
        <span>{compact ? 'Ilimitado' : 'Generaciones ilimitadas'}</span>
      </div>
    );
  }

  if (snapshot.blocked) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
        <Lock size={12} className="text-rose-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
            Limite diario alcanzado
          </p>
          <p className="text-[9.5px] text-slate-600 mt-0.5 leading-snug">
            Vuelve en {timeUntilReset(snapshot.resetsAt)}, o compra una prenda y desbloquea generaciones ilimitadas.
          </p>
        </div>
      </div>
    );
  }

  const low = snapshot.remaining <= 2;
  return (
    <div
      className={
        'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ' +
        (low
          ? 'text-amber-700 bg-amber-50 border border-amber-200'
          : 'text-violet-700 bg-violet-50 border border-violet-200')
      }
      title={'Resetea en ' + timeUntilReset(snapshot.resetsAt)}
    >
      <Sparkles size={11} />
      <span>
        {snapshot.remaining}/{snapshot.total}{compact ? '' : ' gratis hoy'}
      </span>
    </div>
  );
}
