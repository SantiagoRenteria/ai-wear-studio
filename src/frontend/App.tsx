import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LeftRail, ToolType } from './components/LeftRail';
import { EditorDrawer } from './components/EditorDrawer';
import { CanvasEngine } from './components/CanvasEngine';
import { RightPanel } from './components/RightPanel';
import { BottomBar } from './components/BottomBar';
import { CheckoutPage } from './components/CheckoutPage';
import { ShareModal } from './components/ShareModal';
import { ResumeBanner } from './components/ResumeBanner';
import { SaveIndicator } from './components/SaveIndicator';
import { ReferralModal } from './components/ReferralModal';
import { GarmentSelector } from './components/GarmentSelector';
import {
  ShoppingBag, User, HelpCircle, Undo2, Redo2, Sparkles, Upload as UploadIcon,
  Share2, Download, Gift, ArrowLeft,
} from 'lucide-react';
import { useStore } from './store/useStore';
import { Garment, ColorOption, PlacementZone } from './types';
import { useAutosave } from './hooks/useAutosave';
import { findResumableSession, type PersistedSession } from './services/persistence';
import { captureReferrerFromUrl, getOrCreateMyCode } from './services/referrals';
import { exportPreviewPng } from './services/exporter';

export default function App() {
  const [appPhase, setAppPhase] = useState<'selection' | 'design'>('selection');
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  // HU-12.4 — Banner de retomar / autosave.
  const [showResume, setShowResume] = useState<boolean | null>(null);
  const dragCounter = useRef(0);

  // Acceso token: guest vacío para prototipo local; en producción viene del store de sesión.
  const accessToken = useStore((s) => s.user?.id ?? '');

  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.history.length > 0);
  const canRedo = useStore((s) => s.redoStack.length > 0);
  const activeLayerId = useStore((s) => s.activeLayerId);
  const removeLayer = useStore((s) => s.removeLayer);
  const currentView = useStore((s) => s.currentView);
  const addLayer = useStore((s) => s.addLayer);
  const hydrate = useStore((s) => s.hydrate);
  const duplicateLayer = useStore((s) => s.duplicateLayer);
  const updateLayer = useStore((s) => s.updateLayer);
  const setActiveLayer = useStore((s) => s.setActiveLayer);
  const setGarment = useStore((s) => s.setGarment);
  const setColor = useStore((s) => s.setColor);
  const setSize = useStore((s) => s.setSize);
  const setQuantity = useStore((s) => s.setQuantity);

  function handleGarmentConfirmed(garment: Garment, color: ColorOption, size: string, quantity: number) {
    setGarment(garment);
    setColor(color);
    setSize(size);
    setQuantity(quantity);
    setAppPhase('design');
    setShowResume(false);
  }

  // HU-12.4 — Autosave: pausamos hasta resolver el banner de retomar.
  const { status, lastSavedAt, adoptSession, startNewSession } = useAutosave({
    paused: showResume === null || showResume === true,
  });

  // HU-9.6 — captura ?ref=CODE de la URL al montar y asegura que tenemos codigo propio.
  useEffect(() => {
    captureReferrerFromUrl();
    getOrCreateMyCode();
    // Limpiamos el ?ref de la URL para que no quede pegado.
    if (typeof window !== 'undefined' && window.location.search.includes('ref=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    }
  }, []);

  // Bug-fix: reseteamos el overlay si el drag se cancela (Esc, salir de la ventana, drop fuera).
  useEffect(() => {
    const reset = () => {
      dragCounter.current = 0;
      setIsDraggingFile(false);
    };
    window.addEventListener('dragend', reset);
    window.addEventListener('drop', reset);
    document.addEventListener('mouseleave', reset);
    return () => {
      window.removeEventListener('dragend', reset);
      window.removeEventListener('drop', reset);
      document.removeEventListener('mouseleave', reset);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target?.tagName) ||
        target?.isContentEditable;
      const meta = e.metaKey || e.ctrlKey;
      const z = e.key === 'z' || e.key === 'Z';
      const d = e.key === 'd' || e.key === 'D';

      // Undo / Redo
      if (meta && z && e.shiftKey && !isTyping) { e.preventDefault(); redo(); return; }
      if (meta && z && !isTyping) { e.preventDefault(); undo(); return; }

      // HU-2.5 — Cmd/Ctrl+D duplicar capa.
      if (meta && d && activeLayerId && !isTyping) {
        e.preventDefault();
        duplicateLayer(currentView, activeLayerId);
        return;
      }

      // Delete / Backspace eliminar capa.
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeLayerId && !isTyping) {
        e.preventDefault();
        removeLayer(currentView, activeLayerId);
        return;
      }

      // Esc deselecciona.
      if (e.key === 'Escape' && activeLayerId && !isTyping) {
        e.preventDefault();
        setActiveLayer(null);
        return;
      }

      // HU-2.5 — Flechas mueven capa (Shift = 10px, normal = 1px).
      if (!isTyping && activeLayerId &&
          (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
           e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const step = e.shiftKey ? 10 : 1;
        const layer = useStore.getState().layers[currentView].find((l) => l.id === activeLayerId);
        if (!layer) return;
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        updateLayer(currentView, activeLayerId, { x: layer.x + dx, y: layer.y + dy });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo, activeLayerId, removeLayer, currentView, duplicateLayer, updateLayer, setActiveLayer]);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#design=(.+)$/);
    if (match) {
      // El hash tiene prioridad sobre el autosave: si llega un link compartido, lo cargamos.
      try {
        const decoded = decodeURIComponent(escape(atob(match[1])));
        const payload = JSON.parse(decoded);
        // Bug-fix: hidratamos atomicamente en lugar de N addLayer + setTimeout.
        const currentState = useStore.getState();
        const garment = payload.garment || currentState.garment;
        const selectedColor = payload.color || currentState.selectedColor;
        const selectedSize = payload.size || currentState.selectedSize;
        const layers = payload.layers || { front: [], back: [], left_sleeve: [], right_sleeve: [] };
        // Asegurar zIndex consistente (los links viejos pueden venir sin zIndex).
        (['front', 'back', 'left_sleeve', 'right_sleeve'] as const).forEach((v) => {
          (layers[v] || []).forEach((l: any, i: number) => {
            if (typeof l.zIndex !== 'number') l.zIndex = i;
            if (!l.id) l.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : 'layer_' + Date.now() + '_' + i;
          });
        });
        hydrate({
          garment,
          selectedColor,
          selectedSize,
          currentView: currentState.currentView,
          layers,
        });
        history.replaceState(null, '', window.location.pathname);
      } catch (e) {
        console.error('Error cargando diseño desde URL:', e);
      }
      // No mostramos el banner de retomar cuando se llega via link compartido.
      setShowResume(false);
      return;
    }

    // HU-12.4 — Sin link compartido: revisamos si hay sesion en progreso para retomar.
    const resumable = findResumableSession();
    setShowResume(!!resumable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResume = (session: PersistedSession) => {
    hydrate({
      garment: session.garment,
      selectedColor: session.selectedColor,
      selectedSize: session.selectedSize,
      currentView: session.currentView,
      layers: session.layers,
    });
    adoptSession(session.id);
    setShowResume(false);
  };

  const handleDismissResume = () => {
    startNewSession();
    setShowResume(false);
  };

  // Helper: solo tracking si el drag trae archivos reales.
  const dragHasFiles = (e: React.DragEvent) =>
    e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragHasFiles(e)) return;
    dragCounter.current += 1;
    setIsDraggingFile(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragHasFiles(e)) return;
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDraggingFile(false);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        // Bug-fix UX: medir la imagen y nacer al ~70% del stage para que entre.
        const probe = new Image();
        probe.onload = () => {
          const stage = useStore.getState().canvasStageSize;
          const sW = stage.width || 220;
          const sH = stage.height || 280;
          const target = 0.70;
          const fit = Math.min((sW * target) / probe.naturalWidth, (sH * target) / probe.naturalHeight, 1);
          addLayer(currentView, {
            type: 'image', content: dataUrl,
            x: 50, y: 50, scaleX: fit, scaleY: fit, rotation: 0,
            placementZone: PlacementZone.CenterChest,
            name: file.name,
          });
        };
        probe.onerror = () => {
          addLayer(currentView, {
            type: 'image', content: dataUrl,
            x: 50, y: 50, scaleX: 0.6, scaleY: 0.6, rotation: 0,
            placementZone: PlacementZone.CenterChest,
            name: file.name,
          });
        };
        probe.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const [exporting, setExporting] = useState(false);
  const handleExportPng = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const dataUrl = await exportPreviewPng();
      if (!dataUrl) return;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'aiwear-design-' + Date.now() + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } finally {
      setExporting(false);
    }
  };

  if (appPhase === 'selection') {
    return (
      <GarmentSelector
        accessToken={accessToken}
        onConfirm={handleGarmentConfirmed}
      />
    );
  }

  return (
    <div
      className="h-screen w-full bg-white flex flex-col overflow-hidden font-sans select-none relative"
      onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
      onDragOver={handleDragOver} onDrop={handleDrop}
    >
      <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-md shadow-violet-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.25em] text-slate-800">
              AI Wear <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Studio</span>
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <button
            onClick={() => setAppPhase('selection')}
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition-colors"
            title="Cambiar prenda"
          >
            <ArrowLeft size={13} />
            Cambiar prenda
          </button>
          <div className="h-6 w-px bg-slate-200 hidden md:block" />
          <SaveIndicator status={status} lastSavedAt={lastSavedAt} />
        </div>

        <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <button onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <Redo2 size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExportPng} disabled={exporting} title="Descargar PNG"
            className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={18} className={exporting ? 'animate-pulse' : ''} />
          </button>
          <button onClick={() => setShowReferral(true)} title="Referir y ganar credito"
            className="p-2.5 text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-xl transition-all">
            <Gift size={18} />
          </button>
          <button onClick={() => setShowShare(true)} title="Compartir"
            className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all">
            <Share2 size={18} />
          </button>
          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
            <HelpCircle size={18} />
          </button>
          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all relative">
            <ShoppingBag size={18} />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-violet-600 rounded-full text-[8px] font-black text-white flex items-center justify-center ring-2 ring-white">0</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center ml-1 cursor-pointer hover:bg-slate-200 transition-all">
            <User size={14} className="text-slate-500" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <LeftRail activeTool={activeTool} setActiveTool={setActiveTool} />
        <div className="flex-1 flex relative">
          <EditorDrawer activeTool={activeTool} onClose={() => setActiveTool(null)} />
          <CanvasEngine onOpenTool={setActiveTool} />
          <RightPanel onOpenTool={setActiveTool} />
        </div>
      </main>

      <BottomBar onCheckout={() => setShowCheckout(true)} />

      {showCheckout && <CheckoutPage onClose={() => setShowCheckout(false)} />}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
      {showReferral && <ReferralModal onClose={() => setShowReferral(false)} />}
      {showResume === true && (
        <ResumeBanner onResume={handleResume} onDismiss={handleDismissResume} />
      )}

      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-[100] bg-violet-600/15 backdrop-blur-sm pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 8 }} animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl border-4 border-dashed border-violet-500 px-12 py-10 shadow-2xl flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/30">
                <UploadIcon size={28} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-base font-black text-slate-900 uppercase tracking-widest">Suelta tu imagen</p>
                <p className="text-xs text-slate-500 mt-1.5">Se anadira como capa en la vista actual</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}
