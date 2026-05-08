import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  Wand2, FlipHorizontal, FlipVertical,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Layer } from '../types';
import { RemixModal } from './RemixModal';

/**
 * ContextualToolbar — HU-2.2
 *
 * Toolbar flotante que aparece encima del canvas cuando hay una capa
 * seleccionada. Da acceso rápido a las acciones más comunes sin tener
 * que ir al RightPanel.
 *
 * Acciones: Remix (sólo capas IA) · Subir z · Bajar z · Voltear H · Voltear V
 *           · Duplicar · Ocultar · Eliminar.
 */

export function ContextualToolbar() {
  const store = useStore();
  const layers = store.layers[store.currentView];
  const sortedAsc = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  const layer = layers.find((l) => l.id === store.activeLayerId);
  const [remixingLayer, setRemixingLayer] = useState<Layer | null>(null);

  if (!layer) return null;

  const idx = sortedAsc.findIndex((l) => l.id === layer.id);
  const isTop = idx === sortedAsc.length - 1;
  const isBottom = idx === 0;

  const handleFlipH = () => {
    store.updateLayer(store.currentView, layer.id, { scaleX: -layer.scaleX });
  };
  const handleFlipV = () => {
    store.updateLayer(store.currentView, layer.id, { scaleY: -layer.scaleY });
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="ctb"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-white border border-slate-200 rounded-xl shadow-xl px-1.5 py-1.5 flex items-center gap-0.5 pointer-events-auto"
        >
          {/* Remix (sólo IA) */}
          {layer.type === 'ai' && (
            <>
              <button
                onClick={() => setRemixingLayer(layer)}
                title="Remix con IA"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <Wand2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Remix</span>
              </button>
              <ToolbarDivider />
            </>
          )}

          <ToolbarBtn
            icon={ChevronUp}
            label="Subir"
            onClick={() => store.reorderLayer(store.currentView, layer.id, 'up')}
            disabled={isTop}
          />
          <ToolbarBtn
            icon={ChevronDown}
            label="Bajar"
            onClick={() => store.reorderLayer(store.currentView, layer.id, 'down')}
            disabled={isBottom}
          />

          <ToolbarDivider />

          <ToolbarBtn icon={FlipHorizontal} label="Voltear H" onClick={handleFlipH} />
          <ToolbarBtn icon={FlipVertical} label="Voltear V" onClick={handleFlipV} />

          <ToolbarDivider />

          <ToolbarBtn
            icon={Copy}
            label="Duplicar"
            onClick={() => store.duplicateLayer(store.currentView, layer.id)}
          />
          <ToolbarBtn
            icon={layer.hidden ? EyeOff : Eye}
            label={layer.hidden ? 'Mostrar' : 'Ocultar'}
            onClick={() => store.toggleLayerVisibility(store.currentView, layer.id)}
          />

          <ToolbarDivider />

          <ToolbarBtn
            icon={Trash2}
            label="Eliminar"
            onClick={() => store.removeLayer(store.currentView, layer.id)}
            danger
          />
        </motion.div>
      </AnimatePresence>

      {remixingLayer && (
        <RemixModal
          layerId={remixingLayer.id}
          baseImageUrl={remixingLayer.content}
          onClose={() => setRemixingLayer(null)}
        />
      )}
    </>
  );
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={
        'p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ' +
        (danger
          ? 'text-slate-500 hover:text-red-500 hover:bg-red-50'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
      }
    >
      <Icon size={14} />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="h-5 w-px bg-slate-200 mx-0.5" />;
}
