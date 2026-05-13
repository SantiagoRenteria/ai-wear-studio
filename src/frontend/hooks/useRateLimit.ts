// HU-15.1 — Hook que expone el estado del rate limit y un consumer.
// El estado se refresca al montar y luego cada 60s (para que el "Resets in"
// se actualice cuando el usuario deja la pestana abierta).

import { useCallback, useEffect, useState } from 'react';
import {
  getSnapshot,
  tryConsume,
  type RateLimitSnapshot,
} from '../services/rateLimit';

export function useRateLimit() {
  const [snap, setSnap] = useState<RateLimitSnapshot | null>(null);

  const refresh = useCallback(async () => {
    const s = await getSnapshot();
    setSnap(s);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const consume = useCallback(async (amount: number = 1) => {
    const s = await tryConsume(amount);
    setSnap(s);
    return s;
  }, []);

  return {
    snapshot: snap,
    consume,
    refresh,
  };
}
