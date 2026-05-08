import React, { useState, useMemo } from 'react';
import { Save, ChevronRight, Info, FolderOpen, Check, AlertOctagon, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ViewType } from '../types';
import { usePrintQuality } from '../hooks/usePrintQuality';

const PRINT_PER_ZONE_USD = 4;
const COLOR_PREMIUM_USD = 2;
const PREMIUM_COLORS = ['Olive', 'Pink', 'Sand', 'Stone'];
const USD_TO_COP = 4100;
const STORAGE_KEY = 'aiwear:savedDesigns';

type Currency = 'USD' | 'COP';

interface SavedDesign {
  id: string;
  createdAt: number;
  name: string;
  thumbnail?: string;
  state: any;
}

function loadSavedDesigns(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDesigns(designs: SavedDesign[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  } catch (e) {
    console.error('Error saving designs:', e);
  }
}

interface BottomBarProps {
  onCheckout?: () => void;
}

export function BottomBar({ onCheckout }: BottomBarProps = {}) {
  const store = useStore();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>(loadSavedDesigns);
  const [savedToast, setSavedToast] = useState(false);
  // HU-7.4 — Bloqueo de pago con override.
  const quality = usePrintQuality();
  const [showRiskConfirm, setShowRiskConfirm] = useState(false);
  const [riskAck, setRiskAck] = useState(false);

  const usedZones = useMemo(() => {
    const views: ViewType[] = ['front', 'back', 'left_sleeve', 'right_sleeve'];
    return views.filter((v) => store.layers[v].some((l) => !l.hidden)).length;
  }, [store.layers]);

  const totalLayers = useMemo(
    () => Object.values(store.layers).flat().filter((l) => !l.hidden).length,
    [store.layers]
  );

  const isColorPremium = PREMIUM_COLORS.includes(store.selectedColor.name);
  const printingFee = usedZones * PRINT_PER_ZONE_USD;
  const colorPremium = isColorPremium ? COLOR_PREMIUM_USD : 0;
  const subtotalUSD = store.garment.basePrice + printingFee + colorPremium;
  const display = (usd: number) =>
    currency === 'USD'
      ? '$' + usd.toFixed(2)
      : '$' + Math.round(usd * USD_TO_COP).toLocaleString('es-CO');

  const handleSave = () => {
    const id = 'design_' + Date.now();
    const name = 'Diseño ' + new Date().toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const newDesign: SavedDesign = {
      id,
      createdAt: Date.now(),
      name,
      state: {
        garment: store.garment,
        selectedColor: store.selectedColor,
        selectedSize: store.selectedSize,
        layers: store.layers,
      },
    };
    const updated = [newDesign, ...savedDesigns].slice(0, 20);
    setSavedDesigns(updated);
    saveDesigns(updated);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const handleLoad = (d: SavedDesign) => {
    // Bug-fix: usabamos removeLayer-en-loop + setTimeout addLayer, eso creaba
    // ~N entradas en el historial y un flicker visible. Ahora hidratamos
    // atomicamente con store.hydrate() — el undo posterior al load no vuelve
    // al estado pre-carga (intencional).
    if (!d.state) return;
    const layers = d.state.layers || { front: [], back: [], left_sleeve: [], right_sleeve: [] };
    const garment = d.state.garment || store.garment;
    const selectedColor = d.state.selectedColor || store.selectedColor;
    const selectedSize = d.state.selectedSize || store.selectedSize;
    store.hydrate({
      garment,
      selectedColor,
      selectedSize,
      currentView: store.currentView,
      layers,
    });
    setShowSaved(false);
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedDesigns.filter((d) => d.id !== id);
    setSavedDesigns(updated);
    saveDesigns(updated);
  };

  // HU-7.4 — bloqueo de "Pagar" cuando hay errores criticos.
  const hasCriticalIssues = quality.errorCount > 0;
  const payBlocked = hasCriticalIssues && !riskAck;
  const handlePayClick = () => {
    if (payBlocked) {
      setShowRiskConfirm(true);
    } else if (onCheckout) {
      onCheckout();
    }
  };

  return (
    <div className="h-14 bg-white border-t border-slate-200 px-6 flex items-center justify-between z-50 shrink-0 relative">
      <div className="flex items-center gap-4 min-w-0">
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0"
            style={{ backgroundColor: store.selectedColor.hex }}
          />
          <span className="text-[12px] font-bold text-slate-800 truncate">
            {store.garment.name}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            · {store.selectedSize}
          </span>
        </div>

        <div className="h-7 w-px bg-slate-100 hidden md:block" />

        <button
          onMouseEnter={() => setShowBreakdown(true)}
          onMouseLeave={() => setShowBreakdown(false)}
          onFocus={() => setShowBreakdown(true)}
          onBlur={() => setShowBreakdown(false)}
          className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
        >
          <span className="text-slate-500">
            {usedZones} {usedZones === 1 ? 'zona' : 'zonas'}
            <span className="text-slate-400 normal-case ml-1">
              ({totalLayers} {totalLayers === 1 ? 'capa' : 'capas'})
            </span>
          </span>
          <Info size={11} className="text-slate-400" />

          {showBreakdown && (
            <div className="absolute bottom-full left-0 mb-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-2xl px-3 py-2.5 min-w-[200px] space-y-1 z-50 normal-case tracking-normal text-left font-medium">
              <div className="flex justify-between gap-4">
                <span className="text-slate-300">Prenda base</span>
                <span className="font-mono">{display(store.garment.basePrice)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-300">
                  Impresión ({usedZones} {usedZones === 1 ? 'zona' : 'zonas'})
                </span>
                <span className="font-mono">{display(printingFee)}</span>
              </div>
              {isColorPremium && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-300">Color premium</span>
                  <span className="font-mono">{display(colorPremium)}</span>
                </div>
              )}
              <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between gap-4 font-black uppercase">
                <span>Total</span>
                <span className="font-mono">{display(subtotalUSD)}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 italic">
                Envío calculado en checkout
              </p>
              <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-slate-900 rotate-45" />
            </div>
          )}
        </button>

        <div className="hidden lg:flex items-center gap-1 bg-slate-100 rounded-full p-0.5">
          {(['USD', 'COP'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={
                'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ' +
                (currency === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowSaved((s) => !s)}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-lg transition-all group"
          >
            <FolderOpen size={14} className="transition-transform group-hover:scale-110" />
            <span>Mis diseños</span>
            {savedDesigns.length > 0 && (
              <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full text-[9px]">
                {savedDesigns.length}
              </span>
            )}
          </button>

          {showSaved && (
            <div
              className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl w-72 max-h-80 overflow-hidden flex flex-col z-50"
              onMouseLeave={() => setShowSaved(false)}
            >
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                  Mis diseños
                </h4>
                <span className="text-[9px] font-bold text-slate-400">
                  {savedDesigns.length} / 20
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {savedDesigns.length === 0 ? (
                  <div className="py-8 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Aún no has guardado diseños
                  </div>
                ) : (
                  savedDesigns.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleLoad(d)}
                      className="group w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-md shrink-0 border border-slate-200"
                        style={{ backgroundColor: d.state?.selectedColor?.hex || '#FFF' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate">
                          {d.name}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {new Date(d.createdAt).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSaved(d.id, e)}
                        className="text-slate-300 hover:text-red-500 transition-colors text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100"
                      >
                        Borrar
                      </button>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          className="relative flex items-center gap-1.5 px-3 py-2 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-lg transition-all group"
        >
          <Save size={14} className="transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Guardar</span>
          {savedToast && (
            <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-1 shadow-lg">
              <Check size={10} />
              Guardado
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={handlePayClick}
            className={
              'flex items-center gap-3 text-white px-5 h-10 rounded-xl shadow-md transition-all group ' +
              (payBlocked
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-rose-500/25'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-violet-500/20')
            }
            aria-label={payBlocked ? 'Revisar calidad antes de pagar' : 'Pagar'}
          >
            {payBlocked && <AlertOctagon size={14} />}
            <span className="text-[11px] font-black uppercase tracking-widest">
              {payBlocked ? 'Revisar y pagar' : 'Pagar ' + display(subtotalUSD)}
            </span>
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          {showRiskConfirm && (
            <div
              className="absolute bottom-full right-0 mb-3 w-[320px] bg-white border border-rose-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
              role="dialog"
              aria-label="Confirmar pago con problemas de calidad"
            >
              <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex items-start gap-2.5">
                <AlertOctagon size={16} className="text-rose-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-rose-700">
                    {quality.errorCount} {quality.errorCount === 1 ? 'problema critico' : 'problemas criticos'}
                  </h4>
                  <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                    Tu diseno tiene problemas que probablemente afecten la calidad de impresion. Te recomendamos corregirlos antes de pagar.
                  </p>
                </div>
                <button
                  onClick={() => setShowRiskConfirm(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-all"
                  aria-label="Cerrar"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer text-left group">
                  <input
                    type="checkbox"
                    checked={riskAck}
                    onChange={(e) => setRiskAck(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-[11px] text-slate-700 leading-snug group-hover:text-slate-900">
                    Entiendo el riesgo y quiero continuar de todas formas. No habra reembolsos por estos problemas.
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRiskConfirm(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 transition-all"
                  >
                    Volver al diseno
                  </button>
                  <button
                    disabled={!riskAck}
                    onClick={() => {
                      setShowRiskConfirm(false);
                      if (onCheckout) onCheckout();
                    }}
                    className="flex-[1.2] px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuar al pago
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
