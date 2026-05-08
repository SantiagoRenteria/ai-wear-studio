// HU-15.2 — Formulario de direccion con autocomplete y validacion inline.
// Reemplaza los Field genericos del CheckoutPage para los campos de envio.

import { useMemo, useState } from 'react';
import { MapPin, AlertCircle, Check } from 'lucide-react';
import {
  SUPPORTED_COUNTRIES,
  REGIONS,
  citySuggestions,
  validateAddress,
  type AddressInput,
  type FieldIssue,
} from '../services/addressValidation';

// Aceptamos un form que extiende AddressInput con firstName/lastName.
type AddressFormShape = AddressInput & { firstName?: string; lastName?: string };

interface Props {
  form: AddressFormShape;
  onChange: (field: keyof AddressFormShape, value: string) => void;
}

function getIssue(issues: FieldIssue[], field: keyof AddressInput): FieldIssue | undefined {
  return issues.find((i) => i.field === field);
}

export function AddressFields({ form, onChange }: Props) {
  const validation = useMemo(() => validateAddress(form), [form]);
  const [cityFocused, setCityFocused] = useState(false);
  const country = validation.countryCode;
  const regions = country ? REGIONS[country.code] ?? [] : [];

  const suggestions = useMemo(
    () => citySuggestions(form.country, form.state, form.city),
    [form.country, form.state, form.city],
  );

  const inputBase =
    'w-full rounded-lg border px-3 py-2.5 text-sm bg-white outline-none transition-all focus:ring-2 focus:ring-violet-500 ';

  const renderError = (issue?: FieldIssue) =>
    issue && (
      <p
        className={
          'mt-1 flex items-center gap-1 text-[10px] font-medium ' +
          (issue.level === 'error' ? 'text-rose-600' : 'text-amber-600')
        }
      >
        <AlertCircle size={10} />
        {issue.message}
      </p>
    );

  const fieldClass = (issue?: FieldIssue) =>
    inputBase +
    (issue
      ? issue.level === 'error'
        ? 'border-rose-300 bg-rose-50/40'
        : 'border-amber-300 bg-amber-50/40'
      : 'border-slate-200');

  const addressIssue = getIssue(validation.issues, 'address');
  const cityIssue = getIssue(validation.issues, 'city');
  const stateIssue = getIssue(validation.issues, 'state');
  const zipIssue = getIssue(validation.issues, 'zip');
  const countryIssue = getIssue(validation.issues, 'country');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            Nombre <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.firstName ?? ''}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="Felipe"
            className={inputBase + 'border-slate-200'}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            Apellido
          </label>
          <input
            value={form.lastName ?? ''}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Quintero"
            className={inputBase + 'border-slate-200'}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            <MapPin size={11} /> Direccion <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="Calle 45 # 23-67, Apto 502"
            className={fieldClass(addressIssue)}
          />
          {renderError(addressIssue)}
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            Pais <span className="text-rose-500">*</span>
          </label>
          <select
            value={form.country}
            onChange={(e) => onChange('country', e.target.value)}
            className={fieldClass(countryIssue)}
          >
            <option value="">Selecciona un pais</option>
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          {renderError(countryIssue)}
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            Departamento / Estado
          </label>
          {regions.length > 0 ? (
            <select
              value={form.state}
              onChange={(e) => onChange('state', e.target.value)}
              className={fieldClass(stateIssue)}
            >
              <option value="">Selecciona</option>
              {regions.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={form.state}
              onChange={(e) => onChange('state', e.target.value)}
              placeholder={country ? 'Estado' : 'Selecciona pais primero'}
              className={fieldClass(stateIssue)}
              disabled={!country}
            />
          )}
          {renderError(stateIssue)}
        </div>

        <div className="relative">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            Ciudad <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.city}
            onChange={(e) => onChange('city', e.target.value)}
            onFocus={() => setCityFocused(true)}
            onBlur={() => setTimeout(() => setCityFocused(false), 150)}
            placeholder="Bogota"
            className={fieldClass(cityIssue)}
            autoComplete="off"
          />
          {cityFocused && suggestions.length > 0 && (
            <ul
              className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto"
              role="listbox"
            >
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange('city', s);
                      setCityFocused(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 hover:text-violet-700 flex items-center gap-2"
                  >
                    <MapPin size={11} className="text-slate-400" />
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {renderError(cityIssue)}
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            {country ? country.postalLabel : 'Codigo postal'} <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.zip}
            onChange={(e) => onChange('zip', e.target.value)}
            placeholder={country?.postalExample ?? '110111'}
            className={fieldClass(zipIssue)}
            inputMode="numeric"
          />
          {renderError(zipIssue)}
        </div>
      </div>

      {validation.ok && form.address && form.city && form.zip && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Check size={12} className="text-emerald-600" />
          <span className="text-[11px] font-medium text-emerald-700">
            Direccion valida — lista para envio.
          </span>
        </div>
      )}
    </div>
  );
}
