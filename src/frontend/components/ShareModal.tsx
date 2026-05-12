import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Link2, Check, Copy, Sparkles, Mail, MessageCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

/**
 * ShareModal — HU-4.4
 *
 * Genera un link compartible con el estado del diseño codificado en base64
 * en el hash de la URL. Quien abra el link verá el diseño cargado.
 * (La carga del estado desde el hash debe implementarse en App.tsx en
 *  un useEffect — ver TODO al final).
 */

interface ShareModalProps {
  onClose: () => void;
}

export function ShareModal({ onClose }: ShareModalProps) {
  const store = useStore();
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const payload = {
      v: 1,
      garment: store.garment,
      color: store.selectedColor,
      size: store.selectedSize,
      layers: store.layers,
    };
    try {
      const json = JSON.stringify(payload);
      // Comprimir vía base64 (TextEncoder → base64). Las imágenes data: ya son base64 largas pero funciona.
      const encoded = btoa(unescape(encodeURIComponent(json)));
      const base = window.location.origin + window.location.pathname;
      return `${base}#design=${encoded}`;
    } catch (e) {
      return window.location.href;
    }
  }, [store.garment, store.selectedColor, store.selectedSize, store.layers]);

  const truncatedUrl = shareUrl.length > 70 ? shareUrl.slice(0, 70) + '...' : shareUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: select all
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleWhatsapp = () => {
    const msg = encodeURIComponent(
      `Mira el diseño que hice en AI Wear Studio: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Mira mi diseño en AI Wear Studio');
    const body = encodeURIComponent(
      `Hola,\n\nMira el diseño único que hice con IA:\n${shareUrl}\n\n— Hecho con AI Wear Studio`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const sizeKb = Math.round(shareUrl.length / 1024);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-md shadow-violet-500/20">
                <Link2 size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">
                  Compartir diseño
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Quien abra el link verá tu diseño exacto
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
          <div className="p-5 space-y-4">
            {/* URL preview + copy */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-between">
                <span>Tu link</span>
                <span className="font-mono normal-case tracking-normal text-slate-300">
                  ~{sizeKb} KB
                </span>
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 truncate">
                  {truncatedUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className={
                    'shrink-0 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ' +
                    (copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 shadow-md shadow-violet-500/20')
                  }
                >
                  {copied ? (<><Check size={12} /> Copiado</>) : (<><Copy size={12} /> Copiar</>)}
                </button>
              </div>
            </div>

            {/* Quick share */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                Compartir directo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleWhatsapp}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </button>
                <button
                  onClick={handleEmail}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-md shadow-slate-500/20"
                >
                  <Mail size={14} />
                  Email
                </button>
              </div>
            </div>

            {/* Tip */}
            <div className="flex items-center gap-2 rounded-xl bg-violet-50/60 p-3 border border-violet-100">
              <Sparkles size={14} className="flex-shrink-0 text-violet-600" />
              <p className="text-[11px] text-violet-900 leading-snug">
                El diseño se guarda <strong>en el link</strong>, no en un servidor. Si lo borras, lo borras para todos.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
