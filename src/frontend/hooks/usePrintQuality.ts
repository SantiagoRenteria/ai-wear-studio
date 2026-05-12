// HU-7.4 — Hook que computa el reporte de calidad de impresion en cada
// cambio relevante del store. Memoizado para no recalcular en renders.

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { analyzePrintQuality, type QualityReport } from '../services/printQuality';

export function usePrintQuality(): QualityReport {
  const layers = useStore((s) => s.layers);
  const garmentHex = useStore((s) => s.selectedColor.hex);

  return useMemo(
    () => analyzePrintQuality(layers, garmentHex),
    [layers, garmentHex],
  );
}
