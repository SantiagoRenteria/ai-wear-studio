import React, { useState, useRef, useMemo, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, Sparkles, Wand2, Shuffle, Loader2,
  RefreshCw, AlertCircle, Check, Trash2, Eraser, Palette, GitCompare,
} from 'lucide-react';
import { ToolType } from './LeftRail';
import { useStore } from '../store/useStore';
import { PlacementZone } from '../types';
import { generateDesignImages, GeneratedVariation, removeBackground, styleTransferImage } from '../services/gemini';
import { detectBackground, type BgDetection } from '../services/bgRemoval';
import { useRateLimit } from '../hooks/useRateLimit';
import { useAuthStore } from '../store/useAuthStore';
import { getCurrentSessionId } from '../services/persistence';
import { uploadAsset } from '../services/assetsApi';
import { TextTool } from './TextTool';
import { ArtTool } from './ArtTool';
import { ColorPicker } from './ColorPicker';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { RateLimitBadge } from './RateLimitBadge';
import { GARMENT_CATALOG, getSizeMeasurements, genderLabel, getPrimaryZone } from '../data/catalog';

interface EditorDrawerProps { activeTool: ToolType; onClose: () => void; }

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    return (await fetch(dataUrl)).blob();
  } catch {
    return null;
  }
}

function runBgRemovalWorker(
  dataUrl: string,
  tolerance?: number,
): Promise<{ cleaned: string; removedRatio: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;

      if (w === 0 || h === 0) {
        reject(new Error('imagen sin dimensiones válidas'));
        return;
      }

      const auxCanvas = document.createElement('canvas');
      auxCanvas.width = w;
      auxCanvas.height = h;
      const ctx2d = auxCanvas.getContext('2d');
      if (!ctx2d) {
        reject(new Error('no se pudo obtener contexto 2d'));
        return;
      }
      ctx2d.drawImage(img, 0, 0);
      const imageData = ctx2d.getImageData(0, 0, w, h);

      const worker = new Worker(
        new URL('../workers/bgRemoval.worker.ts', import.meta.url),
        { type: 'module' },
      );

      worker.onmessage = (e: MessageEvent<{ buffer?: ArrayBuffer; removedRatio?: number; error?: string }>) => {
        worker.terminate();
        if (e.data.error) {
          reject(new Error(e.data.error));
          return;
        }
        const { buffer, removedRatio } = e.data;
        if (!buffer || buffer.byteLength !== w * h * 4) {
          reject(new Error('buffer inválido recibido del worker'));
          return;
        }
        const outCanvas = document.createElement('canvas');
        outCanvas.width = w;
        outCanvas.height = h;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          reject(new Error('no se pudo obtener contexto 2d de salida'));
          return;
        }
        outCtx.putImageData(new ImageData(new Uint8ClampedArray(buffer), w, h), 0, 0);
        resolve({ cleaned: outCanvas.toDataURL('image/png'), removedRatio: removedRatio ?? 0 });
      };

      worker.onerror = (err) => { worker.terminate(); reject(err); };

      const buffer = imageData.data.buffer.slice(0);
      worker.postMessage({ buffer, width: w, height: h, tolerance }, [buffer]);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const PROMPT_SUGGESTIONS: { emoji: string; text: string }[] = [
  { emoji: '🐉', text: 'Dragon japones con flores de cerezo' },
  { emoji: '🌌', text: 'Astronauta surfeando una nebulosa purpura' },
  { emoji: '🦊', text: 'Zorro geometrico minimalista' },
  { emoji: '🌮', text: 'Tacos cyberpunk con luces neon' },
  { emoji: '🐆', text: 'Tigre acuarela con salpicaduras de tinta' },
  { emoji: '🎨', text: 'Logo coffee shop estilo retro 70s' },
  { emoji: '🌺', text: 'Mandala flores tropicales pastel' },
  { emoji: '🛸', text: 'OVNI vintage abduccion vacas, art deco' },
];

