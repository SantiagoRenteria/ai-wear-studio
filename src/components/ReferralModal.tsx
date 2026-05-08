// HU-9.6 — Modal del programa de referidos.
// Muestra el link unico, botones de share, dashboard de invitaciones y credito.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Copy, Check, Gift, Send, Eye, Wand2, ShoppingBag,
  MessageCircle, Mail,
} from 'lucide-react';
import {
  REFERRAL_REWARD_COP,
  buildShareMessage,
  emailShareUrl,
  getReferralSummary,
  twitterShareUrl,
  whatsappShareUrl,
  type ReferralSummary,
} from '../services/referrals';

interface Props {
  onClose: () => void;
}

export function ReferralModal({ onClose }: Props) {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    getReferralSummary().then((s) => { if (mounted) setSummary(s); });
    return () => { mounted = false; };
  }, []);

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.myLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: seleccionamos el input.
      const input = document.getElementById('aiwear-referral-link') as HTMLInputElement | null;
      if (input) { input.select(); document.execCommand('copy'); setCopied(true); }
    }
  };

  const handleNativeShare = async () => {
    if (!summary || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({
        title: 'AI Wear Studio',
        text: buildShareMessage(summary.myLink),
        url: summary.myLink,
      });
    } catch {
      /* swallow cancel */
    }
  };

  const fmtCOP = (n: number) =>
    '$' + Math.round(n).toLocaleString('es-CO');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 12, opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 text-white">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <div className="relative">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur ring-1 ring-white/30">
                <Gift size={20} />
              </div>
              <h2 className="text-lg font-black mt-3">Invita y gana credito</h2>
              <p className="text-[11px] text-white/85 leading-snug mt-1">
                Cuando un amigo compre con tu link, ambos reciben{' '}
                <span className="font-black">{fmtCOP(REFERRAL_REWARD_COP)}</span>{' '}
                en credito para tu proximo pedido.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
            {!summary ? (
              <div className="py-8 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Cargando...
              </div>
            ) : (
              <>
                {/* Link compartible */}
                <section>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                    Tu link de invitacion
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="aiwear-referral-link"
                      readOnly value={summary.myLink}
                      className="flex-1 min-w-0 px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono truncate"
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      onClick={handleCopy}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Codigo: <span className="font-mono font-bold text-slate-700">{summary.myCode}</span>
                  </p>
                </section>

                {/* Botones de share */}
                <section>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                    Compartir
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={whatsappShareUrl(summary.myLink)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 py-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-emerald-600"
                    >
                      <MessageCircle size={20} />
                      <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                    </a>
                    <a
                      href={twitterShareUrl(summary.myLink)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 py-3 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50 transition-all text-sky-600"
                    >
                      <Send size={20} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Twitter</span>
                    </a>
                    <a
                      href={emailShareUrl(summary.myLink)}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-violet-600"
                    >
                      <Mail size={20} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Email</span>
                    </a>
                  </div>
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button
                      onClick={handleNativeShare}
                      className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-shadow"
                    >
                      Mas opciones de compartir
                    </button>
                  )}
                </section>

                {/* Dashboard */}
                <section>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                    Mis referidos
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Stat
                      icon={<Eye size={14} />}
                      label="Visitaron"
                      value={summary.totals.visited}
                      color="text-slate-700 bg-slate-50 border-slate-200"
                    />
                    <Stat
                      icon={<Wand2 size={14} />}
                      label="Disenaron"
                      value={summary.totals.designed}
                      color="text-amber-700 bg-amber-50 border-amber-200"
                    />
                    <Stat
                      icon={<ShoppingBag size={14} />}
                      label="Compraron"
                      value={summary.totals.purchased}
                      color="text-emerald-700 bg-emerald-50 border-emerald-200"
                    />
                  </div>
                </section>

                {/* Credito */}
                <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">
                        Credito disponible
                      </p>
                      <p className="text-2xl font-black text-violet-900 mt-0.5 tabular-nums">
                        {fmtCOP(summary.credits)}
                      </p>
                    </div>
                    <Gift size={36} className="text-violet-300" />
                  </div>
                  {summary.referredBy && (
                    <p className="text-[10px] text-violet-600 mt-2 italic">
                      Te invito el codigo {summary.referredBy} — recibiras {fmtCOP(REFERRAL_REWARD_COP)} al primer pedido.
                    </p>
                  )}
                </section>

                {/* Historial */}
                {summary.ledger.length > 0 && (
                  <section>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                      Historial de credito
                    </label>
                    <ul className="space-y-1.5">
                      {summary.ledger.slice().reverse().slice(0, 8).map((e, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-lg bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-700 truncate">{e.reason}</p>
                            <p className="text-[9px] text-slate-400">
                              {new Date(e.ts).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </p>
                          </div>
                          <span className="font-mono font-black text-emerald-600 shrink-0">
                            +{fmtCOP(e.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={'flex flex-col items-center gap-1 py-3 rounded-xl border ' + color}>
      {icon}
      <span className="text-lg font-black tabular-nums leading-none">{value}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">{label}</span>
    </div>
  );
}
