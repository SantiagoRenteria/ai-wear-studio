# AI Wear Studio — Contratos de API / Servicios

**Generado:** 2026-05-07  
**Nota:** No hay API REST propia. Los "contratos" son las interfaces de los servicios internos y la integración con Google Gemini API.

---

## Google Gemini API (Externo)

**Base URL:** `https://generativelanguage.googleapis.com`  
**SDK:** `@google/genai` v1.29.0  
**Auth:** API Key via `process.env.GEMINI_API_KEY`

### Modelos disponibles (con fallback en orden)

1. `gemini-2.5-flash-image-preview` ← prioritario
2. `gemini-2.0-flash-preview-image-generation`
3. `gemini-2.0-flash-exp-image-generation`
4. `gemini-2.5-flash-image`

### Estrategia de retry

- 1 retry si hay rate limit
- Delay entre retries: `[10000]` ms
- Delay entre llamadas consecutivas: `1500` ms

---

## Servicio: `services/gemini.ts`

### `generateDesignImages(userPrompt, style, count?, onProgress?)`

**Propósito:** Genera imágenes de diseño para estampar en la prenda.

```typescript
async function generateDesignImages(
  userPrompt: string,
  style: string | null,       // 'watercolor' | 'cyberpunk' | 'retro' | 'anime' | 'minimal' | 'graffiti' | '3d' | 'pixel'
  count: number = 1,           // número de variaciones a generar
  onProgress?: (variation: GeneratedVariation, index: number) => void
): Promise<GeneratedVariation[]>

interface GeneratedVariation {
  id: string;           // '{timestamp}-{index}'
  imageUrl: string;     // data URL base64 (PNG)
  prompt: string;       // prompt original del usuario
  style: string | null;
  createdAt: number;    // timestamp ms
}
```

**Prompt construido:** `"Generate a single graphic design image: {userPrompt}{styleSuffix}, isolated on plain white background, centered composition, high contrast, vibrant colors, illustration style suitable for screen printing on apparel, no text, no watermark, no logo"`

**Errores comunes:**
- `"La API key de Gemini no es válida."` — API_KEY incorrecta
- `"Cuota del free tier agotada..."` — rate limit alcanzado
- `"El prompt fue bloqueado por filtros de seguridad."` — safety filter
- `"Ningún modelo de Gemini está disponible."` — todos los modelos fallan

---

### `remixDesignImage(baseImageUrl, instruction)`

**Propósito:** Modifica una imagen de diseño existente según una instrucción.

```typescript
async function remixDesignImage(
  baseImageUrl: string,  // data URL del diseño actual
  instruction: string    // ej. "Cámbialo a estilo acuarela" 
): Promise<GeneratedVariation>
```

**Prompt:** `'Modify the provided design image according to this instruction: "{instruction}". Keep the overall composition and subject. {PRINT_SUFFIX}'`

---

### `tryOnDesign(designImageUrl, garmentType, colorName, modelStyle, count?, onProgress?)`

**Propósito:** Genera foto fotorrealista del modelo usando el diseño.

```typescript
type TryOnModelStyle = 'casual-m' | 'casual-f' | 'streetwear' | 'editorial';

async function tryOnDesign(
  designImageUrl: string,
  garmentType: string,    // ej. 't-shirt', 'hoodie'
  colorName: string,      // ej. 'Black', 'Navy'
  modelStyle: TryOnModelStyle,
  count: number = 1,
  onProgress?: (v: GeneratedVariation, i: number) => void
): Promise<GeneratedVariation[]>
```

**Descriptores de modelos:**
- `casual-m`: joven masculino, pose casual confiada, estudio, lookbook
- `casual-f`: joven femenina, pose relajada, fondo neutro, lookbook
- `streetwear`: persona estilo urbano, golden hour, editorial callejero
- `editorial`: modelo profesional, iluminación dramática, fondo blanco, revista

---

