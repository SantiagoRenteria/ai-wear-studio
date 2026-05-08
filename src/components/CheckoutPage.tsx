import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronLeft, ChevronRight, Check, Mail, Phone, MapPin, CreditCard,
  Lock, Truck, Sparkles, Plus, Minus, ShoppingBag,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ViewType } from '../types';
import { AddressFields } from './AddressFields';
import { validateAddress } from '../services/addressValidation';
import { rewardOnPurchase, REFERRAL_REWARD_COP } from '../services/referrals';

/**
 * CheckoutPage — HU-5.1 + HU-5.2 + HU-5.3
 *
 * Full-screen overlay con flujo de checkout one-page:
 *  - Stepper visual (Diseño → Datos → Pago)
 *  - Formulario con contacto + envío + método pago
 *  - Sticky order summary con thumbnail y desglose
 *  - Submit muestra success state (mock — sin backend real)
 */

interface CheckoutPageProps {
  onClose: () => void;
}

const PRINT_PER_ZONE_USD = 4;
const COLOR_PREMIUM_USD = 2;
const PREMIUM_COLORS = ['Olive', 'Pink', 'Sand', 'Stone'];
const SHIPPING_STANDARD_USD = 2;
const SHIPPING_EXPRESS_USD = 5;
const USD_TO_COP = 4100;

