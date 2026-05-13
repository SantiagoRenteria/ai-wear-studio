import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ChevronRight, Minus, Plus, Loader2, AlertCircle, Ruler } from 'lucide-react';
import {
  fetchGarments,
  fetchZones,
  getSizesForCategory,
  CatalogGarmentDto,
  CatalogColorDto,
  CatalogViewDto,
  CatalogPrintZoneDto,
} from '../services/catalogApi';
import { Garment, ColorOption } from '../types';

interface Props {
  accessToken: string;
  onConfirm: (garment: Garment, color: ColorOption, size: string, quantity: number) => void;
}

function mapToGarment(dto: CatalogGarmentDto): Garment {
  return {
    id: dto.id,
    name: dto.name,
    type: 't-shirt',
    gender: 'unisex',
    basePrice: 0,
    availableSizes: getSizesForCategory(dto.category),
    availableColors: dto.colors.map((c) => ({ name: c.colorName, hex: c.hexCode })),
    description: dto.category,
  };
}

function mapToColor(dto: CatalogColorDto): ColorOption {
  return { name: dto.colorName, hex: dto.hexCode };
}

// ─── Zone summary shown for a selected view ───────────────────────────────────

function ZoneSummary({
  garmentId,
  view,
  token,
}: {
  garmentId: string;
  view: CatalogViewDto;
  token: string;
}) {
  const { data: zones, isLoading, isError } = useQuery<CatalogPrintZoneDto[]>({
    queryKey: ['zones', garmentId, view.id],
    queryFn: () => fetchZones(garmentId, view.id, token),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading)
    return <p className="text-xs text-slate-400 mt-1">Cargando zonas…</p>;
  if (isError || !zones)
    return <p className="text-xs text-rose-500 mt-1">No se pudieron cargar las zonas.</p>;

  return (
    <ul className="mt-1.5 space-y-1">
      {zones.map((z) => (
        <li key={z.id} className="flex items-center gap-2 text-xs text-slate-600">
          <Ruler size={10} className="text-violet-400 shrink-0" />
          <span className="font-medium">{z.name}</span>
          <span className="text-slate-400">
            {z.widthCm}×{z.heightCm} cm
          </span>
          {z.recommendedTechnique && (
            <span className="ml-auto bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              {z.recommendedTechnique}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── Main GarmentSelector ─────────────────────────────────────────────────────

export function GarmentSelector({ accessToken, onConfirm }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDto, setSelectedDto] = useState<CatalogGarmentDto | null>(null);
  const [selectedColor, setSelectedColor] = useState<CatalogColorDto | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeView, setActiveView] = useState<CatalogViewDto | null>(null);

  const {
    data: garments,
    isLoading,
    isError,
    refetch,
  } = useQuery<CatalogGarmentDto[]>({
    queryKey: ['catalog-garments'],
    queryFn: () => fetchGarments(accessToken),
    staleTime: 5 * 60 * 1000,
  });

  function handleSelectGarment(dto: CatalogGarmentDto) {
    setSelectedDto(dto);
    setSelectedColor(dto.colors[0] ?? null);
    setSelectedSize(getSizesForCategory(dto.category)[2] ?? getSizesForCategory(dto.category)[0] ?? null);
    setQuantity(1);
    setActiveView(dto.views[0] ?? null);
    setStep(2);
  }

  function handleConfirm() {
    if (!selectedDto || !selectedColor || !selectedSize) return;
    onConfirm(mapToGarment(selectedDto), mapToColor(selectedColor), selectedSize, quantity);
  }

  const sizes = selectedDto ? getSizesForCategory(selectedDto.category) : [];
  const canConfirm = !!selectedDto && !!selectedColor && !!selectedSize;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 px-6 flex items-center gap-3 bg-white shadow-sm">
        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-md shadow-violet-500/20">
          <Sparkles size={16} className="text-white" />
        </div>
        <span className="text-sm font-black uppercase tracking-[0.25em] text-slate-800">
          AI Wear <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Studio</span>
        </span>
      </header>

      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
          <button
            onClick={() => setStep(1)}
            className={step === 1 ? 'font-bold text-violet-600' : 'hover:text-slate-600 transition-colors'}
          >
            1 · Elegir prenda
          </button>
          <ChevronRight size={12} />
          <span className={step === 2 ? 'font-bold text-violet-600' : 'text-slate-400'}>
            2 · Configurar
          </span>
        </div>

        {/* ── STEP 1: garment grid ── */}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-black text-slate-900 mb-1">¿Qué quieres personalizar?</h1>
            <p className="text-sm text-slate-500 mb-8">Selecciona una prenda para comenzar tu diseño.</p>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 size={32} className="text-violet-500 animate-spin" />
                <p className="text-sm text-slate-500">Cargando catálogo…</p>
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <AlertCircle size={32} className="text-rose-400" />
                <p className="text-sm text-slate-600 font-medium">No se pudo cargar el catálogo.</p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            )}

            {garments && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {garments.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGarment(g)}
                    className="group bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10 transition-all"
                  >
                    <div className="w-full aspect-square bg-slate-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden group-hover:bg-violet-50 transition-colors">
                      <span className="text-4xl select-none">👕</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{g.name}</p>
                    <p className="text-[11px] text-slate-400">{g.category}</p>
                    {/* color swatches */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {g.colors.slice(0, 6).map((c) => (
                        <span
                          key={c.id}
                          className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0"
                          style={{ backgroundColor: c.hexCode }}
                          title={c.colorName}
                        />
                      ))}
                      {g.colors.length > 6 && (
                        <span className="text-[10px] text-slate-400">+{g.colors.length - 6}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── STEP 2: configure ── */}
        {step === 2 && selectedDto && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left column — config */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 mb-1">{selectedDto.name}</h1>
              <p className="text-xs text-slate-400 mb-6">{selectedDto.category}</p>

              {/* Color */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDto.colors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedColor(c)}
                      title={c.colorName}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor?.id === c.id
                          ? 'border-violet-500 scale-110 shadow-md shadow-violet-500/30'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: c.hexCode }}
                    />
                  ))}
                </div>
                {selectedColor && (
                  <p className="text-xs text-slate-500 mt-1.5">{selectedColor.colorName}</p>
                )}
              </div>

              {/* Size */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Talla</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                        selectedSize === s
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-violet-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-8">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cantidad</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-violet-400 transition-colors disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-lg font-black w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-violet-400 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Comenzar diseño →
              </button>
            </div>

            {/* Right column — views + zones */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Vistas disponibles
              </p>
              <div className="space-y-3">
                {selectedDto.views.map((v) => (
                  <div
                    key={v.id}
                    className={`border rounded-xl p-3 cursor-pointer transition-all ${
                      activeView?.id === v.id
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-slate-200 bg-white hover:border-violet-300'
                    }`}
                    onClick={() => setActiveView(activeView?.id === v.id ? null : v)}
                  >
                    <p className="text-sm font-semibold text-slate-800">{v.viewName}</p>
                    {activeView?.id === v.id && (
                      <ZoneSummary garmentId={selectedDto.id} view={v} token={accessToken} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
