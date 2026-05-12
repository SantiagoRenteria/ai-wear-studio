import React, { useState, useEffect, useRef } from 'react';
import {
  Layers, Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Copy,
  Image as ImageIcon, Type as TypeIcon, Sparkles, Wand2, Camera, Eye as EyeIcon,
  Maximize2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ViewType, Layer } from '../types';
import { cn } from '../lib/utils';
import { RemixModal } from './RemixModal';
import { TryOnModal } from './TryOnModal';
import { SummaryModal } from './SummaryModal';
import { ColorPicker } from './ColorPicker';
import { GarmentMockup } from './GarmentMockup';
import { getPrintZone, getPrintZones, getAllZones, getZoneByPlacement, computeZoneTransition, applyZoneOverride, zoneKey, generateCustomZoneId, getAvailableViews } from '../data/catalog';

const VIEW_LABELS: Record<ViewType, string> = {
  front: 'Frente',
  back: 'Espalda',
  left_sleeve: 'Manga Izq.',
  right_sleeve: 'Manga Der.',
};

const ALL_VIEWS: { id: ViewType; label: string }[] = (Object.keys(VIEW_LABELS) as ViewType[]).map((id) => ({
  id, label: VIEW_LABELS[id],
}));

function layerLabel(layer: Layer): string {
  if (layer.name) return layer.name;
  if (layer.type === 'text') return layer.content || 'Texto';
  if (layer.type === 'ai') return 'Diseño IA';
  return 'Imagen';
}

