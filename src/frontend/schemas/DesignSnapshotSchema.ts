import { z } from 'zod';

export const ViewId = z.enum(['front', 'back', 'left', 'right']);
export type ViewId = z.infer<typeof ViewId>;

export const ElementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['image', 'text', 'ai-generated']),
  x: z.number(),
  y: z.number(),
  scaleX: z.number().positive(),
  scaleY: z.number().positive(),
  rotation: z.number(),
  content: z.string(),
  zIndex: z.number().int().nonnegative(),
  color: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
});
export type Element = z.infer<typeof ElementSchema>;

export const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number().positive(),
});
export type Transform = z.infer<typeof TransformSchema>;

export const ViewState = z.object({
  elements: z.array(ElementSchema),
  canvasTransform: TransformSchema,
  qualityValidation: z.object({
    hasWarnings: z.boolean(),
    alertCount: z.number().int().nonnegative(),
  }).optional(),
});
export type ViewState = z.infer<typeof ViewState>;

export const DesignSnapshotSchema = z.object({
  id: z.string().uuid(),
  designId: z.string().uuid(),
  timestamp: z.number(),
  activeViewId: ViewId,
  views: z.record(ViewId, ViewState),
  globalMetadata: z.object({
    colorPalette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)),
    appliedTextiles: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
  }),
});
export type DesignSnapshot = z.infer<typeof DesignSnapshotSchema>;

// Mapeo entre ViewType del store (prototipo) y ViewId del schema
const VIEW_MAP: Record<string, ViewId> = {
  left_sleeve: 'left',
  right_sleeve: 'right',
};
const toViewId = (v: string): ViewId =>
  ViewId.parse((VIEW_MAP[v] ?? v));

// Serializa el estado del store al schema canónico
export function serializeSnapshot(params: {
  designId: string;
  activeView: string;
  viewLayers: Record<string, {
    id: string;
    type: string;
    content: string;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    zIndex: number;
    color?: string;
    fontFamily?: string;
    fontSize?: number;
  }[]>;
  colorPalette?: string[];
}): DesignSnapshot {
  const views: Record<string, ViewState> = {};

  for (const [viewKey, layers] of Object.entries(params.viewLayers)) {
    const vid = toViewId(viewKey);
    views[vid] = {
      elements: layers.map(l => ({
        id: l.id,
        type: (l.type === 'ai' ? 'ai-generated' : l.type) as 'image' | 'text' | 'ai-generated',
        x: l.x,
        y: l.y,
        scaleX: l.scaleX || 1,
        scaleY: l.scaleY || 1,
        rotation: l.rotation || 0,
        content: l.content,
        zIndex: l.zIndex,
        color: l.color,
        fontFamily: l.fontFamily,
        fontSize: l.fontSize,
      })),
      canvasTransform: { x: 0, y: 0, scale: 1 },
    };
  }

  const snapshot: DesignSnapshot = {
    id: crypto.randomUUID(),
    designId: params.designId,
    timestamp: Date.now(),
    activeViewId: toViewId(params.activeView),
    views,
    globalMetadata: {
      colorPalette: params.colorPalette ?? [],
      appliedTextiles: [],
    },
  };

  return DesignSnapshotSchema.parse(snapshot);
}
