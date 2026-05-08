import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Text as KonvaText, Transformer } from 'react-konva';
import { motion, AnimatePresence } from 'motion/react';
import useImage from 'use-image';
import { Sparkles, Upload, Type as TypeIcon, Shapes, Move, RotateCcw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Layer } from '../types';
import { ToolType } from './LeftRail';
import { GarmentMockup } from './GarmentMockup';
import { ContextualToolbar } from './ContextualToolbar';
import { PrintQualityBadge } from './PrintQualityBadge';
import { getSizeScale, getPrintZones, getAllZones, getZoneByPlacement, getPrimaryZone, techniqueLabel, computeZoneTransition, applyZoneOverride, zoneKey } from '../data/catalog';
import { registerExporter, svgNodeToDataUrl, loadImage, drawWatermark } from '../services/exporter';

/* PRINT_INSET helper: convierte la PrintZone del garment al string de Tailwind inline-style. */
function printInsetStyle(zone: { top: number; right: number; bottom: number; left: number }) {
  return {
    top: (zone.top * 100).toFixed(2) + '%',
    right: (zone.right * 100).toFixed(2) + '%',
    bottom: (zone.bottom * 100).toFixed(2) + '%',
    left: (zone.left * 100).toFixed(2) + '%',
  } as React.CSSProperties;
}

/* Hook auxiliar: dimensiones del stage para usar como dragBoundFunc. */
function useStageBounds(width: number, height: number) {
  return React.useCallback(
    (pos: { x: number; y: number }, nodeWidth = 0, nodeHeight = 0) => ({
      x: Math.max(-nodeWidth * 0.5, Math.min(pos.x, width - nodeWidth * 0.5)),
      y: Math.max(-nodeHeight * 0.5, Math.min(pos.y, height - nodeHeight * 0.5)),
    }),
    [width, height]
  );
}