function LayerThumb({ layer }: { layer: Layer }) {
  if (layer.type === 'text') {
    return (
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0" style={{ color: layer.color || '#0f172a' }}>
        <TypeIcon size={14} />
      </div>
    );
  }
  if (layer.type === 'ai') {
    return (
      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 text-white relative">
        {layer.content?.startsWith('data:image') ? (
          <img src={layer.content} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Sparkles size={14} />
        )}
        <span className="absolute bottom-0 right-0 bg-violet-700 rounded-tl-md p-0.5">
          <Sparkles size={7} className="text-white" />
        </span>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
      {layer.content ? <img src={layer.content} alt="" className="w-full h-full object-contain" loading="lazy" /> : <ImageIcon size={14} className="text-slate-400" />}
    </div>
  );
}

/* Inspector contextual según tipo de capa seleccionada */
function LayerInspector({ layer, onOpenUpload }: { layer: Layer; onOpenUpload?: (content: string) => void }) {
  const store = useStore();
  if (!layer) return null;

  if (layer.type === 'text') {
    return (
      <div className="px-4 py-3 border-b border-slate-100 space-y-3 bg-violet-50/20">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inspector · Texto</p>
        <ZonePicker layer={layer} />
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Contenido</label>
          <input
            value={layer.content}
            onChange={(e) => store.updateLayer(store.currentView, layer.id, { content: e.target.value })}
            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-violet-500 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Color</label>
          <ColorPicker
            value={layer.color || '#0F172A'}
            onChange={(hex) => store.updateLayer(store.currentView, layer.id, { color: hex })}
            compact
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tamaño</label>
            <input
              type="number" min="10" max="200"
              value={layer.fontSize || 32}
              onChange={(e) => store.updateLayer(store.currentView, layer.id, { fontSize: parseInt(e.target.value) })}
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Peso</label>
            <select
              value={layer.fontWeight || 'normal'}
              onChange={(e) => store.updateLayer(store.currentView, layer.id, { fontWeight: e.target.value as any })}
              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md outline-none"
            >
              <option value="normal">Regular</option>
              <option value="bold">Bold</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (layer.type === 'image' || layer.type === 'ai') {
    return (
      <div className="px-4 py-3 border-b border-slate-100 space-y-3 bg-violet-50/20">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Inspector · {layer.type === 'ai' ? 'Diseño IA' : 'Imagen'}
        </p>
        <ZonePicker layer={layer} />
        <div className="h-24 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0]">
          <img src={layer.content} alt="" className="w-full h-full object-contain" />
        </div>

        {layer.type === 'image' && onOpenUpload && (
          <button
            onClick={() => onOpenUpload(layer.content)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-violet-300 bg-white text-violet-700 text-[10px] font-black uppercase tracking-widest hover:bg-violet-50 transition-colors"
          >
            <ImageIcon size={12} />
            Editar imagen
          </button>
        )}

        {/* Bug-fix UX: slider visible para resize comodo, capped al print zone. */}
        <ScaleSlider layer={layer} />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rotación</label>
            <span className="text-[10px] font-bold text-violet-600 tabular-nums">{Math.round(layer.rotation)}°</span>
          </div>
          <input
            type="range" min="-180" max="180" step="1"
            value={layer.rotation}
            onChange={(e) => store.updateLayer(store.currentView, layer.id, { rotation: parseInt(e.target.value) })}
            className="w-full accent-violet-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    );
  }
  return null;
}

interface RightPanelProps {
  onOpenTool?: (tool: 'upload' | 'ai' | 'text' | 'art' | 'product' | 'names') => void;
}

export function RightPanel({ onOpenTool }: RightPanelProps = {}) {
  const store = useStore();
  const currentLayers = store.layers[store.currentView];
  const [remixingLayer, setRemixingLayer] = useState<Layer | null>(null);
  const [showTryOn, setShowTryOn] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const sorted = [...currentLayers].sort((a, b) => b.zIndex - a.zIndex);

  const hasImageLayer = (['front', 'back', 'left_sleeve', 'right_sleeve'] as ViewType[]).some((v) =>
    store.layers[v].some((l) => !l.hidden && (l.type === 'image' || l.type === 'ai'))
  );
  const totalLayersAcross = (['front', 'back', 'left_sleeve', 'right_sleeve'] as ViewType[]).reduce((sum, v) => sum + store.layers[v].length, 0);

  const activeLayer = currentLayers.find(l => l.id === store.activeLayerId);

  return (
    <div className="w-72 lg:w-80 xl:w-96 border-l border-slate-200 flex flex-col bg-white z-30 shrink-0">
      {remixingLayer && <RemixModal layerId={remixingLayer.id} baseImageUrl={remixingLayer.content} onClose={() => setRemixingLayer(null)} />}
      {showTryOn && <TryOnModal onClose={() => setShowTryOn(false)} />}
      {showSummary && <SummaryModal onClose={() => setShowSummary(false)} />}

      {/* CTAs principales */}
      <div className="px-4 pt-4 space-y-2">
        {hasImageLayer && (
          <button
            onClick={() => setShowTryOn(true)}
            className="group relative overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-3 hover:shadow-lg hover:shadow-violet-500/10 transition-all w-full"
          >
            <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br from-violet-200 to-fuchsia-200 opacity-50 blur-2xl" />
            <div className="relative flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-md shadow-violet-500/20 group-hover:scale-110 transition-transform">
                <Camera size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] font-black text-slate-900 leading-tight flex items-center gap-1.5">
                  AI Try-On
                  <span className="text-[7.5px] font-black uppercase tracking-widest text-violet-700 bg-white/80 border border-violet-200 px-1 py-0.5 rounded">Beta</span>
                </p>
                <p className="text-[9.5px] text-slate-500 mt-0.5 leading-snug">Mira tu diseno puesto en un modelo</p>
              </div>
              <Sparkles size={12} className="text-violet-500 shrink-0 group-hover:rotate-12 transition-transform" />
            </div>
          </button>
        )}
        {totalLayersAcross > 0 && (
          <button
            onClick={() => setShowSummary(true)}
            className="group flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30 transition-all"
          >
            <Maximize2 size={14} className="text-violet-600 shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Vista resumen</p>
              <p className="text-[9px] text-slate-500">Las 4 caras del producto</p>
            </div>
          </button>
        )}
      </div>

      {/* Body scrolleable: Inspector + Vistas + Capas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
      {/* Inspector contextual (HU-7.6) */}
      {activeLayer && (
        <LayerInspector
          layer={activeLayer}
          onOpenUpload={(content) => {
            // HU-7.x: live-edit. Cargamos el draft con editLayerId apuntando a la
            // capa real para que los cambios del slider se propaguen al canvas.
            store.setUploadDraft({
              originalImage: content,
              cleanedImage: null,
              tempImage: content,
              keepOriginal: false,
              tempScale: activeLayer.scaleX,
              tempRotation: activeLayer.rotation,
              editLayerId: activeLayer.id,
              editView: store.currentView,
            });
            if (onOpenTool) onOpenTool('upload');
          }}
        />
      )}

      {/* HU-7.x — Editor de zona de impresion */}
      <ZoneEditorSection />

      {/* View Switcher */}
      <div className="px-5 py-4 border-b border-slate-100 mt-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Vistas del producto</label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_VIEWS.filter((v) => getAvailableViews(store.garment).includes(v.id)).map((view) => {
            const isActive = store.currentView === view.id;
            const visibleLayers = store.layers[view.id].filter((l) => !l.hidden);
            const count = visibleLayers.length;
            // Bug-fix: thumbnail muestra la prenda con su color real + miniatura de la primera capa.
            const previewLayer = visibleLayers.find((l) => l.type === 'image' || l.type === 'ai');
            return (
              <button
                key={view.id} onClick={() => store.setView(view.id)}
                className={cn('group relative aspect-square rounded-xl border-2 transition-all overflow-hidden',
                  isActive ? 'border-violet-500 ring-2 ring-violet-200' : 'border-slate-200 hover:border-slate-300 bg-slate-50/40')}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <GarmentMockup
                    type={store.garment.type}
                    view={view.id}
                    colorHex={store.selectedColor.hex}
                    sizeScale={1}
                    className="w-[80%] h-[80%] opacity-90"
                  />
                </div>
                <ViewThumbLayers viewId={view.id} />
                {visibleLayers.length === 0 && count > 0 && (
                  <div className="absolute inset-[35%] flex items-center justify-center text-violet-600 pointer-events-none">
                    <TypeIcon size={14} />
                  </div>
                )}
                <span className={cn(
                  'absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-tight backdrop-blur',
                  isActive ? 'bg-violet-600 text-white' : 'bg-white/85 text-slate-700',
                )}>
                  {view.label}
                </span>
                {count > 0 && (
                  <span className={cn('absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center',
                    isActive ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white')}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Layers */}
      <div className="flex flex-col">
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Capas <span className="text-slate-400">({currentLayers.length})</span></h3>
          </div>
          {currentLayers.length > 0 && (
            <button
              onClick={() => {
                if (confirm('¿Borrar todas las capas de esta vista?')) {
                  currentLayers.forEach((l) => store.removeLayer(store.currentView, l.id));
                }
              }}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500"
            >Limpiar</button>
          )}
        </div>

        <div className="p-3 space-y-1.5">
          {sorted.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30 py-10">
              <Layers size={28} />
              <span className="text-[10px] font-bold uppercase tracking-tight text-center px-4">Sin capas en esta vista</span>
            </div>
          ) : (
            sorted.map((layer, idxFromTop) => {
              const isActive = store.activeLayerId === layer.id;
              const isHidden = layer.hidden;
              const isTop = idxFromTop === 0;
              const isBottom = idxFromTop === sorted.length - 1;
              return (
                <div
                  key={layer.id} onClick={() => store.setActiveLayer(layer.id)}
                  className={cn('group p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2',
                    isActive ? 'border-violet-500 bg-violet-50/40 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/40',
                    isHidden && 'opacity-50')}
                >
                  <LayerThumb layer={layer} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{layerLabel(layer)}</p>
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider truncate">
                      {layer.placementZone}{isHidden && ' · Oculta'}
                    </p>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {layer.type === 'ai' && (
                      <button onClick={(e) => { e.stopPropagation(); setRemixingLayer(layer); }} className="p-1 text-violet-500 hover:text-violet-700" title="Remix"><Wand2 size={13} /></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); store.reorderLayer(store.currentView, layer.id, 'up'); }} disabled={isTop} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Subir"><ChevronUp size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); store.reorderLayer(store.currentView, layer.id, 'down'); }} disabled={isBottom} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Bajar"><ChevronDown size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); store.duplicateLayer(store.currentView, layer.id); }} className="p-1 text-slate-400 hover:text-violet-600" title="Duplicar"><Copy size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); store.toggleLayerVisibility(store.currentView, layer.id); }} className="p-1 text-slate-400 hover:text-slate-700" title={isHidden ? 'Mostrar' : 'Ocultar'}>
                      {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); store.removeLayer(store.currentView, layer.id); }} className="p-1 text-slate-400 hover:text-red-500" title="Eliminar"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * ViewThumbLayers — pinta cada capa con CSS transform respetando x/y/scale/rotation.
 * Estrategia: medimos el tamano real del print-zone container del thumbnail con
 * ResizeObserver, y dentro renderizamos un viewport en coords NATURALES del stage
 * (px de canvas) escalado al tamano medido. Asi cada capa puede usar Konva-style
 * transform = translate(x,y) rotate(r) scale(sx,sy) y matchea exactamente el canvas.
 */
function ViewThumbLayers({ viewId }: { viewId: ViewType }) {
  const store = useStore();
  const layers = store.layers[viewId].filter((l) => !l.hidden).sort((a, b) => a.zIndex - b.zIndex);
  const stage = store.canvasStageSize;
  const zone = getPrintZone(store.garment.type, viewId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (layers.length === 0 || stage.width <= 0 || stage.height <= 0) return null;

  const scaleX = size.w > 0 ? size.w / stage.width : 0;
  const scaleY = size.h > 0 ? size.h / stage.height : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: (zone.top * 100).toFixed(2) + '%',
        right: (zone.right * 100).toFixed(2) + '%',
        bottom: (zone.bottom * 100).toFixed(2) + '%',
        left: (zone.left * 100).toFixed(2) + '%',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: stage.width + 'px',
          height: stage.height + 'px',
          transform: 'scale(' + scaleX + ', ' + scaleY + ')',
          transformOrigin: '0 0',
        }}
      >
        {layers.map((layer) => {
          const t = 'translate(' + layer.x + 'px, ' + layer.y + 'px) rotate(' +
            layer.rotation + 'deg) scale(' + layer.scaleX + ', ' + layer.scaleY + ')';
          const base: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            transform: t,
            transformOrigin: '0 0',
          };
          if (layer.type === 'text') {
            return (
              <span
                key={layer.id}
                style={{
                  ...base,
                  color: layer.color || '#0F172A',
                  fontFamily: layer.fontFamily || 'Inter',
                  fontSize: (layer.fontSize || 32) + 'px',
                  fontWeight: layer.fontWeight === 'bold' ? 900 : 400,
                  whiteSpace: 'nowrap',
                  letterSpacing: (layer.letterSpacing || 0) + 'px',
                }}
              >
                {layer.content}
              </span>
            );
          }
          return (
            <img key={layer.id} src={layer.content} alt="" style={base} draggable={false} />
          );
        })}
      </div>
    </div>
  );
}

/**
 * ZoneEditorSection — editor de zonas de impresion del view actual.
 * Lista las zonas, deja seleccionar una, y muestra controles para mover (X, Y)
 * y redimensionar (Width, Height). Todos los sliders clampean al espacio de la prenda.
 */
function ZoneEditorSection() {
  const store = useStore();
  const customKey = store.garment.type + ':' + store.currentView;
  const customEntries = store.customZoneEntries[customKey] || [];
  const baseZones = getAllZones(store.garment.type, store.currentView, customEntries);
  const isCustom = (id: string) => id.startsWith('custom-');

  // El id seleccionado vive en el store para que el canvas lo refleje en vivo.
  const selectedId = store.editingZoneId
    && baseZones.find((z) => z.id === store.editingZoneId)
    ? store.editingZoneId
    : (baseZones.find((z) => z.primary)?.id || baseZones[0]?.id || null);

  // Asegurar que el store siempre tenga un id valido para la combinacion actual.
  useEffect(() => {
    if (selectedId && selectedId !== store.editingZoneId) {
      store.setEditingZoneId(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, store.garment.type, store.currentView]);

  const baseZone = baseZones.find((z) => z.id === selectedId);
  if (!baseZone) return null;

  const key = zoneKey(store.garment.type, store.currentView, baseZone.id);
  const override = store.customZones[key];
  const currentZone = override ? applyZoneOverride(baseZone, override) : baseZone;
  const isCustomized = !!override;

  // De insets a {x, y, width, height} para los sliders.
  const x = currentZone.left;
  const y = currentZone.top;
  const w = 1 - currentZone.left - currentZone.right;
  const h = 1 - currentZone.top - currentZone.bottom;

  // Limites: el ancho/alto minimo es 5%, maximo 80% del espacio.
  const MIN_SIDE = 0.05;
  const MAX_SIDE = 0.80;

  const setInsets = (insets: { top?: number; right?: number; bottom?: number; left?: number }) => {
    store.setCustomZone(key, { ...override, ...insets });
  };

  const updateX = (newX: number) => {
    const clampedX = Math.max(0, Math.min(1 - w - 0.005, newX));
    setInsets({ left: clampedX, right: 1 - clampedX - w });
  };
  const updateY = (newY: number) => {
    const clampedY = Math.max(0, Math.min(1 - h - 0.005, newY));
    setInsets({ top: clampedY, bottom: 1 - clampedY - h });
  };
  const updateW = (newW: number) => {
    const clampedW = Math.max(MIN_SIDE, Math.min(MAX_SIDE, newW));
    // Mantener X; ajustar right.
    const newRight = Math.max(0, 1 - x - clampedW);
    setInsets({ left: x, right: newRight });
  };
  const updateH = (newH: number) => {
    const clampedH = Math.max(MIN_SIDE, Math.min(MAX_SIDE, newH));
    const newBottom = Math.max(0, 1 - y - clampedH);
    setInsets({ top: y, bottom: newBottom });
  };

  const fmt = (v: number) => (v * 100).toFixed(0) + '%';

  return (
    <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Zona de impresion
        </label>
        {isCustomized && (
          <button
            onClick={() => store.resetCustomZone(key)}
            className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-violet-600 transition-colors"
            title="Volver a la posicion original del catalogo"
          >
            Restablecer
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 items-center">
        {baseZones.map((z) => {
          const active = selectedId === z.id;
          const removable = isCustom(z.id);
          return (
            <span
              key={z.id}
              className={
                'inline-flex items-center gap-0.5 rounded-md transition-all ' +
                (active
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300')
              }
            >
              <button
                onClick={() => store.setEditingZoneId(z.id)}
                className="px-2 py-1 text-[10px] font-bold"
              >
                {z.label}
              </button>
              {removable && (
                <button
                  onClick={() => {
                    // Si la zona removida estaba seleccionada, mover el editingId a la primaria.
                    if (selectedId === z.id) {
                      const fallback = baseZones.find((bz) => bz.id !== z.id);
                      if (fallback) store.setEditingZoneId(fallback.id);
                    }
                    store.removeCustomZone(customKey, z.id);
                    // Limpiar override si lo habia.
                    store.resetCustomZone(zoneKey(store.garment.type, store.currentView, z.id));
                  }}
                  className={
                    'pr-1.5 -ml-0.5 text-[12px] leading-none ' +
                    (active ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-red-500')
                  }
                  title="Quitar zona"
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
        <button
          onClick={() => {
            // Nueva zona centrada al ~30% del area, technique DTG por default.
            const id = generateCustomZoneId();
            const next = (customEntries.length || 0) + 1;
            store.addCustomZone(customKey, {
              id,
              label: 'Zona ' + (baseZones.length + 1 - (baseZones.length - customEntries.length)),
              technique: 'DTG',
              top: 0.35, right: 0.35, bottom: 0.35, left: 0.35,
            });
            store.setEditingZoneId(id);
          }}
          className="px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 transition-colors"
          title="Agregar zona personalizada"
        >
          + Zona
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pos. X</span>
            <span className="text-[10px] font-bold text-violet-600 tabular-nums">{fmt(x)}</span>
          </div>
          <input
            type="range" min="0" max="0.95" step="0.005"
            value={x}
            onChange={(e) => updateX(parseFloat(e.target.value))}
            className="w-full accent-violet-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pos. Y</span>
            <span className="text-[10px] font-bold text-violet-600 tabular-nums">{fmt(y)}</span>
          </div>
          <input
            type="range" min="0" max="0.95" step="0.005"
            value={y}
            onChange={(e) => updateY(parseFloat(e.target.value))}
            className="w-full accent-violet-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ancho</span>
            <span className="text-[10px] font-bold text-violet-600 tabular-nums">{fmt(w)}</span>
          </div>
          <input
            type="range" min={MIN_SIDE} max={MAX_SIDE} step="0.005"
            value={w}
            onChange={(e) => updateW(parseFloat(e.target.value))}
            className="w-full accent-violet-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Alto</span>
            <span className="text-[10px] font-bold text-violet-600 tabular-nums">{fmt(h)}</span>
          </div>
          <input
            type="range" min={MIN_SIDE} max={MAX_SIDE} step="0.005"
            value={h}
            onChange={(e) => updateH(parseFloat(e.target.value))}
            className="w-full accent-violet-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>
      </div>
      <p className="text-[9px] text-slate-400 leading-snug">
        Maximo {(MAX_SIDE * 100).toFixed(0)}% de la prenda. Tambien podes arrastrar la
        zona desde su etiqueta en el canvas.
      </p>
    </div>
  );
}

/**
 * ZonePicker — selector de print zone para la capa. Muestra solo si el view
 * tiene mas de una zona disponible.
 */
function ZonePicker({ layer }: { layer: Layer }) {
  const store = useStore();
  const zones = getPrintZones(store.garment.type, store.currentView);
  if (zones.length <= 1) return null;
  return (
    <div>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
        Zona de impresion
      </label>
      <div className="flex flex-wrap gap-1">
        {zones.map((z) => {
          const active = layer.placementZone === z.id;
          return (
            <button
              key={z.id}
              onClick={() => {
                const oldZone = getZoneByPlacement(store.garment.type, store.currentView, layer.placementZone);
                const t = computeZoneTransition(oldZone, z, store.canvasStageSize.width, store.canvasStageSize.height);
                store.updateLayer(store.currentView, layer.id, {
                  placementZone: z.id,
                  x: t.x,
                  y: t.y,
                  scaleX: layer.scaleX * t.shrinkRatio,
                  scaleY: layer.scaleY * t.shrinkRatio,
                });
              }}
              className={
                'px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ' +
                (active
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300')
              }
            >
              {z.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ScaleSlider — slider que mide la imagen natural y limita el max al print zone.
 * Asi nunca puedes pasarte del stage manipulando el slider.
 */
function ScaleSlider({ layer }: { layer: Layer }) {
  const store = useStore();
  const stage = store.canvasStageSize;
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (layer.type === 'text') return; // texto no tiene tamano natural; usamos default
    const img = new Image();
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = layer.content;
  }, [layer.content, layer.type]);

  // Default max = 3 (texto). Para imagenes calculamos el max real.
  let maxScale = 3;
  if (layer.type !== 'text' && naturalSize && stage.width > 0 && stage.height > 0) {
    const sx = stage.width / naturalSize.w;
    const sy = stage.height / naturalSize.h;
    maxScale = Math.max(0.2, Math.min(sx, sy));
  }
  const value = Math.min(layer.scaleX, maxScale);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Escala</label>
        <span className="text-[10px] font-bold text-violet-600 tabular-nums">{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range" min="0.05" max={maxScale.toFixed(3)} step="0.01"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          store.updateLayer(store.currentView, layer.id, { scaleX: v, scaleY: v });
        }}
        className="w-full accent-violet-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
      />
      <p className="text-[9px] text-slate-400 mt-1">Maximo {(maxScale * 100).toFixed(0)}% — limite de la zona de impresion</p>
    </div>
  );
}

function ShirtIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.62 1.97V7a2 2 0 0 0 2 2h1.13l1.75 12.23a2 2 0 0 0 2 1.72h7a2 2 0 0 0 2-1.72L19.25 9H20a2 2 0 0 0 2-2V5.43a2 2 0 0 0-1.62-1.97z" />
    </svg>
  );
}
