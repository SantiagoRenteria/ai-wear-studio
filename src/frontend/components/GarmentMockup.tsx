import React from 'react';
import { ViewType, GarmentType } from '../types';

/**
 * GarmentMockup — SVG vectorial de las 9 prendas del catálogo.
 * Reacciona a tipo, vista, color y size scale (HU-7.3).
 */

interface GarmentMockupProps {
  type: GarmentType;
  view: ViewType;
  colorHex: string;
  sizeScale?: number;
  className?: string;
}

function isDark(hex: string): boolean {
  if (!hex) return false;
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export function GarmentMockup({ type, view, colorHex, sizeScale = 1, className }: GarmentMockupProps) {
  const dark = isDark(colorHex);
  const stroke = dark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.18)';
  const seamColor = dark ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.22)';
  const id = React.useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{
        filter: 'drop-shadow(0 30px 40px rgba(15,23,42,0.18))',
        transform: 'scale(' + sizeScale + ')',
        transformOrigin: 'center',
        transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <defs>
        <linearGradient id={'shade-' + id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity={dark ? 0 : 0.04} />
          <stop offset="60%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={dark ? 0.35 : 0.14} />
        </linearGradient>
        <radialGradient id={'hi-' + id} cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity={dark ? 0.10 : 0.18} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={'side-' + id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity={dark ? 0.30 : 0.10} />
          <stop offset="20%" stopColor="#000" stopOpacity={0} />
          <stop offset="80%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={dark ? 0.30 : 0.10} />
        </linearGradient>
      </defs>
      {render({ type, view, colorHex, stroke, seamColor, id, dark })}
    </svg>
  );
}

interface RArgs {
  type: GarmentType; view: ViewType; colorHex: string;
  stroke: string; seamColor: string; id: string; dark: boolean;
}

function render(a: RArgs) {
  if (a.view === 'left_sleeve' || a.view === 'right_sleeve') {
    if (a.type === 'shorts' || a.type === 'sweatpants' || a.type === 'cap') {
      // No sleeves on these
      return <NoSleeveLabel {...a} />;
    }
    return <SleeveView {...a} />;
  }
  switch (a.type) {
    case 'hoodie': return <HoodieView {...a} />;
    case 'sweatshirt': return <SweatshirtView {...a} />;
    case 'polo': return <PoloView {...a} />;
    case 'tank-top': return <TankView {...a} />;
    case 'long-sleeve': return <LongSleeveView {...a} />;
    case 'shorts': return <ShortsView {...a} />;
    case 'sweatpants': return <SweatpantsView {...a} />;
    case 'cap': return <CapView {...a} />;
    default: return <TShirtView {...a} />;
  }
}

function fillBody(d: string, a: RArgs) {
  return (
    <>
      <path d={d} fill={a.colorHex} stroke={a.stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <path d={d} fill={'url(#shade-' + a.id + ')'} />
      <path d={d} fill={'url(#hi-' + a.id + ')'} />
      <path d={d} fill={'url(#side-' + a.id + ')'} />
    </>
  );
}

function TShirtView({ view, ...a }: RArgs) {
  const body =
    'M180 110 L100 145 L60 240 L130 270 L150 250 L150 540 L450 540 L450 250 L470 270 L540 240 L500 145 L420 110 L370 95 ' +
    (view === 'front' ? 'Q300 165 230 95 Z' : 'Q300 110 230 95 Z');
  return (
    <g>
      {fillBody(body, { ...a, view } as RArgs)}
      <path d={view === 'front' ? 'M230 95 Q300 165 370 95 Q360 110 300 115 Q240 110 230 95 Z' : 'M230 95 Q300 110 370 95 Q360 100 300 102 Q240 100 230 95 Z'}
        fill={a.dark ? 'rgba(0,0,0,0.35)' : 'rgba(15,23,42,0.10)'} />
      <line x1="155" y1="265" x2="155" y2="535" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
      <line x1="445" y1="265" x2="445" y2="535" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
      <line x1="150" y1="525" x2="450" y2="525" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
      {view === 'back' && <rect x="285" y="115" width="30" height="14" rx="2" fill={a.dark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.12)'} />}
    </g>
  );
}

function PoloView({ view, ...a }: RArgs) {
  const body =
    'M180 115 L100 150 L60 245 L130 275 L150 255 L150 545 L450 545 L450 255 L470 275 L540 245 L500 150 L420 115 L370 100 ' +
    (view === 'front' ? 'Q300 130 230 100 Z' : 'Q300 110 230 100 Z');
  return (
    <g>
      {fillBody(body, { ...a, view } as RArgs)}
      {/* Cuello de polo (V con botones) */}
      {view === 'front' && (
        <>
          <path d="M270 100 L300 155 L330 100 L320 105 L300 145 L280 105 Z" fill={a.dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)'} />
          <circle cx="300" cy="125" r="2" fill={a.dark ? '#fff' : '#1f2937'} />
          <circle cx="300" cy="145" r="2" fill={a.dark ? '#fff' : '#1f2937'} />
        </>
      )}
      <line x1="155" y1="270" x2="155" y2="540" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
      <line x1="445" y1="270" x2="445" y2="540" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
    </g>
  );
}

function TankView({ view, ...a }: RArgs) {
  const body = (view === 'front'
    ? 'M210 100 L170 130 L150 250 L150 540 L450 540 L450 250 L430 130 L390 100 L370 95 Q300 175 230 95 Z'
    : 'M210 100 L170 130 L150 250 L150 540 L450 540 L450 250 L430 130 L390 100 L370 95 Q300 110 230 95 Z'
  );
  return (
    <g>
      {fillBody(body, { ...a, view } as RArgs)}
      <line x1="155" y1="260" x2="155" y2="535" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
      <line x1="445" y1="260" x2="445" y2="535" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
    </g>
  );
}

function LongSleeveView({ view, ...a }: RArgs) {
  // como camiseta pero con mangas hasta la muñeca
  const body =
    'M180 110 L80 155 L40 530 L130 555 L150 540 L150 540 L450 540 L450 540 L470 555 L560 530 L520 155 L420 110 L370 95 ' +
    (view === 'front' ? 'Q300 165 230 95 Z' : 'Q300 110 230 95 Z');
  return (
    <g>
      {fillBody(body, { ...a, view } as RArgs)}
      {/* Puños (cuffs) */}
      <line x1="80" y1="540" x2="150" y2="540" stroke={a.seamColor} strokeWidth="2" />
      <line x1="450" y1="540" x2="520" y2="540" stroke={a.seamColor} strokeWidth="2" />
    </g>
  );
}

function HoodieView({ view, ...a }: RArgs) {
  const body =
    'M180 130 L90 165 L50 270 L120 305 L140 285 L140 545 L460 545 L460 285 L480 305 L550 270 L510 165 L420 130 L380 120 Q300 145 220 120 Z';
  const hood = view === 'front'
    ? 'M220 120 Q300 35 380 120 Q360 155 300 158 Q240 155 220 120 Z'
    : 'M220 120 Q300 30 380 120 Q360 100 300 95 Q240 100 220 120 Z';
  return (
    <g>
      <path d={hood} fill={a.colorHex} stroke={a.stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <path d={hood} fill={'url(#shade-' + a.id + ')'} />
      {fillBody(body, a as RArgs)}
      {view === 'front' && (
        <>
          <path d="M180 360 L420 360 L405 460 L195 460 Z" fill="none" stroke={a.seamColor} strokeWidth="1.4" strokeDasharray="2 3" strokeLinejoin="round" />
          <line x1="282" y1="135" x2="278" y2="200" stroke={a.dark ? '#f1f5f9' : '#1f2937'} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="318" y1="135" x2="322" y2="200" stroke={a.dark ? '#f1f5f9' : '#1f2937'} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="278" cy="202" r="3" fill={a.dark ? '#f1f5f9' : '#1f2937'} />
          <circle cx="322" cy="202" r="3" fill={a.dark ? '#f1f5f9' : '#1f2937'} />
        </>
      )}
      <line x1="140" y1="535" x2="460" y2="535" stroke={a.seamColor} strokeWidth="2" />
    </g>
  );
}

function SweatshirtView({ view, ...a }: RArgs) {
  const body =
    'M185 125 L95 160 L55 265 L125 300 L145 280 L145 545 L455 545 L455 280 L475 300 L545 265 L505 160 L415 125 L370 110 ' +
    (view === 'front' ? 'Q300 145 230 110 Z' : 'Q300 122 230 110 Z');
  return (
    <g>
      {fillBody(body, { ...a, view } as RArgs)}
      <path d={view === 'front' ? 'M230 110 Q300 145 370 110 L370 125 Q300 158 230 125 Z' : 'M230 110 Q300 122 370 110 L370 120 Q300 132 230 120 Z'}
        fill={a.dark ? 'rgba(0,0,0,0.30)' : 'rgba(15,23,42,0.12)'} />
      <line x1="148" y1="290" x2="148" y2="535" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
      <line x1="452" y1="290" x2="452" y2="535" stroke={a.seamColor} strokeWidth="1" strokeDasharray="2 3" />
      <line x1="145" y1="535" x2="455" y2="535" stroke={a.seamColor} strokeWidth="2" />
    </g>
  );
}

function ShortsView({ view, ...a }: RArgs) {
  const body =
    'M170 80 L430 80 L450 95 L450 350 L420 470 L320 470 L300 320 L280 470 L180 470 L150 350 L150 95 Z';
  return (
    <g>
      {fillBody(body, { ...a, view } as RArgs)}
      <line x1="300" y1="80" x2="300" y2="320" stroke={a.seamColor} strokeWidth="1" strokeDasharray="3 4" />
      {/* Cintura elástica */}
      <line x1="170" y1="100" x2="430" y2="100" stroke={a.seamColor} strokeWidth="2" />
      <text x="300" y="540" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="3" fill={a.dark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.4)'}>PANTALONETA</text>
    </g>
  );
}

function SweatpantsView({ view, ...a }: RArgs) {
  const body =
    'M180 50 L420 50 L440 65 L450 320 L420 540 L350 540 L320 320 L300 250 L280 320 L250 540 L180 540 L150 320 L160 65 Z';
  return (
    <g>
      {fillBody(body, { ...a, view } as RArgs)}
      <line x1="300" y1="50" x2="300" y2="250" stroke={a.seamColor} strokeWidth="1" strokeDasharray="3 4" />
      {/* Cintura elástica */}
      <line x1="180" y1="68" x2="420" y2="68" stroke={a.seamColor} strokeWidth="2" />
      {/* Bolsillos */}
      {view === 'front' && (
        <>
          <path d="M180 130 L240 175 L240 250 L180 200 Z" fill="none" stroke={a.seamColor} strokeWidth="1.2" strokeDasharray="2 3" />
          <path d="M420 130 L360 175 L360 250 L420 200 Z" fill="none" stroke={a.seamColor} strokeWidth="1.2" strokeDasharray="2 3" />
        </>
      )}
      {/* Puños */}
      <line x1="240" y1="540" x2="350" y2="540" stroke={a.seamColor} strokeWidth="2" />
    </g>
  );
}

function CapView({ view, ...a }: RArgs) {
  const crown = 'M150 280 Q150 130 300 130 Q450 130 450 280 L420 290 Q300 240 180 290 Z';
  const visor = 'M120 280 L480 280 L490 320 L110 320 Z';
  return (
    <g>
      {fillBody(crown, { ...a, view } as RArgs)}
      <path d={visor} fill={a.dark ? '#1a1a1a' : '#1f2937'} stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
      <path d={visor} fill={'url(#hi-' + a.id + ')'} opacity="0.3" />
      {/* Botón superior */}
      <circle cx="300" cy="135" r="6" fill={a.colorHex} stroke={a.stroke} strokeWidth="1" />
      {/* Costura del frente */}
      <path d="M225 270 L300 240 L375 270" fill="none" stroke={a.seamColor} strokeWidth="1.5" strokeDasharray="2 3" />
    </g>
  );
}

function SleeveView({ type, view, colorHex, stroke, seamColor, id, dark }: RArgs) {
  const isLeft = view === 'left_sleeve';
  const isLong = type === 'hoodie' || type === 'sweatshirt' || type === 'long-sleeve';
  const sleevePath = isLong
    ? (isLeft
      ? 'M120 150 L80 180 L60 530 L150 555 L240 540 L240 200 L210 165 Z'
      : 'M480 150 L520 180 L540 530 L450 555 L360 540 L360 200 L390 165 Z')
    : (isLeft
      ? 'M120 150 L80 200 L100 360 L200 380 L260 360 L260 220 L230 175 Z'
      : 'M480 150 L520 200 L500 360 L400 380 L340 360 L340 220 L370 175 Z');
  return (
    <g>
      <path d={sleevePath} fill={colorHex} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <path d={sleevePath} fill={'url(#shade-' + id + ')'} />
      <path d={sleevePath} fill={'url(#hi-' + id + ')'} />
      {isLong && <line x1={isLeft ? 60 : 360} y1={isLeft ? 530 : 540} x2={isLeft ? 240 : 540} y2={isLeft ? 540 : 530} stroke={seamColor} strokeWidth="2" />}
      <text x="300" y="115" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="3" fill={dark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.45)'}>
        {isLeft ? 'MANGA IZQUIERDA' : 'MANGA DERECHA'}
      </text>
    </g>
  );
}

function NoSleeveLabel({ dark }: RArgs) {
  return (
    <g>
      <rect x="100" y="200" width="400" height="200" rx="20" fill={dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.04)'} stroke="rgba(15,23,42,0.1)" strokeDasharray="4 4" />
      <text x="300" y="290" textAnchor="middle" fontSize="14" fontWeight="700" letterSpacing="3" fill={dark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.4)'}>
        ESTA PRENDA
      </text>
      <text x="300" y="320" textAnchor="middle" fontSize="14" fontWeight="700" letterSpacing="3" fill={dark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.4)'}>
        NO TIENE MANGAS
      </text>
    </g>
  );
}
