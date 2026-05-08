# AI Wear Studio — Modelos de Datos

**Generado:** 2026-05-07

---

## Resumen

No hay base de datos relacional. Los datos del proyecto se organizan en:
1. **Tipos TypeScript** (`src/types.ts`) — contratos en tiempo de compilación
2. **LocalStorage** — persistencia de sesiones de usuario
3. **Datos estáticos** (`src/data/catalog.ts`) — catálogo de prendas y zonas

---

## Tipos de Dominio (src/types.ts)

### ViewType
```typescript
type ViewType = 'front' | 'back' | 'left_sleeve' | 'right_sleeve';
```

### GarmentType
```typescript
type GarmentType =
  | 't-shirt' | 'polo' | 'tank-top' | 'long-sleeve'
  | 'hoodie' | 'sweatshirt' | 'shorts' | 'sweatpants' | 'cap';
```

### Gender
```typescript
type Gender = 'male' | 'female' | 'unisex';
```

### PlacementZone (enum)
```typescript
enum PlacementZone {
  LeftChest    = 'LeftChest',
  CenterChest  = 'CenterChest',
  FullFront    = 'FullFront',
  UpperBack    = 'UpperBack',
  FullBack     = 'FullBack',
  LeftSleeve   = 'LeftSleeve',
  RightSleeve  = 'RightSleeve',
  Front        = 'Front',       // solo gorra
}
```

### ColorOption
```typescript
interface ColorOption {
  name: string;     // ej. 'White', 'Black', 'Navy'
  hex: string;      // ej. '#FFFFFF'
  premium?: boolean; // precio adicional si true
}
```

---

## Entidad: Layer (capa de diseño)

La unidad fundamental de diseño. Cada capa vive dentro de un `ViewType` específico.

```typescript
interface Layer {
  id: string;                   // UUID (crypto.randomUUID)
  type: 'image' | 'text' | 'ai'; // origen de la capa
  content: string;              // dataURL para image/ai; texto plano para text
  
  // Transformaciones en el canvas
  x: number;                    // posición X en pixels del stage
  y: number;                    // posición Y en pixels del stage
  scaleX: number;               // escala horizontal (1.0 = tamaño original)
  scaleY: number;               // escala vertical
  rotation: number;             // grados (0-360)
  zIndex: number;               // orden de renderizado (mayor = encima)
  
  placementZone: PlacementZone; // zona de impresión asignada
  hidden?: boolean;             // si true, no se renderiza ni exporta
  name?: string;                // nombre amigable (ej. nombre del archivo)
  
  // Propiedades exclusivas de texto
  color?: string;               // hex del color del texto
  fontFamily?: string;          // nombre de fuente Google
  fontSize?: number;            // puntos base (antes de scale)
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  textEffect?: 'none' | 'stroke' | 'shadow' | 'glow' | 'neon' | 'gradient' | '3d';
  strokeColor?: string;         // color del borde en textEffect='stroke'
  letterSpacing?: number;       // espaciado entre letras
  
  // Ajustes de imagen
  brightness?: number;          // 0-200 (100=normal)
  contrast?: number;            // 0-200 (100=normal)
  saturation?: number;          // 0-200 (100=normal)
}
```

---

## Entidad: Garment (prenda del catálogo)

```typescript
interface Garment {
  id: string;                    // ej. 'tshirt-unisex'
  name: string;                  // ej. 'Camiseta Premium'
  type: GarmentType;
  gender: Gender;
  basePrice: number;             // USD
  availableSizes: string[];      // ej. ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  availableColors: ColorOption[];
  description?: string;
  emoji?: string;
  availableViews?: ViewType[];   // si undefined, depende del tipo
}
```

### Catálogo completo (10 prendas)

| ID | Nombre | Base Price | Género | Vistas |
|----|--------|-----------|--------|--------|
| tshirt-unisex | Camiseta Premium | $24.99 | Unisex | 4 |
| tshirt-female | Camiseta Mujer | $24.99 | Femenino | 4 |
| polo-male | Polo Hombre | $34.99 | Masculino | 4 |
| tank-top | Tank Top | $19.99 | Unisex | 2 (front/back) |
| long-sleeve | Manga Larga | $29.99 | Unisex | 4 |
| hoodie-unisex | Sudadera | $49.99 | Unisex | 4 |
| sweatshirt | Buzo Crewneck | $39.99 | Unisex | 4 |
| shorts | Pantaloneta | $27.99 | Unisex | 2 (front/back) |
| sweatpants | Joggers | $39.99 | Unisex | 2 (front/back) |
| cap | Gorra | $22.99 | Unisex | 2 (front/back) |

---

## Entidad: PrintZone (zona de impresión)

```typescript
interface PrintZone {
  id: PlacementZone;
  top: number;      // fracción 0..1 del contenedor
  right: number;
  bottom: number;
  left: number;
  label: string;    // ej. 'Pecho centro'
  technique: 'DTG' | 'ScreenPrint' | 'Embroidery' | 'DTF' | 'HeatTransfer';
  primary?: boolean; // zona por defecto al agregar capas
}
```

**MAX_ZONE_AREA = 0.8** — ninguna zona puede ocupar más del 80% del contenedor.

---

## Entidad: CustomZoneEntry (zona personalizada del usuario)

