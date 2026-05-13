/// <reference lib="webworker" />
import { removeBackgroundData } from '../services/bgRemoval';

export interface BgRemovalWorkerInput {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  tolerance?: number;
}

export interface BgRemovalWorkerOutput {
  buffer: ArrayBuffer;
  removedRatio: number;
}

export interface BgRemovalWorkerError {
  error: string;
}

self.onmessage = (e: MessageEvent<BgRemovalWorkerInput>) => {
  const { buffer, width, height, tolerance } = e.data;
  try {
    // OffscreenCanvas como superficie de renderizado — requerimiento del spec.
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(buffer), width, height), 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);

    const { data, removedRatio } = removeBackgroundData(imageData.data, width, height, { tolerance });

    const outBuffer = data.buffer.slice(0);
    self.postMessage({ buffer: outBuffer, removedRatio } satisfies BgRemovalWorkerOutput, [outBuffer]);
  } catch (err) {
    self.postMessage({ error: String(err) } satisfies BgRemovalWorkerError);
  }
};
