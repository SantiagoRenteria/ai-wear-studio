import { describe, it, expect } from 'vitest';
import {
  ViewId,
  DesignSnapshotSchema,
  serializeSnapshot,
} from './DesignSnapshotSchema';

const MINIMAL_LAYERS = {
  front: [
    {
      id: crypto.randomUUID(),
      type: 'text',
      content: 'Hola',
      x: 10, y: 10,
      scaleX: 1, scaleY: 1,
      rotation: 0,
      zIndex: 0,
    },
  ],
  back: [],
  left_sleeve: [],
  right_sleeve: [],
};

describe('DesignSnapshotSchema — T8.1/T8.2', () => {
  it('serializeSnapshot mapea left_sleeve → left y right_sleeve → right', () => {
    const snapshot = serializeSnapshot({
      designId: crypto.randomUUID(),
      activeView: 'left_sleeve',
      viewLayers: MINIMAL_LAYERS,
      colorPalette: ['#ff0000'],
    });

    expect(Object.keys(snapshot.views)).not.toContain('left_sleeve');
    expect(Object.keys(snapshot.views)).not.toContain('right_sleeve');
    expect(snapshot.activeViewId).toBe('left');
    expect(ViewId.options).toContain('left');
    expect(ViewId.options).toContain('right');
    expect(ViewId.options).not.toContain('left_sleeve');
  });

  it('serializeSnapshot produce un snapshot válido según DesignSnapshotSchema', () => {
    const snapshot = serializeSnapshot({
      designId: crypto.randomUUID(),
      activeView: 'front',
      viewLayers: MINIMAL_LAYERS,
    });

    expect(() => DesignSnapshotSchema.parse(snapshot)).not.toThrow();
  });

  it('DesignSnapshotSchema rechaza ViewId inválido', () => {
    const bad = {
      id: crypto.randomUUID(),
      designId: crypto.randomUUID(),
      timestamp: Date.now(),
      activeViewId: 'left_sleeve', // inválido según schema
      views: {},
      globalMetadata: { colorPalette: [], appliedTextiles: [] },
    };

    const result = DesignSnapshotSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('DesignSnapshotSchema rechaza snapshot sin id uuid válido', () => {
    const bad = {
      id: 'not-a-uuid',
      designId: crypto.randomUUID(),
      timestamp: Date.now(),
      activeViewId: 'front',
      views: {},
      globalMetadata: { colorPalette: [], appliedTextiles: [] },
    };

    const result = DesignSnapshotSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