### `removeBackground(imageUrl)`

**Propósito:** Elimina el fondo de una imagen vía IA (para casos complejos).

```typescript
async function removeBackground(
  imageUrl: string  // data URL de la imagen
): Promise<string>  // data URL del resultado con fondo transparente
```

**Prompt:** `'Remove the background of this image completely. Keep only the main subject with a transparent background. Maintain perfect edge quality.'`

---

### `styleTransferImage(imageUrl, instruction)`

**Propósito:** Transforma el estilo de un logo/imagen.

```typescript
async function styleTransferImage(
  imageUrl: string,
  instruction: string  // ej. "Conviértelo a estilo pixel art"
): Promise<string>     // data URL del resultado
```

---

## Servicio: `services/persistence.ts`

**Storage:** `localStorage`

### Endpoints internos

#### `saveSession(input): PersistedSession`
```typescript
interface SaveSessionInput {
  id: string;
  garment: Garment;
  selectedColor: ColorOption;
  selectedSize: string;
  currentView: ViewType;
  layers: LayersSnapshot;   // Record<ViewType, Layer[]>
}
```
- Guarda o actualiza la sesión en localStorage
- Limita a MAX_SESSIONS = 5 sesiones (descarta las más viejas)
- Actualiza el `currentSessionId`

#### `listSessions(): PersistedSession[]`
Retorna todas las sesiones ordenadas por `updatedAt` descendente.

#### `listSessionSummaries(): SessionSummary[]`
Versión ligera para mostrar en listas UI.

#### `getSession(id): PersistedSession | null`
Busca una sesión por ID.

#### `deleteSession(id): void`
Elimina una sesión y limpia `currentSessionId` si coincide.

#### `findResumableSession(): PersistedSession | null`
Retorna la sesión más reciente que tiene capas (no vacía).

#### `isSessionEmpty(layers): boolean`
True si todas las vistas tienen 0 capas.

---

## Servicio: `services/rateLimit.ts`

### `getSnapshot(): Promise<RateLimitSnapshot>`

```typescript
interface RateLimitSnapshot {
  used: number;         // generaciones usadas en el período actual
  total: number;        // FREE_DAILY_LIMIT = 10
  remaining: number;    // total - used
  blocked: boolean;     // true si usado >= total y no desbloqueado
  windowStart: number;  // inicio del período (ms)
  resetsAt: number;     // windowStart + 24h
  unlocked: boolean;    // true si tiene historial de compras o unlock activo
}
```

### `tryConsume(amount?): Promise<RateLimitSnapshot>`
Intenta consumir N unidades. Si `result.blocked === true`, no ejecutar la acción de IA.

### `unlockForSession(durationMs?): void`
Desbloquea el rate limit por `durationMs` ms (default 24h). Llamar al confirmar compra.

### `recordPurchase(orderId): void`
Registra una compra confirmada en localStorage para bypass permanente del rate limit.

---

## Servicio: `services/addressValidation.ts`

### `validateAddress(input): ValidationResult`

```typescript
interface AddressInput {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;  // nombre o ISO-2 del país
}

interface ValidationResult {
  ok: boolean;           // false si hay al menos un error
  issues: FieldIssue[];
  countryCode: CountryCode | null;
}

interface FieldIssue {
  field: 'address' | 'city' | 'state' | 'zip' | 'country';
  level: 'error' | 'warning';
  message: string;
}
```

**Países soportados:** Colombia (CO), México (MX), United States (US), Argentina (AR), Chile (CL), Perú (PE)

### `citySuggestions(countryName, stateName, query, limit?): string[]`
Retorna ciudades que coinciden con el prefijo `query` dentro del país/departamento especificado. Máximo `limit` resultados (default 6).

### `osmEmbedUrl(address, city, country): string`
Genera URL de OpenStreetMap embed para mostrar la dirección en un mini mapa (sin API key).

---

