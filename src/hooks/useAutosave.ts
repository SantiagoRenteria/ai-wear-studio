// HU-12.4 — Hook que persiste la sesion en localStorage con debounce.
//
// Uso:
//   const { status, lastSavedAt, forceSave } = useAutosave();
//
// Suscribe al store y guarda cada DEBOUNCE_MS despues de la ultima mutacion
// relevante. Expone status para que el header muestre "Guardado hace X".

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  getCurrentSessionId,
  getSession,
  isSessionEmpty,
  newSessionId,
  saveSession,
  setCurrentSessionId,
} from '../services/persistence';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 5000;

interface UseAutosaveOptions {
  /** Si es true, no guarda. Util para suspender mientras se restaura una sesion. */
  paused?: boolean;
}

export function useAutosave({ paused = false }: UseAutosaveOptions = {}) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(paused);

  // Mantener pausedRef sincronizado para no recrear suscripciones.
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Inicializar id de sesion en mount.
  useEffect(() => {
    let id = getCurrentSessionId();
    if (id) {
      const existing = getSession(id);
      if (!existing) id = null; // id huerfano
    }
    if (!id) {
      id = newSessionId();
      setCurrentSessionId(id);
    }
    sessionIdRef.current = id;
  }, []);

  // Suscripcion al store.
  useEffect(() => {
    const VIEW_SERIAL_MAP: Record<string, string> = {
      left_sleeve: 'left',
      right_sleeve: 'right',
    };
    const toViewId = (v: string) => VIEW_SERIAL_MAP[v] ?? v;

    const persistCanonical = (id: string, layers: ReturnType<typeof useStore.getState>['layers']) => {
      for (const [viewKey, viewLayers] of Object.entries(layers)) {
        try {
          localStorage.setItem(
            `design:${id}:${toViewId(viewKey)}`,
            JSON.stringify(viewLayers),
          );
        } catch { /* storage full — swallow */ }
      }
    };

    const persist = () => {
      if (pausedRef.current) return;
      const id = sessionIdRef.current;
      if (!id) return;

      const state = useStore.getState();

      // No creamos sesiones vacias, pero si la sesion ya existia y ahora
      // quedo vacia (todo borrado) si la guardamos para reflejar el estado.
      const existing = getSession(id);
      if (!existing && isSessionEmpty(state.layers)) return;

      try {
        setStatus('saving');
        saveSession({
          id,
          garment: state.garment,
          selectedColor: state.selectedColor,
          selectedSize: state.selectedSize,
          currentView: state.currentView,
          layers: state.layers,
        });
        persistCanonical(id, state.layers);
        setLastSavedAt(Date.now());
        setStatus('saved');
      } catch (err) {
        console.error('[useAutosave] Error guardando', err);
        setStatus('error');
      }
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(persist, DEBOUNCE_MS);
    };

    // Tomamos solo los campos que importan para la persistencia.
    const selector = (s: ReturnType<typeof useStore.getState>) => ({
      layers: s.layers,
      garment: s.garment,
      selectedColor: s.selectedColor,
      selectedSize: s.selectedSize,
      currentView: s.currentView,
    });

    let prev = selector(useStore.getState());
    const unsubscribe = useStore.subscribe((state) => {
      const next = selector(state);
      // Cambio relevante? Comparamos por referencia (Zustand crea nuevas refs en cada set).
      if (
        next.layers !== prev.layers ||
        next.garment !== prev.garment ||
        next.selectedColor !== prev.selectedColor ||
        next.selectedSize !== prev.selectedSize ||
        next.currentView !== prev.currentView
      ) {
        prev = next;
        schedule();
      }
    });

    // Tambien intentamos guardar al cerrar la pestana, sin debounce.
    const flushOnUnload = (e: BeforeUnloadEvent) => {
      const id = sessionIdRef.current;
      const state = useStore.getState();
      const hasWork = !isSessionEmpty(state.layers);

      if (hasWork && !pausedRef.current) {
        // Diálogo de confirmación estándar del navegador (FR22 / UX-04)
        e.preventDefault();
      }

      if (pausedRef.current) return;
      if (!id) return;
      const existing = getSession(id);
      if (!existing && !hasWork) return;
      try {
        saveSession({
          id,
          garment: state.garment,
          selectedColor: state.selectedColor,
          selectedSize: state.selectedSize,
          currentView: state.currentView,
          layers: state.layers,
        });
        persistCanonical(id, state.layers);
      } catch {
        /* swallow */
      }
    };
    window.addEventListener('beforeunload', flushOnUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', flushOnUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const forceSave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pausedRef.current) return;
    const id = sessionIdRef.current;
    if (!id) return;
    const state = useStore.getState();
    const existing = getSession(id);
    if (!existing && isSessionEmpty(state.layers)) return;
    try {
      setStatus('saving');
      saveSession({
        id,
        garment: state.garment,
        selectedColor: state.selectedColor,
        selectedSize: state.selectedSize,
        currentView: state.currentView,
        layers: state.layers,
      });
      setLastSavedAt(Date.now());
      setStatus('saved');
    } catch (err) {
      console.error('[useAutosave] Error en forceSave', err);
      setStatus('error');
    }
  };

  /** Reemplaza la sesion activa por una existente (al "Retomar"). */
  const adoptSession = (id: string) => {
    sessionIdRef.current = id;
    setCurrentSessionId(id);
    setLastSavedAt(Date.now());
    setStatus('saved');
  };

  /** Crea una nueva sesion (al "Empezar nuevo"). */
  const startNewSession = () => {
    const id = newSessionId();
    sessionIdRef.current = id;
    setCurrentSessionId(id);
    setLastSavedAt(null);
    setStatus('idle');
  };

  return { status, lastSavedAt, forceSave, adoptSession, startNewSession };
}