const STYLES: { id: string; label: string; emoji: string }[] = [
  { id: 'watercolor', label: 'Acuarela', emoji: '🎨' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🌃' },
  { id: 'retro', label: 'Retro', emoji: '📼' },
  { id: 'anime', label: 'Anime', emoji: '🍙' },
  { id: 'minimal', label: 'Minimal', emoji: '⚪' },
  { id: 'graffiti', label: 'Grafiti', emoji: '🖌️' },
  { id: '3d', label: '3D Render', emoji: '🧊' },
  { id: 'pixel', label: 'Pixel Art', emoji: '👾' },
];

const TOOL_TITLES: Record<string, string> = {
  product: 'Producto', ai: 'Disena con IA', upload: 'Subir Logo',
  text: 'Texto', art: 'Catalogo de Arte', names: 'Personalizar',
};

export function EditorDrawer({ activeTool, onClose }: EditorDrawerProps) {
  const store = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // HU-15.1 — Rate limit para llamadas IA.
  const { snapshot: rateLimit, consume: consumeAIQuota } = useRateLimit();

  // Bug-fix UX — el borrador del upload vive en el store para sobrevivir cambios de tool.
  const draft = store.uploadDraft;
  const setDraft = store.setUploadDraft;
  const tempImage = draft?.tempImage ?? null;
  const originalImage = draft?.originalImage ?? null;
  const cleanedImage = draft?.cleanedImage ?? null;
  const keepOriginal = draft?.keepOriginal ?? false;
  const tempScale = draft?.tempScale ?? 1;
  const tempRotation = draft?.tempRotation ?? 0;
  const editLayerId = draft?.editLayerId ?? null;
  const editView = draft?.editView ?? null;
  const isEditing = !!editLayerId && !!editView;
  // Lee siempre el draft actualizado para evitar closures stale en updates secuenciales.
  const patchDraft = (patch: Partial<NonNullable<typeof draft>>) => {
    const current = useStore.getState().uploadDraft ?? {
      originalImage: null, cleanedImage: null, tempImage: null,
      keepOriginal: false, tempScale: 1, tempRotation: 0,
    };
    setDraft({ ...current, ...patch });
  };
  const setTempImage = (v: string | null) => {
    patchDraft({ tempImage: v });
    if (isEditing && v) {
      useStore.getState().updateLayer(editView!, editLayerId!, { content: v });
    }
  };
  const setOriginalImage = (v: string | null) => patchDraft({ originalImage: v });
  const setCleanedImage = (v: string | null) => patchDraft({ cleanedImage: v });
  const setKeepOriginal = (v: boolean) => patchDraft({ keepOriginal: v });
  const setTempScale = (v: number) => {
    patchDraft({ tempScale: v });
    if (isEditing) {
      useStore.getState().updateLayer(editView!, editLayerId!, { scaleX: v, scaleY: v });
    }
  };
  const setTempRotation = (v: number) => {
    patchDraft({ tempRotation: v });
    if (isEditing) {
      useStore.getState().updateLayer(editView!, editLayerId!, { rotation: v });
    }
  };

  // HU-7.x — Max scale capeado al print zone (sliders no permiten pasarse).
  const [tempNatural, setTempNatural] = useState<{ w: number; h: number } | null>(null);
  React.useEffect(() => {
    if (!tempImage) { setTempNatural(null); return; }
    const img = new Image();
    img.onload = () => setTempNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = tempImage;
  }, [tempImage]);
  const tempMaxScale = React.useMemo(() => {
    const stage = useStore.getState().canvasStageSize;
    if (!tempNatural || stage.width <= 0 || stage.height <= 0) return 2;
    return Math.max(0.2, Math.min(stage.width / tempNatural.w, stage.height / tempNatural.h));
  }, [tempNatural]);

  const [bgRemoving, setBgRemoving] = useState(false);
  const [tintInstruction, setTintInstruction] = useState('');
  const [tinting, setTinting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [autoBgRunning, setAutoBgRunning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bgDetection, setBgDetection] = useState<BgDetection | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [suggestionsSeed, setSuggestionsSeed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'unisex'>('all');

  const filteredCatalog = useMemo(() => {
    if (genderFilter === 'all') return GARMENT_CATALOG;
    return GARMENT_CATALOG.filter(g => g.gender === genderFilter || g.gender === 'unisex');
  }, [genderFilter]);

  const visibleSuggestions = useMemo(() => {
    return [...PROMPT_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionsSeed]);

  const resetUpload = () => {
    setDraft(null);
    setBgDetection(null);
    setShowCompare(false);
    setUploadError(null);
  };

  // Lee un File como dataURL via Promise.
  const readAsDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Bug-fix UX: mide la imagen y calcula scale para que entre al ~70% del print zone.
  // Asi el logo no nace gigante y se sale de la zona visible.
  const measureFitScale = (dataUrl: string): Promise<number> => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const stage = useStore.getState().canvasStageSize;
      const stageW = stage.width || 220;
      const stageH = stage.height || 280;
      const target = 0.70;
      const sX = (stageW * target) / img.naturalWidth;
      const sY = (stageH * target) / img.naturalHeight;
      const scale = Math.min(sX, sY, 1);
      resolve(scale > 0 ? scale : 1);
    };
    img.onerror = () => resolve(1);
    img.src = dataUrl;
  });

  // HU-7.1 + multi-upload — Al subir, detectar fondo y limpiarlo automaticamente.
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setUploadError(null);

    // Caso single: flujo existente con preview, scale, rotacion.
    if (files.length === 1) {
      const dataUrl = await readAsDataURL(files[0]);
      setOriginalImage(dataUrl);
      setTempImage(dataUrl);
      const fitScale = await measureFitScale(dataUrl);
      setTempScale(fitScale); setTempRotation(0);
      setKeepOriginal(false);
      setCleanedImage(null);
      setShowCompare(false);
      try {
        setAutoBgRunning(true);
        const detection = await detectBackground(dataUrl);
        setBgDetection(detection);
        if (detection.confidence >= 0.55) {
          const result = await runBgRemovalWorker(dataUrl);
          setCleanedImage(result.cleaned);
          setTempImage(result.cleaned);
        }
      } catch (err) {
        console.warn('[bgRemoval] auto fallo, sigue manual:', err);
        setUploadError('No se pudo remover el fondo automáticamente. Puedes intentarlo manualmente.');
      } finally {
        setAutoBgRunning(false);
      }
      // Reset del input para permitir reseleccion del mismo archivo.
      if (e.target) e.target.value = '';
      return;
    }

    // Multi-upload: agregamos cada archivo directo como capa, con bg-removal.
    setAutoBgRunning(true);
    try {
      let added = 0;
      for (const file of files) {
        try {
          const dataUrl = await readAsDataURL(file);
          let finalUrl = dataUrl;
          try {
            const detection = await detectBackground(dataUrl);
            if (detection.confidence >= 0.55) {
              const result = await runBgRemovalWorker(dataUrl);
              finalUrl = result.cleaned;
            }
          } catch { /* swallow */ }
          // Stagger las posiciones para que no se apilen.
          const offset = added * 18;
          const fitScale = await measureFitScale(finalUrl);
          const primaryZone = getPrimaryZone(store.garment.type, store.currentView);
          store.addLayer(store.currentView, {
            type: 'image', content: finalUrl,
            x: 30 + offset, y: 30 + offset, scaleX: fitScale, scaleY: fitScale, rotation: 0,
            placementZone: primaryZone.id,
            name: file.name,
          });
          added++;
        } catch (err) {
          console.warn('[multi-upload] error con ' + file.name, err);
        }
      }
      setUploadError(added > 0 ? null : 'No se pudo procesar ningun archivo.');
    } finally {
      setAutoBgRunning(false);
      if (e.target) e.target.value = '';
    }
  };

  // HU-7.1 — Toggle entre original y limpio.
  const toggleKeepOriginal = (next: boolean) => {
    setKeepOriginal(next);
    if (next) {
      if (originalImage) setTempImage(originalImage);
    } else {
      if (cleanedImage) setTempImage(cleanedImage);
    }
  };

  const handleConfirmUpload = async () => {
    if (!tempImage) return;
    if (isEditing) {
      // En modo edit, los cambios ya se aplicaron en vivo. Solo limpiamos y cerramos draft.
      resetUpload();
      onClose();
      return;
    }

    let finalUrl = tempImage;
    const token = useAuthStore.getState().accessToken;
    const designId = getCurrentSessionId();

    if (token && designId) {
      setUploading(true);
      try {
        const blob = await dataUrlToBlob(tempImage);
        if (blob) finalUrl = await uploadAsset(designId, blob, token);
      } catch (err) {
        console.warn('[assets] upload fallido, usando data URL local:', err);
      } finally {
        setUploading(false);
      }
    }

    const primaryZone = getPrimaryZone(store.garment.type, store.currentView);
    store.addLayer(store.currentView, {
      type: 'image', content: finalUrl,
      x: 50, y: 50, scaleX: tempScale, scaleY: tempScale,
      rotation: tempRotation, placementZone: primaryZone.id,
    });
    resetUpload();
    // Bug-fix UX: dejamos el drawer abierto para que el usuario pueda subir mas
    // logos sin tener que reabrir el tool. El usuario cierra cuando lo decide.
  };

  // Fallback IA cuando la heuristica local no fue suficiente (fondos complejos).
  const handleRemoveBg = async () => {
    if (!tempImage || bgRemoving) return;
    // HU-15.1 — consume cuota antes de gastar tokens.
    const snap = await consumeAIQuota(1);
    if (snap.blocked) {
      setUploadError('Limite diario alcanzado. Compra una prenda para desbloquear generaciones ilimitadas.');
      return;
    }
    setBgRemoving(true); setUploadError(null);
    try {
      const source = originalImage ?? tempImage;
      const cleaned = await removeBackground(source);
      setCleanedImage(cleaned);
      setTempImage(cleaned);
      setKeepOriginal(false);
    } catch (e: any) {
      setUploadError(e?.message || 'Error quitando el fondo.');
    } finally { setBgRemoving(false); }
  };

  const handleTint = async () => {
    if (!tempImage || tinting || !tintInstruction.trim()) return;
    // HU-15.1 — consume cuota.
    const snap = await consumeAIQuota(1);
    if (snap.blocked) {
      setUploadError('Limite diario alcanzado.');
      return;
    }
    setTinting(true); setUploadError(null);
    try {
      const transformed = await styleTransferImage(tempImage, tintInstruction);
      setTempImage(transformed); setTintInstruction('');
    } catch (e: any) {
      setUploadError(e?.message || 'Error transformando.');
    } finally { setTinting(false); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    // HU-15.1 — consume cuota.
    const snap = await consumeAIQuota(1);
    if (snap.blocked) {
      setGenerationError('Limite diario alcanzado. Compra una prenda para desbloquear generaciones ilimitadas, o vuelve manana.');
      return;
    }
    setIsGenerating(true); setGenerationError(null);
    setAppliedId(null); setVariations([]);
    try {
      const results = await generateDesignImages(prompt, selectedStyle, 1,
        (v) => setVariations((prev) => [...prev, v]));
      if (results.length > 0) setVariations(results);
    } catch (err: any) {
      setGenerationError(err?.message || 'Error desconocido al generar.');
    } finally { setIsGenerating(false); }
  };

  const handleGenerateOneMore = async () => {
    if (!prompt.trim() || isGenerating) return;
    // HU-15.1 — consume cuota.
    const snap = await consumeAIQuota(1);
    if (snap.blocked) {
      setGenerationError('Limite diario alcanzado.');
      return;
    }
    setIsGenerating(true); setGenerationError(null);
    try {
      await generateDesignImages(prompt, selectedStyle, 1,
        (v) => setVariations((prev) => [...prev, v]));
    } catch (err: any) {
      setGenerationError(err?.message || 'Error generando otra.');
    } finally { setIsGenerating(false); }
  };

  const handleApplyVariation = async (v: GeneratedVariation) => {
    const fitScale = await measureFitScale(v.imageUrl);
    const primaryZone = getPrimaryZone(store.garment.type, store.currentView);
    store.addLayer(store.currentView, {
      type: 'ai', content: v.imageUrl,
      x: 50, y: 50, scaleX: fitScale, scaleY: fitScale, rotation: 0,
      placementZone: primaryZone.id,
      name: 'Diseno IA',
    });
    setAppliedId(v.id);
    // Bug-fix UX: ya no auto-cerramos. El usuario decide cuando cerrar.
  };

  const handleClearVariations = () => {
    setVariations([]); setGenerationError(null); setAppliedId(null);
  };

  const renderProduct = () => (
    <div className="space-y-5">
      <section>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Genero</label>
        <div className="grid grid-cols-4 gap-1.5">
          {(['all', 'male', 'female', 'unisex'] as const).map((g) => {
            const active = genderFilter === g;
            const label = g === 'all' ? 'Todos' : genderLabel(g);
            return (
              <button key={g} onClick={() => setGenderFilter(g)}
                className={'h-8 rounded-lg text-[10px] font-bold border ' +
                  (active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Producto ({filteredCatalog.length})</label>
        <div className="grid grid-cols-2 gap-2">
          {filteredCatalog.map((g) => {
            const active = store.garment.id === g.id;
            return (
              <button key={g.id} onClick={() => store.setGarment(g)}
                className={'group relative flex flex-col items-start gap-1 p-2.5 rounded-xl border-2 text-left ' +
                  (active ? 'border-violet-500 bg-violet-50/40 ring-1 ring-violet-200' : 'border-slate-200 bg-white hover:border-slate-300')}>
                <div className="flex items-center gap-1 w-full">
                  <span className="text-lg leading-none">{g.emoji}</span>
                  <span className={'text-[10.5px] font-black uppercase tracking-tight truncate flex-1 ' + (active ? 'text-violet-700' : 'text-slate-800')}>{g.name}</span>
                </div>
                <p className="text-[9px] text-slate-500 line-clamp-1">${g.basePrice} - {genderLabel(g.gender)}</p>
                {active && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center"><Check size={9} className="text-white" /></span>}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center justify-between">
          <span>Color</span>
          <span className="text-slate-300 normal-case tracking-normal font-bold">{store.selectedColor.name}{store.selectedColor.premium ? ' - Premium' : ''}</span>
        </label>
        <ColorPicker
          value={store.selectedColor.hex}
          favorites={store.garment.availableColors.map(c => c.hex)}
          onChange={(hex) => {
            const match = store.garment.availableColors.find(c => c.hex.toLowerCase() === hex.toLowerCase());
            if (match) store.setColor(match);
            else store.setColor({ name: hex, hex, premium: false });
          }}
        />
      </section>

      <section>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center justify-between">
          <span>Talla</span>
          <span className="text-slate-300 normal-case tracking-normal font-bold">{getSizeMeasurements(store.selectedSize, store.garment.type)}</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {store.garment.availableSizes.map((size) => (
            <button key={size} onClick={() => store.setSize(size)}
              className={'h-9 rounded-lg text-[11px] font-bold border ' +
                (store.selectedSize === size ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
              {size}
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-4">
      {!tempImage ? (
        <div onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-square border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 bg-slate-50 hover:border-violet-300 cursor-pointer group">
          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
            <Upload size={28} />
          </div>
          <div className="text-center px-6">
            <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Arrastra o haz clic</p>
            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">PNG, JPG o SVG · Multi-archivo soportado</p>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center p-6 border border-slate-200 shadow-inner bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]">
            {showCompare && originalImage && cleanedImage ? (
              <BeforeAfterSlider
                beforeSrc={originalImage}
                afterSrc={cleanedImage}
                className="absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)]"
              />
            ) : (
              <motion.img src={tempImage} style={{ scale: tempScale, rotate: tempRotation }} className="max-w-full max-h-full object-contain drop-shadow-2xl" alt="Preview" />
            )}
            <button onClick={resetUpload} className="absolute top-3 right-3 p-2 bg-white/90 rounded-xl shadow-sm text-slate-400 hover:text-red-500"><X size={16} /></button>
            {(bgRemoving || tinting || autoBgRunning) && (
              <div className="absolute inset-0 bg-violet-500/20 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white px-3 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <Loader2 size={14} className="animate-spin text-violet-600" />
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    {autoBgRunning ? 'Limpiando fondo...' : bgRemoving ? 'Quitando fondo (IA)...' : 'Transformando...'}
                  </span>
                </div>
              </div>
            )}
            {cleanedImage && !autoBgRunning && !bgRemoving && (
              <button
                onClick={() => setShowCompare((v) => !v)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 rounded-lg shadow-sm text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                title="Comparar antes y despues"
              >
                <GitCompare size={12} />
                {showCompare ? 'Cerrar' : 'Comparar'}
              </button>
            )}
          </div>

          {/* HU-7.1 — Banner de fondo limpiado con toggle. */}
          {cleanedImage && bgDetection && !autoBgRunning && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-2 min-w-0">
                <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Fondo limpiado automaticamente
                  </p>
                  <p className="text-[9.5px] text-slate-500 mt-0.5 leading-snug">
                    Confianza {Math.round(bgDetection.confidence * 100)}%. Si no te convence, conserva el original.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={keepOriginal}
                  onChange={(e) => toggleKeepOriginal(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                  Conservar original
                </span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleRemoveBg} disabled={bgRemoving || tinting || autoBgRunning}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-widest hover:bg-violet-100 disabled:opacity-50"
              title={cleanedImage ? 'Repetir con IA si la limpieza automatica no fue suficiente' : 'Limpiar fondo con IA (mejor para imagenes complejas)'}>
              <Eraser size={12} />{cleanedImage ? 'Refinar con IA' : 'Quitar fondo (IA)'}
            </button>
            <button onClick={() => setTintInstruction('cambiar a colores pastel')} disabled={bgRemoving || tinting}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:border-violet-300 disabled:opacity-50">
              <Palette size={12} />Cambiar color
            </button>
          </div>

          {tintInstruction && (
            <div className="space-y-2">
              <input value={tintInstruction} onChange={(e) => setTintInstruction(e.target.value)}
                placeholder="Ej: hacelo blanco y negro"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-violet-500 outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setTintInstruction('')} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">Cancelar</button>
                <button onClick={handleTint} disabled={!tintInstruction.trim() || tinting}
                  className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
                  Transformar
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-700 leading-snug">{uploadError}</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <span>Escala</span><span className="text-violet-600">{(tempScale * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0.05" max={tempMaxScale.toFixed(3)} step="0.01" value={Math.min(tempScale, tempMaxScale)} onChange={(e) => setTempScale(parseFloat(e.target.value))} className="w-full accent-violet-600 h-1 bg-slate-100 rounded-lg cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <span>Rotacion</span><span className="text-violet-600">{tempRotation}deg</span>
              </div>
              <input type="range" min="-180" max="180" step="1" value={tempRotation} onChange={(e) => setTempRotation(parseInt(e.target.value))} className="w-full accent-violet-600 h-1 bg-slate-100 rounded-lg cursor-pointer" />
            </div>
          </div>

          <button onClick={handleConfirmUpload} disabled={uploading}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-60">
            {uploading
              ? <><Loader2 size={16} className="animate-spin" />Subiendo...</>
              : <><Upload size={16} />{isEditing ? 'Cerrar edicion' : 'Anadir al Diseno'}</>}
          </button>
        </div>
      )}
    </div>
  );

  const renderAI = () => (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-3">
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-md">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-slate-900 leading-tight">Disena con IA</p>
            <p className="text-[9.5px] text-slate-500 mt-0.5">1 variacion por click. Free tier limitado.</p>
          </div>
          <RateLimitBadge snapshot={rateLimit} compact />
        </div>
      </div>

      {rateLimit?.blocked && (
        <RateLimitBadge snapshot={rateLimit} />
      )}

      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-between">
          <span>Tu prompt</span>
          <span className="text-slate-300 font-bold normal-case tracking-normal">{prompt.length} / 200</span>
        </label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value.slice(0, 200))} rows={2}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none"
          placeholder="Ej: Astronauta vintage..." />
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inspiracion</label>
          <button onClick={() => setSuggestionsSeed(s => s + 1)} className="flex items-center gap-1 text-[9px] font-black text-violet-600 uppercase tracking-widest"><Shuffle size={11} />Otra</button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {visibleSuggestions.map(s => (
            <button key={s.text} onClick={() => setPrompt(s.text)}
              className="group flex flex-col items-start gap-1 px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-left hover:border-violet-300 min-h-[52px]">
              <span className="text-sm leading-none">{s.emoji}</span>
              <span className="text-[10px] font-medium text-slate-700 line-clamp-2">{s.text}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Estilo visual</label>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map(s => {
            const active = selectedStyle === s.id;
            return (
              <button key={s.id} onClick={() => setSelectedStyle(active ? null : s.id)}
                className={'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ' +
                  (active ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300')}>
                <span className="text-[11px]">{s.emoji}</span>{s.label}
              </button>
            );
          })}
        </div>
      </section>

      <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
        {isGenerating
          ? (<><Loader2 size={16} className="animate-spin" /> Generando...</>)
          : variations.length > 0
            ? (<><RefreshCw size={16} /> Empezar de nuevo</>)
            : (<><Wand2 size={16} /> Generar diseno con IA</>)}
      </button>

      {variations.length > 0 && !isGenerating && (
        <button onClick={handleGenerateOneMore}
          className="w-full py-2.5 border-2 border-violet-300 text-violet-700 hover:bg-violet-50 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <Sparkles size={14} />Generar otra mas (+1)
        </button>
      )}

      {generationError && !isGenerating && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700">{generationError}</p>
        </div>
      )}

      {(isGenerating || variations.length > 0) && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Sparkles size={11} className="text-violet-600" />Tus variaciones
            </label>
            {variations.length > 0 && !isGenerating && (
              <button onClick={handleClearVariations} className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500"><Trash2 size={10} />Descartar</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {variations.map(v => {
              const isApplied = appliedId === v.id;
              return (
                <button key={v.id} onClick={() => handleApplyVariation(v)}
                  className={'group relative aspect-square overflow-hidden rounded-xl border-2 ' + (isApplied ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-violet-500 hover:shadow-lg')}>
                  <img src={v.imageUrl} alt={v.prompt} className="w-full h-full object-cover bg-white" loading="lazy" />
                  <div className={'absolute inset-0 bg-gradient-to-t from-violet-900/80 via-violet-900/20 to-transparent flex items-end justify-center pb-2 ' + (isApplied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                    {isApplied
                      ? <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full"><Check size={11} />Aplicado</span>
                      : <span className="px-2.5 py-1 bg-white text-violet-700 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">Aplicar</span>}
                  </div>
                </button>
              );
            })}
            {isGenerating && (
              <div className="aspect-square rounded-xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 animate-pulse flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-violet-400" />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );

  // Placeholder para tools sin implementacion completa.
  const renderComingSoon = (label: string, desc: string) => (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
        <Sparkles size={22} className="text-violet-600" />
      </div>
      <span className="text-[10px] font-black text-violet-600 uppercase tracking-[0.25em]">Proximamente</span>
      <p className="text-sm font-bold text-slate-800">{label}</p>
      <p className="text-[11px] text-slate-500 leading-snug max-w-[260px]">{desc}</p>
    </div>
  );

  const renderContent = () => {
    switch (activeTool) {
      case 'product': return renderProduct();
      case 'ai': return renderAI();
      case 'text': return <TextTool onClose={onClose} />;
      case 'art': return <ArtTool onClose={onClose} />;
      case 'upload': return renderUpload();
      case 'names': return renderComingSoon(
        'Personalizar con nombres y numeros',
        'Anadi nombres, numeros de equipo y dorsales con plantillas. Estamos puliendo la UI; mientras tanto puedes usar el tool de Texto.',
      );
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {activeTool && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute left-0 top-0 bottom-0 w-[350px] lg:w-[380px] xl:w-[420px] bg-white border-r border-slate-200 shadow-2xl z-40 flex flex-col"
        >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">{(activeTool && TOOL_TITLES[activeTool]) || activeTool}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">{renderContent()}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