export function CheckoutPage({ onClose }: CheckoutPageProps) {
  const store = useStore();
  const [shipping, setShipping] = useState<'standard' | 'express'>('standard');
  const [payment, setPayment] = useState<'card' | 'pse' | 'nequi'>('card');
  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [quantity, setQuantity] = useState(1);
  const [coupon, setCoupon] = useState('');

  const [form, setForm] = useState({
    email: '',
    whatsapp: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: 'Cundinamarca',
    zip: '',
    country: 'Colombia',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  });

  const handleField = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const usedZones = useMemo(() => {
    const views: ViewType[] = ['front', 'back', 'left_sleeve', 'right_sleeve'];
    return views.filter((v) => store.layers[v].some((l) => !l.hidden)).length;
  }, [store.layers]);

  const isColorPremium = PREMIUM_COLORS.includes(store.selectedColor.name);
  const printingFee = usedZones * PRINT_PER_ZONE_USD;
  const colorPremium = isColorPremium ? COLOR_PREMIUM_USD : 0;
  const itemPriceUSD = store.garment.basePrice + printingFee + colorPremium;
  const subtotalUSD = itemPriceUSD * quantity;
  const shippingUSD = shipping === 'express' ? SHIPPING_EXPRESS_USD : SHIPPING_STANDARD_USD;
  const totalUSD = subtotalUSD + shippingUSD;

  const fmtUSD = (n: number) => '$' + n.toFixed(2) + ' USD';
  const fmtCOP = (n: number) => '$' + Math.round(n * USD_TO_COP).toLocaleString('es-CO') + ' COP';

  // Recoge primera capa visible para preview
  const previewLayer = useMemo(() => {
    for (const v of ['front', 'back', 'left_sleeve', 'right_sleeve'] as ViewType[]) {
      const visible = store.layers[v].filter((l) => !l.hidden);
      if (visible.length > 0) return visible[0];
    }
    return null;
  }, [store.layers]);

  const previewPrompt =
    previewLayer?.name ||
    (previewLayer?.type === 'text' ? previewLayer.content : 'Diseño personalizado');

  // HU-15.2 — validacion completa de direccion antes de habilitar pago.
  const addressValidation = useMemo(
    () => validateAddress({
      address: form.address, city: form.city, state: form.state,
      zip: form.zip, country: form.country,
    }),
    [form.address, form.city, form.state, form.zip, form.country],
  );
  const datosOk =
    !!form.email && !!form.whatsapp && !!form.firstName && addressValidation.ok;
  const isFormValid = datosOk;

  // Bug-fix UX: el stepper saltaba de 2 a 4. Cuando los datos están válidos
  // avanzamos automáticamente al paso 3 ("Pago") para reflejar el progreso real.
  React.useEffect(() => {
    if (step === 2 && datosOk) setStep(3);
    else if (step === 3 && !datosOk) setStep(2);
  }, [datosOk, step]);

  const handleSubmit = () => {
    if (!isFormValid) return;
    setStep(4);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-slate-50 overflow-y-auto"
      >
        {/* Top bar */}
        <header className="sticky top-0 z-10 h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft size={14} />
            Volver al diseño
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.25em] text-slate-800">
              AI Wear <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Studio</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header con título y stepper */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {step === 4 ? '¡Pedido confirmado!' : 'Finaliza tu compra'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {step === 4
                  ? 'Te enviaremos las actualizaciones por WhatsApp y email.'
                  : 'Compra como invitado · sin necesidad de crear cuenta.'}
              </p>
            </div>

            <Stepper step={step} />
          </div>

          {step === 4 ? <SuccessState onClose={onClose} email={form.email} /> : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* FORM */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                className="lg:col-span-7 space-y-5"
              >
                <Card title="Información de contacto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Email"
                      icon={Mail}
                      value={form.email}
                      onChange={(v) => handleField('email', v)}
                      placeholder="tu@email.com"
                      type="email"
                      required
                    />
                    <Field
                      label="WhatsApp"
                      icon={Phone}
                      value={form.whatsapp}
                      onChange={(v) => handleField('whatsapp', v)}
                      placeholder="+57 300 000 0000"
                      required
                    />
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    Quiero actualizaciones del pedido por WhatsApp
                  </label>
                </Card>

                <Card title="Direccion de envio">
                  <AddressFields form={form} onChange={(k, v) => handleField(k as keyof typeof form, v)} />
                </Card>

                <Card title="Método de envío">
                  <div className="space-y-2">
                    <ShippingOption
                      active={shipping === 'standard'}
                      onClick={() => setShipping('standard')}
                      title="Envío estándar"
                      desc="3 a 5 días hábiles"
                      price={fmtUSD(SHIPPING_STANDARD_USD)}
                    />
                    <ShippingOption
                      active={shipping === 'express'}
                      onClick={() => setShipping('express')}
                      title="Envío exprés"
                      desc="1 a 2 días hábiles"
                      price={fmtUSD(SHIPPING_EXPRESS_USD)}
                      badge="Rápido"
                    />
                  </div>
                </Card>

                <Card title="Método de pago">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { id: 'card' as const, label: 'Tarjeta', icon: CreditCard },
                      { id: 'pse' as const, label: 'PSE', icon: Lock },
                      { id: 'nequi' as const, label: 'Nequi', icon: Phone },
                    ].map((p) => {
                      const Icon = p.icon;
                      const active = payment === p.id;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setPayment(p.id)}
                          className={
                            'flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-all ' +
                            (active
                              ? 'border-violet-500 bg-violet-50/40 ring-2 ring-violet-200 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
                          }
                        >
                          <Icon size={18} />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {payment === 'card' && (
                    <div className="space-y-3">
                      <Field label="Número de tarjeta" value={form.cardNumber} onChange={(v) => handleField('cardNumber', v)} placeholder="4242 4242 4242 4242" />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Vencimiento" value={form.cardExpiry} onChange={(v) => handleField('cardExpiry', v)} placeholder="MM/AA" />
                        <Field label="CVC" value={form.cardCvc} onChange={(v) => handleField('cardCvc', v)} placeholder="123" />
                      </div>
                    </div>
                  )}
                </Card>

                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-violet-600 disabled:hover:to-fuchsia-500"
                >
                  <Lock size={14} />
                  Pagar {fmtUSD(totalUSD)}
                  <ChevronRight size={14} />
                </button>
                <p className="text-center text-[10px] text-slate-400">
                  Al continuar aceptas nuestros{' '}
                  <a className="underline hover:text-slate-600">términos</a> y{' '}
                  <a className="underline hover:text-slate-600">política de privacidad</a>.
                </p>
              </form>

              {/* ORDER SUMMARY */}
              <aside className="lg:col-span-5">
                <div className="sticky top-20 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center justify-between text-sm font-black uppercase tracking-widest text-slate-800">
                      Resumen del pedido
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600 normal-case">
                        {quantity} {quantity === 1 ? 'item' : 'items'}
                      </span>
                    </h3>

                    {/* Item */}
                    <div className="flex gap-3">
                      <div
                        className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 flex items-center justify-center"
                        style={{ backgroundColor: store.selectedColor.hex }}
                      >
                        {previewLayer?.type === 'text' ? (
                          <span className="text-3xl">{previewLayer.content}</span>
                        ) : previewLayer && (previewLayer.type === 'image' || previewLayer.type === 'ai') ? (
                          <img src={previewLayer.content} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <ShoppingBag size={20} className="text-slate-400" />
                        )}
                        <div className="absolute -right-1 -top-1 rounded-full bg-violet-600 p-1">
                          <Sparkles size={10} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {store.garment.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {store.selectedColor.name} · Talla {store.selectedSize}
                        </div>
                        <div className="mt-1 line-clamp-1 text-[11px] italic text-slate-500">
                          {previewPrompt}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5">
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              className="text-slate-500 hover:text-slate-900"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-1 text-xs font-bold">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => q + 1)}
                              className="text-slate-500 hover:text-slate-900"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="text-sm font-black">{fmtUSD(itemPriceUSD)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cupón */}
                    <div className="mt-5 flex gap-2">
                      <input
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        placeholder="Código de descuento"
                      />
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                      >
                        Aplicar
                      </button>
                    </div>

                    {/* Totales */}
                    <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                      <Row label="Subtotal" value={fmtUSD(subtotalUSD)} />
                      <Row
                        label={`Envío (${shipping === 'express' ? 'exprés' : 'estándar'})`}
                        value={fmtUSD(shippingUSD)}
                      />
                      <Row label="Impuestos" value="Incluidos" muted />
                      <div className="my-2 border-t border-dashed border-slate-200" />
                      <Row label="Total" value={fmtUSD(totalUSD)} bold />
                      <p className="text-[10px] text-slate-400 text-right">
                        ≈ {fmtCOP(totalUSD)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-50/60 p-3 text-[11px] text-violet-900">
                      <Sparkles size={14} className="flex-shrink-0 text-violet-600" />
                      Tu diseño es <strong>único</strong>: nadie más tendrá esta prenda exacta.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                    <div className="mb-2 flex items-center gap-1.5 font-bold text-slate-700 text-[10px] uppercase tracking-widest">
                      <Truck size={12} />
                      Entrega estimada
                    </div>
                    {shipping === 'express'
                      ? 'En 1 a 2 días hábiles después de la confirmación.'
                      : 'En 3 a 5 días hábiles después de la confirmación.'}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ----------------------- Subcomponentes ----------------------- */

function Stepper({ step }: { step: number }) {
  const steps = ['Diseño', 'Datos', 'Pago', 'Listo'];
  return (
    <div className="hidden sm:flex items-center gap-2">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <span
                className={
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ' +
                  (done
                    ? 'bg-violet-600 text-white'
                    : active
                    ? 'bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-md shadow-violet-500/30'
                    : 'bg-slate-100 text-slate-400')
                }
              >
                {done ? <Check size={13} /> : idx}
              </span>
              <span className={'text-[10px] font-black uppercase tracking-widest ' + (active ? 'text-slate-900' : 'text-slate-400')}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={'h-px w-6 ' + (done ? 'bg-violet-600' : 'bg-slate-200')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-800">{title}</h3>}
      {children}
    </div>
  );
}

function Field({
  label, icon: Icon, value, onChange, placeholder, type = 'text', required,
}: {
  label: string;
  icon?: any;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <span className="relative block">
        {Icon && (
          <Icon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={
            'w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ' +
            (Icon ? 'pl-9 pr-3' : 'px-3')
          }
        />
      </span>
    </label>
  );
}

function ShippingOption({
  active, onClick, title, desc, price, badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  price: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ' +
        (active
          ? 'border-violet-500 bg-violet-50/40 ring-2 ring-violet-200'
          : 'border-slate-200 bg-white hover:border-slate-300')
      }
    >
      <div className="flex items-center gap-3">
        <span
          className={
            'flex h-5 w-5 items-center justify-center rounded-full border-2 ' +
            (active ? 'border-violet-600' : 'border-slate-300')
          }
        >
          {active && <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />}
        </span>
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            {title}
            {badge && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black text-violet-700 uppercase tracking-widest">
                {badge}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">{desc}</div>
        </div>
      </div>
      <div className="text-sm font-bold text-slate-900">{price}</div>
    </button>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={(muted ? 'text-slate-400' : 'text-slate-600') + (bold ? ' font-black text-slate-900' : '')}>
        {label}
      </span>
      <span className={bold ? 'text-base font-black text-slate-900' : 'text-slate-900'}>
        {value}
      </span>
    </div>
  );
}

function SuccessState({ onClose, email }: { onClose: () => void; email: string }) {
  // HU-9.6 — disparamos credito al confirmar pedido (efecto idempotente).
  const [rewardInfo] = useState(() => {
    const orderId = 'ord_' + Date.now().toString(36);
    return rewardOnPurchase(orderId);
  });
  const fmtCOP = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-10 max-w-2xl mx-auto text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <Check size={32} className="text-white" />
      </div>
      <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
        Pedido confirmado
      </h2>
      <p className="text-sm text-slate-600 mb-1">
        Te enviamos los detalles a <strong>{email}</strong>.
      </p>
      {rewardInfo.rewardedSelf && (
        <div className="mt-4 mb-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 border border-violet-200 text-violet-800 text-xs font-bold">
          🎁 Bono de bienvenida: {fmtCOP(REFERRAL_REWARD_COP)} en credito desbloqueado
        </div>
      )}
      <p className="text-sm text-slate-500 mb-8">
        Recibirás actualizaciones por WhatsApp cuando tu prenda esté en producción y envío.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all"
        >
          Volver al diseño
        </button>
        <button className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:from-violet-700 hover:to-fuchsia-600 transition-all">
          Ver mi pedido
        </button>
      </div>
    </div>
  );
}
