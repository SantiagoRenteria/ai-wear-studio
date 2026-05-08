// HU-15.2 — Validacion de direcciones sin dependencias externas.
//
// Tres capas:
//   1. Catalogo de paises soportados con regex de codigo postal.
//   2. Catalogo de departamentos/estados (Colombia, Mexico, US) con sus
//      ciudades principales — autocompletado simple sin Google Places.
//   3. Funcion validateAddress() que devuelve issues por campo.
//
// El proposito principal: reducir devoluciones por direcciones imposibles
// (ej. "ZIP 99999 Bogota Colombia") sin gastar en una API.

export interface CountryCode {
  code: string;       // ISO-2
  name: string;
  postalRegex: RegExp;
  postalExample: string;
  postalLabel: string;
}

export const SUPPORTED_COUNTRIES: CountryCode[] = [
  {
    code: 'CO',
    name: 'Colombia',
    postalRegex: /^\d{6}$/,
    postalExample: '110111',
    postalLabel: 'Codigo postal',
  },
  {
    code: 'MX',
    name: 'Mexico',
    postalRegex: /^\d{5}$/,
    postalExample: '06600',
    postalLabel: 'C.P.',
  },
  {
    code: 'US',
    name: 'United States',
    postalRegex: /^\d{5}(-\d{4})?$/,
    postalExample: '90210',
    postalLabel: 'ZIP',
  },
  {
    code: 'AR',
    name: 'Argentina',
    postalRegex: /^[A-Z]?\d{4}[A-Z]{0,3}$/i,
    postalExample: 'C1425',
    postalLabel: 'Codigo postal',
  },
  {
    code: 'CL',
    name: 'Chile',
    postalRegex: /^\d{7}$/,
    postalExample: '7500000',
    postalLabel: 'Codigo postal',
  },
  {
    code: 'PE',
    name: 'Peru',
    postalRegex: /^\d{5}$/,
    postalExample: '15001',
    postalLabel: 'Codigo postal',
  },
];

/* Catalogo de departamentos + ciudades. Solo lo mas importante; en produccion
   se carga desde un JSON estatico mas extenso. */
