import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.GEMINI_API_KEY;

const MODELS_FALLBACK = [
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.5-flash-image',
];

const DELAY_BETWEEN_CALLS_MS = 1500;
const RETRY_DELAYS_MS = [10000];

export interface GeneratedVariation {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string | null;
  createdAt: number;
}

export type TryOnModelStyle = 'casual-m' | 'casual-f' | 'streetwear' | 'editorial';

const STYLE_SUFFIXES: Record<string, string> = {
  watercolor: 'watercolor painting style, soft brush strokes, ink splashes',
  cyberpunk: 'cyberpunk style with neon lights, futuristic, vibrant',
  retro: 'retro 70s vintage poster style, warm colors, grainy texture',
  anime: 'anime manga illustration style, expressive vibrant colors',
  minimal: 'minimalist line art, clean simple geometric design',
  graffiti: 'graffiti street art style, bold spray paint urban aesthetic',
  '3d': '3D render style, octane render, cinematic lighting, soft shadows',
  pixel: 'pixel art style, 8-bit retro video game aesthetic',
};

const MODEL_PROMPTS: Record<TryOnModelStyle, string> = {
  'casual-m': 'a young man with athletic build, casual confident pose, soft studio lighting, neutral light gray background, fashion lookbook style',
  'casual-f': 'a young woman with friendly relaxed pose, natural hair, soft studio lighting, neutral background, fashion lookbook style',
  'streetwear': 'a stylish young person in an urban setting at golden hour, street fashion editorial, slightly low angle, vibrant atmosphere',
  'editorial': 'a professional fashion model in editorial pose, dramatic studio lighting, minimalist white background, high-end fashion magazine style',
};

const GARMENT_NAMES: Record<string, string> = {
  't-shirt': 't-shirt', 'polo': 'polo shirt', 'tank-top': 'tank top',
  'long-sleeve': 'long sleeve shirt', 'hoodie': 'hoodie', 'sweatshirt': 'sweatshirt crewneck',
  'shorts': 'shorts', 'sweatpants': 'sweatpants', 'cap': 'baseball cap',
};

const PRINT_SUFFIX =
  'isolated on plain white background, centered composition, high contrast, ' +
  'vibrant colors, illustration style suitable for screen printing on apparel, ' +
  'no text, no watermark, no logo';

function buildPrompt(userPrompt: string, style: string | null): string {
  const styleHint = style && STYLE_SUFFIXES[style] ? ', ' + STYLE_SUFFIXES[style] : '';
  return 'Generate a single graphic design image: ' + userPrompt.trim() + styleHint + ', ' + PRINT_SUFFIX;
}

function extractImageFromResponse(response: any): string | null {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part?.inlineData?.data) {
      const mime = part.inlineData.mimeType || 'image/png';
      return 'data:' + mime + ';base64,' + part.inlineData.data;
    }
  }
  return null;
}

function dataUrlToInline(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Imagen base invalida (no es data URL).');
  return { mimeType: match[1], data: match[2] };
}

function isRateLimit(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('quota') || msg.includes('rate') || msg.includes('429') ||
    msg.includes('resource_exhausted') || msg.includes('exhausted');
}

function isModelNotFound(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('not found') || msg.includes('404') || msg.includes('not_found');
}

function mapError(err: any): Error {
  const msg = err?.message || String(err);
  if (msg.includes('API key') || msg.includes('API_KEY')) {
    return new Error('La API key de Gemini no es valida.');
  }
  if (isRateLimit(err)) {
    return new Error('Cuota del free tier agotada. Gemini Image Preview tiene ~10 generaciones/dia gratis. Espera 24h o activa la facturacion en Google AI Studio.');
  }
  if (msg.includes('SAFETY') || msg.includes('safety')) {
    return new Error('El prompt fue bloqueado por filtros de seguridad. Intenta otro.');
  }
  if (isModelNotFound(err)) {
    return new Error('Ningun modelo de Gemini esta disponible. Activa Imagen 3 o espera al rollout.');
  }
  return new Error('Error generando imagenes: ' + msg);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callWithRetry(ai: GoogleGenAI, contents: any): Promise<string> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    for (const model of MODELS_FALLBACK) {
      try {
        const response = await ai.models.generateContent({ model, contents });
        const img = extractImageFromResponse(response);
        if (img) return img;
        lastErr = new Error('Modelo ' + model + ' no devolvio imagen');
      } catch (err: any) {
        lastErr = err;
        if (isRateLimit(err)) break;
        if (isModelNotFound(err)) continue;
        throw err;
      }
    }
    if (isRateLimit(lastErr) && attempt < RETRY_DELAYS_MS.length) {
      console.warn('[gemini] rate limit, esperando ' + RETRY_DELAYS_MS[attempt] + 'ms');
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    break;
  }
  throw lastErr || new Error('Todos los modelos fallaron');
}

