// HU-7.1 — Slider antes/despues con drag horizontal.
// Muestra dos imagenes (mismas dimensiones) con un divisor que el usuario
// arrastra para revelar mas o menos de cada una.

import { useRef, useState } from 'react';

interface Props {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Original',
  afterLabel = 'Limpiado',
  className = '',
}: Props) {
  const [position, setPosition] = useState(50); // %
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, pct)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateFromClientX(e.clientX);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className={
        'relative overflow-hidden select-none touch-none rounded-xl bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] ' +
        className
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="slider"
      aria-label="Comparar antes y despues"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
    >
      {/* Imagen "despues" siempre visible debajo. */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-contain p-6 pointer-events-none"
        draggable={false}
      />

      {/* Imagen "antes" recortada por la posicion del slider. */}
      <div
        className="absolute inset-0 overflow-hidden bg-slate-50"
        style={{ width: position + '%' }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 h-full object-contain p-6 pointer-events-none"
          style={{ width: containerRef.current?.offsetWidth ?? '100%' }}
          draggable={false}
        />
      </div>

      {/* Linea divisora + handle. */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ left: 'calc(' + position + '% - 1px)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center cursor-ew-resize ring-1 ring-slate-200">
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-slate-500" fill="currentColor">
            <path d="M3 6 L1 4 L1 8 Z M9 6 L11 4 L11 8 Z" />
          </svg>
        </div>
      </div>

      {/* Etiquetas. */}
      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest text-white bg-slate-900/70 px-2 py-1 rounded-md backdrop-blur">
        {beforeLabel}
      </span>
      <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest text-white bg-slate-900/70 px-2 py-1 rounded-md backdrop-blur">
        {afterLabel}
      </span>
    </div>
  );
}