export const REGIONS: Record<string, { name: string; cities: string[] }[]> = {
  CO: [
    { name: 'Cundinamarca', cities: ['Bogota', 'Soacha', 'Chia', 'Zipaquira', 'Facatativa', 'Funza'] },
    { name: 'Antioquia', cities: ['Medellin', 'Envigado', 'Bello', 'Itagui', 'Sabaneta', 'Rionegro'] },
    { name: 'Valle del Cauca', cities: ['Cali', 'Palmira', 'Buenaventura', 'Tulua', 'Yumbo'] },
    { name: 'Atlantico', cities: ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia'] },
    { name: 'Bolivar', cities: ['Cartagena', 'Magangue', 'Turbaco'] },
    { name: 'Santander', cities: ['Bucaramanga', 'Floridablanca', 'Giron', 'Piedecuesta'] },
    { name: 'Norte de Santander', cities: ['Cucuta', 'Villa del Rosario', 'Los Patios'] },
    { name: 'Risaralda', cities: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'] },
    { name: 'Caldas', cities: ['Manizales', 'Villamaria'] },
    { name: 'Quindio', cities: ['Armenia', 'Calarca'] },
    { name: 'Tolima', cities: ['Ibague', 'Espinal', 'Honda'] },
    { name: 'Huila', cities: ['Neiva', 'Pitalito'] },
    { name: 'Meta', cities: ['Villavicencio', 'Acacias'] },
    { name: 'Boyaca', cities: ['Tunja', 'Duitama', 'Sogamoso'] },
    { name: 'Cauca', cities: ['Popayan'] },
    { name: 'Narino', cities: ['Pasto', 'Ipiales'] },
    { name: 'Cesar', cities: ['Valledupar'] },
    { name: 'Magdalena', cities: ['Santa Marta', 'Cienaga'] },
    { name: 'Cordoba', cities: ['Monteria'] },
  ],
  MX: [
    { name: 'CDMX', cities: ['Ciudad de Mexico', 'Coyoacan', 'Iztapalapa'] },
    { name: 'Jalisco', cities: ['Guadalajara', 'Zapopan', 'Tlaquepaque'] },
    { name: 'Nuevo Leon', cities: ['Monterrey', 'San Pedro Garza Garcia'] },
    { name: 'Puebla', cities: ['Puebla'] },
  ],
  US: [
    { name: 'CA', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'] },
    { name: 'NY', cities: ['New York', 'Brooklyn', 'Queens', 'Bronx', 'Buffalo'] },
    { name: 'TX', cities: ['Austin', 'Dallas', 'Houston', 'San Antonio'] },
    { name: 'FL', cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'] },
  ],
  AR: [{ name: 'Buenos Aires', cities: ['Buenos Aires', 'La Plata', 'Mar del Plata'] }],
  CL: [{ name: 'Region Metropolitana', cities: ['Santiago', 'Las Condes'] }],
  PE: [{ name: 'Lima', cities: ['Lima', 'Callao'] }],
};

export interface AddressInput {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface FieldIssue {
  field: keyof AddressInput;
  level: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: FieldIssue[];
  countryCode: CountryCode | null;
}

function findCountry(input: string): CountryCode | null {
  const lc = input.trim().toLowerCase();
  return (
    SUPPORTED_COUNTRIES.find((c) => c.name.toLowerCase() === lc) ||
    SUPPORTED_COUNTRIES.find((c) => c.code.toLowerCase() === lc) ||
    null
  );
}

export function validateAddress(input: AddressInput): ValidationResult {
  const issues: FieldIssue[] = [];

  if (!input.address.trim()) {
    issues.push({ field: 'address', level: 'error', message: 'La direccion es obligatoria.' });
  } else if (input.address.trim().length < 6) {
    issues.push({ field: 'address', level: 'warning', message: 'La direccion parece muy corta.' });
  }

  if (!input.city.trim()) {
    issues.push({ field: 'city', level: 'error', message: 'La ciudad es obligatoria.' });
  }

  const country = findCountry(input.country);
  if (!country) {
    issues.push({
      field: 'country',
      level: 'error',
      message: 'Pais no soportado todavia. Disponibles: ' +
        SUPPORTED_COUNTRIES.map((c) => c.name).join(', '),
    });
  } else {
    // Validamos zip por regex del pais.
    if (!input.zip.trim()) {
      issues.push({
        field: 'zip',
        level: 'error',
        message: 'El ' + country.postalLabel + ' es obligatorio.',
      });
    } else if (!country.postalRegex.test(input.zip.trim())) {
      issues.push({
        field: 'zip',
        level: 'error',
        message: country.postalLabel + ' invalido. Ej: ' + country.postalExample,
      });
    }

    // Validamos coherencia ciudad/estado.
    const regions = REGIONS[country.code] ?? [];
    const matchedRegion = regions.find(
      (r) => r.name.toLowerCase() === input.state.trim().toLowerCase(),
    );
    if (input.state.trim() && regions.length > 0 && !matchedRegion) {
      issues.push({
        field: 'state',
        level: 'warning',
        message: 'Departamento/estado no reconocido para ' + country.name + '.',
      });
    }
    if (matchedRegion && input.city.trim()) {
      const cityMatches = matchedRegion.cities.some(
        (c) => c.toLowerCase() === input.city.trim().toLowerCase(),
      );
      if (!cityMatches) {
        issues.push({
          field: 'city',
          level: 'warning',
          message:
            'No reconocemos "' +
            input.city +
            '" en ' +
            matchedRegion.name +
            '. Revisa la ortografia.',
        });
      }
    }
  }

  const ok = !issues.some((i) => i.level === 'error');
  return { ok, issues, countryCode: country };
}

/** Sugerencias de ciudad para un pais+departamento. Filtradas por prefijo. */
export function citySuggestions(
  countryName: string,
  stateName: string,
  query: string,
  limit: number = 6,
): string[] {
  const country = findCountry(countryName);
  if (!country) return [];
  const regions = REGIONS[country.code] ?? [];
  const region = regions.find(
    (r) => r.name.toLowerCase() === stateName.trim().toLowerCase(),
  );
  const pool = region ? region.cities : regions.flatMap((r) => r.cities);
  const q = query.trim().toLowerCase();
  if (!q) return pool.slice(0, limit);
  return pool
    .filter((c) => c.toLowerCase().startsWith(q))
    .slice(0, limit);
}

/** URL de OpenStreetMap embed centrada en una direccion (sin API key). */
export function osmEmbedUrl(address: string, city: string, country: string): string {
  const q = encodeURIComponent([address, city, country].filter(Boolean).join(', '));
  // Bbox amplia + marker. La OSM-search se hace via Nominatim en el iframe.
  return 'https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik&marker=0,0' +
    '&query=' + q;
}