const URLImage = ({ layer, isSelected, onSelect, onUpdate, stageWidth, stageHeight }: {
  layer: Layer; isSelected: boolean; onSelect: () => void;
  onUpdate: (u: Partial<Layer>) => void;
  stageWidth: number; stageHeight: number;
}) => {
  const [img] = useImage(layer.content);
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <KonvaImage
        ref={shapeRef} image={img}
        x={layer.x} y={layer.y}
        scaleX={layer.scaleX} scaleY={layer.scaleY}
        rotation={layer.rotation}
        draggable onClick={onSelect} onTap={onSelect}
        dragBoundFunc={(pos) => {
          const node = shapeRef.current;
          const w = node ? node.width() * layer.scaleX : 100;
          const h = node ? node.height() * layer.scaleY : 100;
          return {
            x: Math.max(-w * 0.5, Math.min(pos.x, stageWidth - w * 0.5)),
            y: Math.max(-h * 0.5, Math.min(pos.y, stageHeight - h * 0.5)),
          };
        }}
        onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = shapeRef.current;
          onUpdate({
            x: node.x(), y: node.y(),
            scaleX: node.scaleX(), scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer ref={trRef} anchorSize={8}
          borderStroke="#7C3AED" anchorStroke="#7C3AED" anchorFill="#ffffff"
          borderDash={[4, 4]} rotateAnchorOffset={28} keepRatio
          boundBoxFunc={(oldBox, newBox) => {
            // Min 8px para evitar collapse total.
            if (newBox.width < 8 || newBox.height < 8) return oldBox;
            // HU-7.x — Cap al print zone: la capa no puede ser mas grande que el stage.
            if (stageWidth > 0 && newBox.width > stageWidth) return oldBox;
            if (stageHeight > 0 && newBox.height > stageHeight) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

/* Bug-fix: el Transformer del texto no estaba bindeando al nodo Konva. Lo extraemos
   a un sub-componente que mantiene el ref del KonvaText y llama trRef.nodes([...]). */
const TextLayer = ({
  layer, isSelected, onSelect, onUpdate, stageWidth, stageHeight,
}: {
  layer: Layer; isSelected: boolean; onSelect: () => void;
  onUpdate: (u: Partial<Layer>) => void;
  stageWidth: number; stageHeight: number;
}) => {
  const textRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const isGradient = layer.textEffect === 'gradient';
  const is3D = layer.textEffect === '3d';
  const isNeon = layer.textEffect === 'neon';

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      {is3D && [5, 4, 3, 2, 1].map((d) => (
        <KonvaText
          key={'3d-' + d}
          text={layer.content}
          x={layer.x + d} y={layer.y + d}
          rotation={layer.rotation}
          scaleX={layer.scaleX} scaleY={layer.scaleY}
          fill={layer.color}
          opacity={0.18 + d * 0.06}
          fontFamily={layer.fontFamily || 'Inter'}
          fontSize={layer.fontSize || 32}
          fontStyle={layer.fontWeight === 'bold' ? 'bold' : 'normal'}
          align={layer.textAlign || 'center'}
          letterSpacing={layer.letterSpacing || 0}
          listening={false}
        />
      ))}
      {isNeon && [3, 2, 1].map((d) => (
        <KonvaText
          key={'neon-' + d}
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
          shadowColor={layer.color}
          shadowBlur={d * 8}
          shadowOpacity={0.6}
          listening={false}
        />
      ))}
      <KonvaText
        ref={textRef}
        id={layer.id} text={layer.content}
        x={layer.x} y={layer.y}
        rotation={layer.rotation}
        scaleX={layer.scaleX} scaleY={layer.scaleY}
        fill={isGradient ? undefined : layer.color}
        fillLinearGradientStartPoint={isGradient ? { x: 0, y: 0 } : undefined}
        fillLinearGradientEndPoint={isGradient ? { x: (layer.fontSize || 32) * 3, y: (layer.fontSize || 32) * 3 } : undefined}
        fillLinearGradientColorStops={isGradient ? [0, layer.color || '#7C3AED', 1, '#EC4899'] : undefined}
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
        draggable
        dragBoundFunc={(pos) => ({
          x: Math.max(-50, Math.min(pos.x, stageWidth - 20)),
          y: Math.max(-20, Math.min(pos.y, stageHeight - 20)),
        })}
        onClick={(e) => { e.cancelBubble = true; onSelect(); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(); }}
        onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e) => {
          const node = e.target;
          onUpdate({
            x: node.x(), y: node.y(),
            scaleX: node.scaleX(), scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer ref={trRef} anchorSize={8}
          borderStroke="#7C3AED" anchorStroke="#7C3AED" anchorFill="#ffffff"
          borderDash={[4, 4]} rotateAnchorOffset={28} keepRatio
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 8 || newBox.height < 8) return oldBox;
            if (stageWidth > 0 && newBox.width > stageWidth) return oldBox;
            if (stageHeight > 0 && newBox.height > stageHeight) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

const VIEW_LABELS: Record<string, string> = {
  front: 'Frente', back: 'Espalda', left_sleeve: 'Manga Izq.', right_sleeve: 'Manga Der.',
};

const GARMENT_LABELS: Record<string, string> = {
  't-shirt': 'Camiseta', 'polo': 'Polo', 'tank-top': 'Tank Top', 'long-sleeve': 'Manga Larga',
  'hoodie': 'Sudadera', 'sweatshirt': 'Buzo', 'shorts': 'Pantaloneta', 'sweatpants': 'Joggers', 'cap': 'Gorra',
};

interface CanvasEngineProps { onOpenTool?: (tool: ToolType) => void; }

export function CanvasEngine({ onOpenTool }: CanvasEngineProps = {}) {
  const stageRef = useRef<any>(null);
  const stageHostRef = useRef<HTMLDivElement>(null);
  const garmentHostRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [fontTick, setFontTick] = useState(0);
  const store = useStore();
  const visibleLayers = [...store.layers[store.currentView]]
    .filter((l) => !l.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);
  const hasLayers = store.layers[store.currentView].length > 0;
  // HU-7.x — multi-zonas. Renderizamos todas y destacamos la "activa".
  // Aplicamos overrides del usuario (drag de zonas) sobre el catalogo + custom.
  const customKey = store.garment.type + ':' + store.currentView;
  const customEntries = store.customZoneEntries[customKey] || [];
  const baseZones = getAllZones(store.garment.type, store.currentView, customEntries);
  const printZones = baseZones.map((z) => {
    const ov = store.customZones[zoneKey(store.garment.type, store.currentView, z.id)];
    return ov ? applyZoneOverride(z, ov) : z;
  });
  const primaryZoneRaw = getPrimaryZone(store.garment.type, store.currentView);
  const primaryOverride = store.customZones[zoneKey(store.garment.type, store.currentView, primaryZoneRaw.id)];
  const primaryZone = primaryOverride ? applyZoneOverride(primaryZoneRaw, primaryOverride) : primaryZoneRaw;
  const activeLayer = store.layers[store.currentView].find((l) => l.id === store.activeLayerId) || null;
  const activeZoneRaw = activeLayer
    ? getZoneByPlacement(store.garment.type, store.currentView, activeLayer.placementZone)
    : (store.editingZoneId
        ? (baseZones.find((z) => z.id === store.editingZoneId) ?? primaryZoneRaw)
        : primaryZoneRaw);
  const activeOverride = store.customZones[zoneKey(store.garment.type, store.currentView, activeZoneRaw.id)];
  const activeZone = activeOverride ? applyZoneOverride(activeZoneRaw, activeOverride) : activeZoneRaw;
  const printZone = activeZone; // alias de compat
  const printInset = printInsetStyle(activeZone);

  // HU-7.x — Drag de la propia zona de impresion + click-to-select.
  //  - Si el movimiento total es menos de 5px, el pointerup lo tratamos como CLICK
  //    y selecciona la zona como editing (no la mueve).
  //  - Si excede 5px, empezamos el drag y se mueve la zona.
  const handleZoneDragStart = (zoneId: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const host = garmentHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const key = zoneKey(store.garment.type, store.currentView, zoneId);
    const baseZone = baseZones.find((z) => z.id === zoneId)!;
    const ov = useStore.getState().customZones[key] ?? {};
    const startTop = ov.top ?? baseZone.top;
    const startRight = ov.right ?? baseZone.right;
    const startBottom = ov.bottom ?? baseZone.bottom;
    const startLeft = ov.left ?? baseZone.left;
    let moved = false;
    const DRAG_THRESHOLD = 5;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      moved = true;
      useStore.getState().setCustomZone(key, {
        top: startTop + dy / rect.height,
        bottom: startBottom - dy / rect.height,
        left: startLeft + dx / rect.width,
        right: startRight - dx / rect.width,
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Click: seleccionar la zona como editing.
      if (!moved) {
        useStore.getState().setEditingZoneId(zoneId);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // HU-7.x — Click en una zona no-activa cambia la zona del layer activo
  //   con auto-fit (shrink ratio + reposicionamiento). Si no hay layer
  //   seleccionado, ignoramos el click (se podra agregar un toast luego).
  const handleZoneClick = (zoneId: typeof printZones[0]['id']) => {
    if (!activeLayer) return;
    const oldZone = getZoneByPlacement(store.garment.type, store.currentView, activeLayer.placementZone);
    const newZone = getZoneByPlacement(store.garment.type, store.currentView, zoneId);
    if (oldZone.id === newZone.id) return;
    const t = computeZoneTransition(oldZone, newZone, store.canvasStageSize.width, store.canvasStageSize.height);
    store.updateLayer(store.currentView, activeLayer.id, {
      placementZone: newZone.id,
      x: t.x,
      y: t.y,
      scaleX: activeLayer.scaleX * t.shrinkRatio,
      scaleY: activeLayer.scaleY * t.shrinkRatio,
    });
  };

  useEffect(() => {
    const updateSize = () => {
      if (stageHostRef.current) {
        const size = {
          width: stageHostRef.current.offsetWidth,
          height: stageHostRef.current.offsetHeight,
        };
        setStageSize(size);
        // Bug-fix: la Vista Resumen y los thumbs necesitan saber esta medida
        // para escalar las capas (que tienen coords absolutas en este stage).
        if (size.width > 0 && size.height > 0) {
          store.setCanvasStageSize(size);
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (stageHostRef.current) ro.observe(stageHostRef.current);
    window.addEventListener('resize', updateSize);
    return () => { ro.disconnect(); window.removeEventListener('resize', updateSize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fix #5 — Re-render Konva cuando una nueva fuente termina de cargar.
     Esto sincroniza el preview HTML con el render Konva. */
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    const handler = () => setFontTick((t) => t + 1);
    document.fonts.addEventListener('loadingdone', handler);
    return () => document.fonts.removeEventListener('loadingdone', handler);
  }, []);

  // Re-renderiza el stage cuando cambia el tick de fuentes
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.batchDraw();
    }
  }, [fontTick]);

  // HU-4.3 — Exportar PNG con el mockup + capas + watermark.
  useEffect(() => {
    registerExporter(async () => {
      const stage = stageRef.current;
      const host = garmentHostRef.current;
      if (!stage || !host) return null;
      const hostRect = host.getBoundingClientRect();
      if (hostRect.width === 0 || hostRect.height === 0) return null;

      const SIZE = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Fondo claro neutro.
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // 1) Garment SVG -> Imagen.
      const svg = host.querySelector('svg');
      if (svg) {
        try {
          const svgUrl = svgNodeToDataUrl(svg);
          const garmentImg = await loadImage(svgUrl);
          // El SVG ocupa 92% del host. Lo escalamos al canvas final manteniendo
          // proporcion cuadrada (host es aspect-square por CSS).
          ctx.drawImage(garmentImg, 0, 0, SIZE, SIZE);
        } catch (err) {
          console.warn('[exporter] no se pudo dibujar el garment SVG, sigo:', err);
        }
      }

      // 2) Capas Konva. El stage host esta dentro del print inset dinamico
      //    segun la prenda+vista actual (usamos la zona primaria para el export).
      const zone = getPrimaryZone(useStore.getState().garment.type, useStore.getState().currentView);
      const insetTop = zone.top, insetRight = zone.right, insetBottom = zone.bottom, insetLeft = zone.left;
      const dx = SIZE * insetLeft;
      const dy = SIZE * insetTop;
      const dw = SIZE * (1 - insetLeft - insetRight);
      const dh = SIZE * (1 - insetTop - insetBottom);
      try {
        const layersUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
        const layersImg = await loadImage(layersUrl);
        ctx.drawImage(layersImg, dx, dy, dw, dh);
      } catch (err) {
        console.warn('[exporter] no se pudo dibujar las capas Konva:', err);
      }

      // 3) Watermark.
      drawWatermark(ctx, SIZE, SIZE);

      return canvas.toDataURL('image/png');
    });
  }, []);

  const handleSelect = (id: string | null) => store.setActiveLayer(id);

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div ref={garmentHostRef} className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={store.garment.type + '-' + store.currentView + '-' + store.selectedColor.hex + '-' + store.selectedSize}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <GarmentMockup
              type={store.garment.type}
              view={store.currentView}
              colorHex={store.selectedColor.hex}
              sizeScale={getSizeScale(store.selectedSize)}
              className="w-[92%] h-[92%]"
            />
          </motion.div>
        </AnimatePresence>

        {/* Render de TODAS las zonas: la activa con destaque, las otras dimmed.
            Si hay layer seleccionado, las inactivas son clickeables para mover la capa. */}
        {printZones.map((zone) => {
          const isActive = zone.id === activeZone.id;
          const isClickable = !!activeLayer && !isActive;
          return (
            <div
              key={zone.id}
              style={printInsetStyle(zone)}
              onClick={isClickable ? () => handleZoneClick(zone.id) : undefined}
              title={isClickable ? 'Mover la capa a "' + zone.label + '"' : undefined}
              className={'absolute border-2 rounded-xl z-0 transition-[border-color,box-shadow,opacity] duration-150 ' +
                (isClickable ? 'pointer-events-auto cursor-pointer hover:border-violet-400 hover:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]' : 'pointer-events-none') + ' ' +
                (isActive
                  ? 'border-violet-500 border-dashed shadow-[0_0_0_2px_rgba(124,58,237,0.15)]'
                  : 'border-slate-300/40 border-dashed')}
            >
              <div
                onPointerDown={handleZoneDragStart(zone.id)}
                onClick={(e) => e.stopPropagation()}
                title="Arrastra para mover la zona"
                className={'absolute left-1/2 -translate-x-1/2 px-3 py-1 bg-white/90 backdrop-blur rounded-full shadow-sm border whitespace-nowrap flex items-center gap-2 cursor-grab active:cursor-grabbing pointer-events-auto select-none hover:shadow-md hover:bg-white transition-shadow ' +
                  (isActive ? '-top-7 border-violet-200' : '-bottom-7 border-slate-100 opacity-60 hover:opacity-100')}
              >
                <Move size={9} className={isActive ? 'text-violet-600' : 'text-slate-400'} />
                <span className={'text-[9px] font-black uppercase tracking-[0.2em] ' + (isActive ? 'text-violet-600' : 'text-slate-500')}>{zone.label}</span>
                <span className="text-[8px] font-bold text-slate-400 normal-case">{techniqueLabel(zone.technique)}</span>
                {!!store.customZones[zoneKey(store.garment.type, store.currentView, zone.id)] && (
                  <button
                    type="button"
                    onPointerDown={(e) => { e.stopPropagation(); }}
                    onClick={(e) => {
                      e.stopPropagation();
                      store.resetCustomZone(zoneKey(store.garment.type, store.currentView, zone.id));
                    }}
                    title="Restablecer posicion original"
                    className="ml-1 -mr-1 p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <RotateCcw size={9} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <AnimatePresence>
          {!hasLayers && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl px-5 py-3 max-w-md pointer-events-auto">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Sparkles size={12} className="text-violet-600" />
                  <span className="text-[8.5px] font-black text-violet-600 uppercase tracking-[0.25em]">Tu lienzo</span>
                </div>
                <p className="text-[12px] font-bold text-slate-800 text-center leading-tight">
                  Comienza tu diseno en <span className="text-violet-600">{activeZone.label}</span>
                </p>
                <div className="flex justify-center gap-1 mt-2.5">
                  <button type="button" onClick={() => onOpenTool && onOpenTool('ai')}
                    className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition-colors">
                    <Sparkles size={13} /><span className="text-[8px] font-bold uppercase tracking-wider">IA</span>
                  </button>
                  <button type="button" onClick={() => onOpenTool && onOpenTool('upload')}
                    className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition-colors">
                    <Upload size={13} /><span className="text-[8px] font-bold uppercase tracking-wider">Subir</span>
                  </button>
                  <button type="button" onClick={() => onOpenTool && onOpenTool('text')}
                    className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition-colors">
                    <TypeIcon size={13} /><span className="text-[8px] font-bold uppercase tracking-wider">Texto</span>
                  </button>
                  <button type="button" onClick={() => onOpenTool && onOpenTool('art')}
                    className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition-colors">
                    <Shapes size={13} /><span className="text-[8px] font-bold uppercase tracking-wider">Arte</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={stageHostRef} style={printInset} className={'absolute z-10'}>
          <Stage
            width={stageSize.width} height={stageSize.height} ref={stageRef}
            onClick={(e) => { if (e.target === e.target.getStage()) handleSelect(null); }}
          >
            <KonvaLayer>
              {visibleLayers.map((layer) => {
                const isSelected = store.activeLayerId === layer.id;
                if (layer.type === 'text') {
                  return (
                    <TextLayer
                      key={layer.id} layer={layer} isSelected={isSelected}
                      onSelect={() => handleSelect(layer.id)}
                      onUpdate={(u) => store.updateLayer(store.currentView, layer.id, u)}
                      stageWidth={stageSize.width}
                      stageHeight={stageSize.height}
                    />
                  );
                }
                if (layer.type === 'image' || layer.type === 'ai') {
                  return (
                    <URLImage
                      key={layer.id} layer={layer} isSelected={isSelected}
                      onSelect={() => handleSelect(layer.id)}
                      onUpdate={(u) => store.updateLayer(store.currentView, layer.id, u)}
                      stageWidth={stageSize.width}
                      stageHeight={stageSize.height}
                    />
                  );
                }
                return null;
              })}
            </KonvaLayer>
          </Stage>
        </div>
      </div>

      <div className="absolute top-6 left-6 flex items-center gap-2.5 bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{VIEW_LABELS[store.currentView] || store.currentView}</span>
      </div>

      {store.activeLayerId && <ContextualToolbar />}

      <PrintQualityBadge />

      <div className="absolute top-6 right-6 hidden md:flex items-center gap-2 bg-white/90 backdrop-blur px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-3 h-3 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: store.selectedColor.hex }} />
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
          {GARMENT_LABELS[store.garment.type] || store.garment.type} - {store.selectedSize}
        </span>
      </div>
    </div>
  );
}

/* Suprimir warning de variable no usada */
void useStageBounds;
