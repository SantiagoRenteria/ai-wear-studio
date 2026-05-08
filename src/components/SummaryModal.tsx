import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import { X, Download, Sparkles, Eye } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ViewType, Layer } from '../types';
import { GarmentMockup } from './GarmentMockup';
import { getSizeScale, getAvailableViews } from '../data/catalog';

/**
 * SummaryModal — HU-7.8 (corregido)
 *
 * Ventana flotante que muestra SOLO las vistas con contenido.
 * Cada vista renderiza un Konva Stage real (no overlay HTML), garantizando
 * que la previsualización refleje exactamente el diseño aplicado.
 */

const VIEW_LABELS: Record<ViewType, string> = {
  front: 'Frente',
  back: 'Espalda',
  left_sleeve: 'Manga Izquierda',
  right_sleeve: 'Manga Derecha',
};

// VIEWS dinamico por garment se computa adentro del componente.

interface SummaryModalProps { onClose: () => void; }

/* Sub-componente: renderiza una vista pequeña con Konva real */
function ViewPreview({ view, mockupSize }: { view: ViewType; mockupSize: number }) {
  const store = useStore();
  const layers = store.layers[view].filter(l => !l.hidden).sort((a, b) => a.zIndex - b.zIndex);
  const sizeScale = getSizeScale(store.selectedSize);

  // Stage size — debe coincidir con el inset del CanvasEngine: 28% / 32% / 22% / 32%
  const stageW = mockupSize * 0.36;  // 100% - 32% - 32%
  const stageH = mockupSize * 0.50;  // 100% - 28% - 22%

  // Bug-fix Vista Resumen — las capas tienen coords absolutas relativas al stage del
  // canvas grande. Aqui escalamos para que entren en el stage chico.
  const refSize = store.canvasStageSize;
  const scaleRatio = refSize.width > 0 ? stageW / refSize.width : 1;

  return (
    <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden">
      {/* Garment background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <GarmentMockup
          type={store.garment.type}
          view={view}
          colorHex={store.selectedColor.hex}
          sizeScale={sizeScale}
          className="w-[92%] h-[92%]"
        />
      </div>
      {/* Konva real-deal — exactamente como en CanvasEngine, escalado proporcional */}
      <div className="absolute inset-[28%_32%_22%_32%]">
        <Stage width={stageW} height={stageH} scaleX={scaleRatio} scaleY={scaleRatio}>
          <KonvaLayer>
            {layers.map(layer => {
              if (layer.type === 'text') {
                return (
                  <KonvaText
                    key={layer.id}
                    text={layer.content}
                    x={layer.x} y={layer.y}
                    rotation={layer.rotation}
                    scaleX={layer.scaleX} scaleY={layer.scaleY}
                    fill={layer.color}
                    fontFamily={layer.fontFamily || 'Inter'}
                    fontSize={layer.fontSize || 32}
                    fontStyle={layer.fontWeight === 'bold' ? 'bold' : 'normal'}
                    align={layer.textAlign || 'center'}
                    letterSpacing={layer.letterSpacing || 0}
                    stroke={layer.textEffect === 'stroke' ? layer.strokeColor : undefined}
                    strokeWidth={layer.textEffect === 'stroke' ? 2 : 0}
                    shadowColor={layer.textEffect === 'glow' || layer.textEffect === 'neon' ? layer.color : (layer.textEffect === 'shadow' ? 'rgba(0,0,0,0.3)' : undefined)}
                    shadowBlur={layer.textEffect === 'neon' ? 24 : (layer.textEffect === 'glow' ? 20 : 0)}
                    shadowOpacity={layer.textEffect === 'glow' || layer.textEffect === 'neon' ? 1 : (layer.textEffect === 'shadow' ? 1 : 0)}
                    shadowOffsetX={layer.textEffect === 'shadow' ? 4 : 0}
                    shadowOffsetY={layer.textEffect === 'shadow' ? 4 : 0}
                  />
                );
              }
              if (layer.type === 'image' || layer.type === 'ai') {
                return <SummaryKonvaImage key={layer.id} layer={layer} />;
              }
              return null;
            })}
          </KonvaLayer>
        </Stage>
      </div>
    </div>
  );
}