## Servicio: `services/bgRemoval.ts`

### `detectBackground(dataUrl): Promise<BgDetection>`

```typescript
interface BgDetection {
  borderColor: { r, g, b };      // promedio del color de las 4 esquinas
  borderUniformity: number;      // 0-1 (1 = muy uniforme)
  borderLuminance: number;       // 0-1 (1 = muy claro)
  confidence: number;            // 0-1 (confianza de que hay fondo removible)
}
```

Threshold recomendado: `confidence > 0.65` para auto-disparar el removal.

### `removeBackgroundLocal(dataUrl, opts?): Promise<BgRemovalResult>`

```typescript
interface RemoveOptions {
  tolerance?: number;      // distancia RGB máxima (default 38, rango 0-441)
  featherPasses?: number;  // suavizado de bordes (default 1)
}

interface BgRemovalResult {
  cleaned: string;         // data URL PNG con canal alpha
  removedRatio: number;    // % de píxeles marcados como fondo
  detection: BgDetection;
}
```

---

## Servicio: `services/printQuality.ts`

### `analyzePrintQuality(layers, garmentHex): QualityReport`

```typescript
function analyzePrintQuality(
  layers: LayersSnapshot,  // todas las capas de todas las vistas
  garmentHex: string       // ej. '#0F172A' (color de la prenda)
): QualityReport
```

```typescript
interface QualityReport {
  score: 'excellent' | 'acceptable' | 'issues';
  errorCount: number;
  warningCount: number;
  issues: QualityIssue[];
}
```

**Reglas aplicadas:**
- Capas ocultas (`hidden: true`) se ignoran
- Capas de tipo `text`: contraste WCAG, tamaño efectivo, stroke fino
- Capas de tipo `image` o `ai`: escala máxima

### `contrastRatio(hexA, hexB): number`
Calcula el ratio de contraste WCAG 2.1 entre dos colores hex. Útil para validaciones custom.

---

## Servicio: `services/referrals.ts`

### `getOrCreateMyCode(): Promise<string>`
Genera o retorna el código de referido del usuario actual (6 chars base36 derivado del fingerprint).

### `getReferralSummary(): Promise<ReferralSummary>`

```typescript
interface ReferralSummary {
  myCode: string;
  myLink: string;       // URL completa con ?ref=CODE
  referredBy: string | null;
  totals: { visited, designed, purchased: number };
  credits: number;      // COP acumulados
  invitations: InvitationEvent[];
  ledger: CreditLedgerEntry[];
}
```

### `captureReferrerFromUrl(): string | null`
Lee `?ref=CODE` de la URL y lo persiste en localStorage (first-touch attribution). Llamar al montar la app.

### `rewardOnPurchase(orderId): { rewardedReferrer, rewardedSelf: boolean }`
Ejecutar al confirmar un pedido. Emite créditos al referidor y bono de bienvenida al comprador.

### URLs de compartir
- `whatsappShareUrl(link)` → `https://wa.me/?text=...`
- `twitterShareUrl(link)` → `https://twitter.com/intent/tweet?text=...`
- `emailShareUrl(link)` → `mailto:?subject=...&body=...`

---

## Servicio: `services/exporter.ts`

### `registerExporter(fn): void`
Registra la función de export del canvas. Llamada desde `CanvasEngine.useEffect` al montar.

### `exportPreviewPng(): Promise<string | null>`
Ejecuta el export registrado y retorna el data URL del PNG 1080×1080. Retorna `null` si falla o no hay exporter.

### Helpers de composición

#### `svgNodeToDataUrl(svg): string`
Serializa un SVG DOM node a data URL.

#### `loadImage(src): Promise<HTMLImageElement>`
Carga una imagen desde data URL o URL externa.

#### `drawWatermark(ctx, w, h): void`
Dibuja `"made with AI Wear Studio"` en la esquina inferior derecha con sombra blanca para legibilidad universal.