```typescript
interface CustomZoneEntry {
  id: string;                  // 'custom-<timestamp>-<random>'
  label: string;               // nombre dado por el usuario
  technique: 'DTG' | 'ScreenPrint' | 'Embroidery' | 'DTF' | 'HeatTransfer';
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

---

## Entidad: PersistedSession (localStorage)

```typescript
interface PersistedSession {
  id: string;              // UUID
  version: number;         // STORAGE_VERSION = 1
  updatedAt: number;       // timestamp ms
  createdAt: number;       // timestamp ms
  garment: Garment;
  selectedColor: ColorOption;
  selectedSize: string;
  currentView: ViewType;
  layers: Record<ViewType, Layer[]>;
}
```

**Storage:** `localStorage['aiwear:sessions']` → JSON array (máx. 5 sesiones)

### SessionSummary (para lista UI)
```typescript
interface SessionSummary {
  id: string;
  updatedAt: number;
  createdAt: number;
  garmentName: string;
  garmentEmoji?: string;
  colorHex: string;
  layerCount: number;    // suma de todas las vistas
}
```

---

## Entidad: RateLimitState (localStorage)

```typescript
interface RateLimitState {
  fingerprint: string;   // 'fp_<hash>'
  windowStart: number;   // inicio del período de 24h (ms timestamp)
  used: number;          // generaciones consumidas en el período
  unlockedUntil?: number; // timestamp de expiración del unlock por compra
}
```

**Storage key:** `aiwear:rateLimit`  
**FREE_DAILY_LIMIT = 10** generaciones/día

---

## Entidad: ReferralSummary (localStorage)

```typescript
interface InvitationEvent {
  inviteeId: string;                          // hash ofuscado
  status: 'visited' | 'designed' | 'purchased';
  ts: number;
  orderId?: string;
}

interface CreditLedgerEntry {
  ts: number;
  amount: number;     // COP
  reason: string;
  refOf?: string;     // código del referido si aplica
}
```

**Storage keys:**
- `aiwear:referrals:myCode` — código del usuario actual
- `aiwear:referrals:referredBy` — código de quien lo invitó
- `aiwear:referrals:invitations` — eventos de invitaciones enviadas
- `aiwear:referrals:credits` — créditos acumulados (COP)
- `aiwear:referrals:creditLedger` — historial de movimientos

**REFERRAL_REWARD_COP = 20.000**

---

## Entidad: QualityReport (en memoria)

```typescript
interface QualityReport {
  score: 'excellent' | 'acceptable' | 'issues';
  errorCount: number;
  warningCount: number;
  issues: QualityIssue[];
}

interface QualityIssue {
  id: string;
  type: IssueType;
  severity: 'error' | 'warning';
  view: ViewType;
  layerId: string;
  layerName: string;
  title: string;
  description: string;
  fix?: { label: string; patch: QualityFix };
}
```

No persiste en localStorage; se recalcula en cada render del hook `usePrintQuality`.

---

## Entidad: AppState (Zustand — en memoria)

Representa el estado completo de la sesión activa:

```
AppState = SessionState + ProductState + DesignState + UI State
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user` | `{ id, email, isGuest } \| null` | Identidad (guest por defecto) |
| `garment` | `Garment` | Prenda activa |
| `selectedColor` | `ColorOption` | Color seleccionado |
| `selectedSize` | `string` | Talla seleccionada |
| `decorationMethod` | `'DTG' \| 'ScreenPrint' \| 'Embroidery'` | Técnica de decoración |
| `currentView` | `ViewType` | Vista activa en el canvas |
| `activeLayerId` | `string \| null` | Capa seleccionada |
| `layers` | `Record<ViewType, Layer[]>` | Capas por vista |
| `history` | `LayersSnapshot[]` | Historial undo (máx 30) |
| `redoStack` | `LayersSnapshot[]` | Pila redo (máx 30) |
| `customZones` | `Record<string, ZoneOverride>` | Overrides de insets |
| `customZoneEntries` | `Record<string, CustomZoneEntry[]>` | Zonas adicionales |
| `editingZoneId` | `string \| null` | Zona en edición activa |
| `canvasStageSize` | `{ width, height }` | Dimensiones del stage (default 240×330) |
| `uploadDraft` | `UploadDraft \| null` | Estado temporal de upload |

---

## Esquema de Colores del Catálogo

### STANDARD_COLORS (t-shirts, polo, tank, long-sleeve)
| Nombre | Hex | Premium |
|--------|-----|---------|
| White | #FFFFFF | No |
| Black | #0F172A | No |
| Navy | #1B2735 | No |
| Red | #E21A1A | No |
| Stone | #D6D3D1 | Sí |
| Olive | #65735A | Sí |
| Sand | #E7D5B7 | Sí |
| Pink | #FBCFE8 | Sí |

### HOODIE_COLORS (hoodie, sweatshirt, joggers)
| Nombre | Hex | Premium |
|--------|-----|---------|
| Heather Gray | #A8A8A8 | No |
| Black | #0F172A | No |
| Navy | #1B2735 | No |
| Cream | #FAF7F0 | No |
| Forest | #1F3D2B | Sí |
| Burgundy | #7C2D12 | Sí |
| Pink | #FBCFE8 | Sí |
| Olive | #65735A | Sí |

### NEUTRAL_COLORS (shorts, cap)
| Nombre | Hex | Premium |
|--------|-----|---------|
| Black | #0F172A | No |
| Navy | #1B2735 | No |
| Gray | #94A3B8 | No |
| White | #FFFFFF | No |
| Khaki | #A89F6E | Sí |