export async function generateDesignImages(
  userPrompt: string,
  style: string | null,
  count: number = 1,
  onProgress?: (variation: GeneratedVariation, index: number) => void
): Promise<GeneratedVariation[]> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY no esta configurada.');
  if (!userPrompt.trim()) throw new Error('El prompt no puede estar vacio.');

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const fullPrompt = buildPrompt(userPrompt, style);
  const variations: GeneratedVariation[] = [];

  try {
    for (let i = 0; i < count; i++) {
      if (i > 0) await sleep(DELAY_BETWEEN_CALLS_MS);
      const imageUrl = await callWithRetry(ai, fullPrompt);
      const v: GeneratedVariation = {
        id: Date.now() + '-' + i,
        imageUrl, prompt: userPrompt, style,
        createdAt: Date.now(),
      };
      variations.push(v);
      onProgress?.(v, i);
    }
    return variations;
  } catch (err: any) {
    if (variations.length > 0) return variations;
    throw mapError(err);
  }
}

export async function remixDesignImage(
  baseImageUrl: string,
  instruction: string
): Promise<GeneratedVariation> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY no esta configurada.');
  if (!instruction.trim()) throw new Error('Describe que quieres cambiar.');

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const inline = dataUrlToInline(baseImageUrl);
  const fullPrompt =
    'Modify the provided design image according to this instruction: "' +
    instruction.trim() + '". Keep the overall composition and subject. ' + PRINT_SUFFIX;

  try {
    const imageUrl = await callWithRetry(ai, [{
      role: 'user',
      parts: [
        { text: fullPrompt },
        { inlineData: { mimeType: inline.mimeType, data: inline.data } },
      ],
    }]);
    return {
      id: 'remix-' + Date.now(), imageUrl,
      prompt: instruction, style: null, createdAt: Date.now(),
    };
  } catch (err: any) {
    throw mapError(err);
  }
}

export async function tryOnDesign(
  designImageUrl: string,
  garmentType: string,
  colorName: string,
  modelStyle: TryOnModelStyle,
  count: number = 1,
  onProgress?: (v: GeneratedVariation, i: number) => void
): Promise<GeneratedVariation[]> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY no esta configurada.');

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const inline = dataUrlToInline(designImageUrl);
  const garmentLabel = GARMENT_NAMES[garmentType] || 't-shirt';
  const modelHint = MODEL_PROMPTS[modelStyle];

  const fullPrompt =
    'Generate a photorealistic studio photo of ' + modelHint + '. ' +
    'The person is wearing a ' + colorName.toLowerCase() + ' ' + garmentLabel + ' ' +
    'with this exact graphic design printed clearly on the front chest area. ' +
    'Maintain the design proportions and details. ' +
    'Sharp focus, professional photography, vertical composition, full upper body visible.';

  const variations: GeneratedVariation[] = [];
  try {
    for (let i = 0; i < count; i++) {
      if (i > 0) await sleep(DELAY_BETWEEN_CALLS_MS);
      const imageUrl = await callWithRetry(ai, [{
        role: 'user',
        parts: [
          { text: fullPrompt },
          { inlineData: { mimeType: inline.mimeType, data: inline.data } },
        ],
      }]);
      const v: GeneratedVariation = {
        id: 'tryon-' + Date.now() + '-' + i,
        imageUrl, prompt: 'Try-On: ' + modelStyle,
        style: modelStyle, createdAt: Date.now(),
      };
      variations.push(v);
      onProgress?.(v, i);
    }
    return variations;
  } catch (err: any) {
    if (variations.length > 0) return variations;
    throw mapError(err);
  }
}

export async function removeBackground(imageUrl: string): Promise<string> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY no esta configurada.');
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const inline = dataUrlToInline(imageUrl);
  const fullPrompt =
    'Remove the background of this image completely. Keep only the main subject ' +
    'with a transparent background. Maintain perfect edge quality.';
  try {
    return await callWithRetry(ai, [{
      role: 'user',
      parts: [
        { text: fullPrompt },
        { inlineData: { mimeType: inline.mimeType, data: inline.data } },
      ],
    }]);
  } catch (err: any) {
    throw mapError(err);
  }
}

export async function styleTransferImage(imageUrl: string, instruction: string): Promise<string> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY no esta configurada.');
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const inline = dataUrlToInline(imageUrl);
  const fullPrompt =
    'Transform this logo/image: ' + instruction + '. ' +
    'Keep the same shape, layout and main subject. ' +
    'Return only the transformed image with transparent background.';
  try {
    return await callWithRetry(ai, [{
      role: 'user',
      parts: [
        { text: fullPrompt },
        { inlineData: { mimeType: inline.mimeType, data: inline.data } },
      ],
    }]);
  } catch (err: any) {
    throw mapError(err);
  }
}