function SummaryKonvaImage({ layer }: { layer: Layer }) {
  const [img] = useImage(layer.content);
  return (
    <KonvaImage
      image={img}
      x={layer.x} y={layer.y}
      scaleX={layer.scaleX} scaleY={layer.scaleY}
      rotation={layer.rotation}
    />
  );
}

export function SummaryModal({ onClose }: SummaryModalProps) {
  const store = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // SOLO mostrar vistas que (1) aplican al garment y (2) tengan capas visibles.
  const garmentViews = getAvailableViews(store.garment);
  const usedViews = garmentViews.filter(v => store.layers[v].some(l => !l.hidden));

  // Layout dinámico según número de vistas
  const cols = usedViews.length === 1 ? 1 : 2;
  const mockupSize = 320;

  const handleDownload = async () => {
    // Compone un canvas con las vistas usadas
    const w = 1600;
    const cellSize = 700;
    const titleH = 100;
    const cellsPerRow = usedViews.length === 1 ? 1 : 2;
    const rows = Math.ceil(usedViews.length / cellsPerRow);
    const h = titleH + rows * cellSize + 40;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillText('AI Wear Studio · ' + store.garment.name, 40, 50);
    ctx.font = '20px Inter';
    ctx.fillStyle = '#64748B';
    ctx.fillText(store.selectedColor.name + ' · Talla ' + store.selectedSize, 40, 80);

    usedViews.forEach((view, i) => {
      const col = i % cellsPerRow;
      const row = Math.floor(i / cellsPerRow);
      const x = 40 + col * (cellSize + 20);
      const y = titleH + row * (cellSize + 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(x, y, cellSize, cellSize);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 18px Inter';
      ctx.fillText(VIEW_LABELS[view], x + 20, y + 30);
      const layers = store.layers[view].filter(l => !l.hidden);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px Inter';
      ctx.fillText(layers.length + ' ' + (layers.length === 1 ? 'capa' : 'capas'), x + 20, y + 50);
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aiwear-resumen-' + Date.now() + '.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (usedViews.length === 0) {
    // Empty state
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[180] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md p-8 text-center"
          >
            <Eye size={32} className="mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-black text-slate-800">Sin diseño aún</h3>
            <p className="text-sm text-slate-500 mt-1">Añade al menos una capa para ver el resumen.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest">Cerrar</button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Tamaño de la ventana flotante según cuántas vistas hay
  const maxW = cols === 1 ? 'max-w-md' : usedViews.length === 2 ? 'max-w-2xl' : 'max-w-3xl';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className={'bg-white rounded-2xl shadow-2xl w-full ' + maxW + ' max-h-[88vh] overflow-hidden flex flex-col'}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-md">
                <Eye size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Vista resumen</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {store.garment.name} · {store.selectedColor.name} · Talla {store.selectedSize} · {usedViews.length} {usedViews.length === 1 ? 'vista' : 'vistas'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-md"
              >
                <Download size={12} />
                Descargar
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50">
            <div className={'grid gap-3 ' + (cols === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {usedViews.map(view => {
                const layers = store.layers[view].filter(l => !l.hidden);
                return (
                  <div key={view} className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">
                        {VIEW_LABELS[view]}
                      </span>
                      <span className="text-[8px] font-bold text-violet-600 bg-violet-100 px-1 py-0 rounded-full">
                        {layers.length}
                      </span>
                    </div>
                    <ViewPreview view={view} mockupSize={mockupSize} />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500 italic">
              <Sparkles size={12} className="text-violet-500" />
              Las {usedViews.length === 1 ? 'vista' : 'vistas'} se imprimen exactamente como las ves
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
