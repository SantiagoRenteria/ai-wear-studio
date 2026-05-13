import React, { useState, useMemo } from 'react';
import { Search, ArrowLeft, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PlacementZone } from '../types';

/**
 * ArtTool — HU-3.1
 *
 * Catálogo de arte categorizado. Para MVP usa emojis unicode (rendering nativo
 * en Konva como texto). Sprint posterior reemplazará con SVGs vectoriales.
 *
 * Categorías curadas con búsqueda live.
 */

interface ArtItem {
  emoji: string;
  keywords: string[];
}

interface Category {
  id: string;
  label: string;
  icon: string;
  items: ArtItem[];
}

const CATEGORIES: Category[] = [
  {
    id: 'popular',
    label: 'Populares',
    icon: '⭐',
    items: [
      { emoji: '❤️', keywords: ['corazon', 'amor', 'rojo'] },
      { emoji: '⭐', keywords: ['estrella', 'star'] },
      { emoji: '🔥', keywords: ['fuego', 'fire', 'hot'] },
      { emoji: '✨', keywords: ['brillo', 'magia'] },
      { emoji: '💎', keywords: ['diamante', 'joya'] },
      { emoji: '👑', keywords: ['corona', 'rey'] },
      { emoji: '☀️', keywords: ['sol', 'sun'] },
      { emoji: '🌙', keywords: ['luna', 'moon'] },
      { emoji: '⚡', keywords: ['rayo', 'electrico'] },
      { emoji: '🌈', keywords: ['arcoiris'] },
      { emoji: '🎯', keywords: ['diana', 'objetivo'] },
      { emoji: '💀', keywords: ['calavera', 'skull'] },
    ],
  },
  {
    id: 'animals',
    label: 'Animales',
    icon: '🐱',
    items: [
      { emoji: '🐶', keywords: ['perro', 'dog'] },
      { emoji: '🐱', keywords: ['gato', 'cat'] },
      { emoji: '🦊', keywords: ['zorro', 'fox'] },
      { emoji: '🐻', keywords: ['oso', 'bear'] },
      { emoji: '🐼', keywords: ['panda'] },
      { emoji: '🦁', keywords: ['leon', 'lion'] },
      { emoji: '🐯', keywords: ['tigre'] },
      { emoji: '🐸', keywords: ['rana', 'frog'] },
      { emoji: '🦄', keywords: ['unicornio'] },
      { emoji: '🐉', keywords: ['dragon'] },
      { emoji: '🐝', keywords: ['abeja', 'bee'] },
      { emoji: '🦋', keywords: ['mariposa'] },
      { emoji: '🐢', keywords: ['tortuga'] },
      { emoji: '🐬', keywords: ['delfin'] },
      { emoji: '🦅', keywords: ['aguila'] },
      { emoji: '🦉', keywords: ['buho'] },
    ],
  },
  {
    id: 'nature',
    label: 'Naturaleza',
    icon: '🌸',
    items: [
      { emoji: '🌸', keywords: ['flor', 'rosa'] },
      { emoji: '🌹', keywords: ['rosa'] },
      { emoji: '🌻', keywords: ['girasol'] },
      { emoji: '🌷', keywords: ['tulipan'] },
      { emoji: '🌴', keywords: ['palma', 'palmera'] },
      { emoji: '🌵', keywords: ['cactus'] },
      { emoji: '🌲', keywords: ['arbol', 'pino'] },
      { emoji: '🍀', keywords: ['trebol'] },
      { emoji: '🌍', keywords: ['planeta', 'tierra'] },
      { emoji: '🌊', keywords: ['ola', 'mar'] },
      { emoji: '🏔️', keywords: ['montana'] },
      { emoji: '🌋', keywords: ['volcan'] },
    ],
  },
  {
    id: 'food',
    label: 'Comida',
    icon: '🍕',
    items: [
      { emoji: '🍕', keywords: ['pizza'] },
      { emoji: '🍔', keywords: ['hamburguesa'] },
      { emoji: '🌮', keywords: ['taco'] },
      { emoji: '🍣', keywords: ['sushi'] },
      { emoji: '🍩', keywords: ['donut'] },
      { emoji: '🍦', keywords: ['helado'] },
      { emoji: '🍰', keywords: ['pastel'] },
      { emoji: '🍫', keywords: ['chocolate'] },
      { emoji: '☕', keywords: ['cafe'] },
      { emoji: '🍺', keywords: ['cerveza'] },
      { emoji: '🥑', keywords: ['aguacate'] },
      { emoji: '🍓', keywords: ['fresa'] },
    ],
  },
  {
    id: 'sports',
    label: 'Deportes',
    icon: '⚽',
    items: [
      { emoji: '⚽', keywords: ['futbol', 'soccer'] },
      { emoji: '🏀', keywords: ['baloncesto'] },
      { emoji: '🏈', keywords: ['football americano'] },
      { emoji: '🎾', keywords: ['tenis'] },
      { emoji: '⚾', keywords: ['beisbol'] },
      { emoji: '🏐', keywords: ['voleibol'] },
      { emoji: '🥊', keywords: ['boxeo'] },
      { emoji: '🏆', keywords: ['trofeo'] },
      { emoji: '🎯', keywords: ['dardo'] },
      { emoji: '🏋️', keywords: ['gym', 'pesas'] },
      { emoji: '🏃', keywords: ['correr', 'running'] },
      { emoji: '🚴', keywords: ['ciclismo'] },
    ],
  },
  {
    id: 'celebration',
    label: 'Fiestas',
    icon: '🎉',
    items: [
      { emoji: '🎉', keywords: ['fiesta', 'party'] },
      { emoji: '🎂', keywords: ['cumpleanos', 'pastel'] },
      { emoji: '🎁', keywords: ['regalo'] },
      { emoji: '🎈', keywords: ['globo'] },
      { emoji: '🎊', keywords: ['confeti'] },
      { emoji: '🎓', keywords: ['graduacion'] },
      { emoji: '💍', keywords: ['anillo', 'boda'] },
      { emoji: '🏅', keywords: ['medalla'] },
      { emoji: '🎵', keywords: ['musica', 'nota'] },
      { emoji: '🎸', keywords: ['guitarra'] },
      { emoji: '🎤', keywords: ['microfono'] },
      { emoji: '🎮', keywords: ['videojuego'] },
    ],
  },
];

interface ArtToolProps {
  onClose: () => void;
}

export function ArtTool({ onClose }: ArtToolProps) {
  const store = useStore();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const activeCategory = activeCategoryId
    ? CATEGORIES.find((c) => c.id === activeCategoryId) || null
    : null;

  // Si hay búsqueda, devuelve resultados de TODAS las categorías
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const all = CATEGORIES.flatMap((c) => c.items);
    return all.filter(
      (item) =>
        item.emoji.includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [search]);

  const handleAdd = (emoji: string) => {
    store.addLayer(store.currentView, {
      type: 'text',
      content: emoji,
      x: 50,
      y: 50,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      color: '#000000',
      fontSize: 100,
      fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
      fontWeight: 'normal',
      textAlign: 'center',
      placementZone: PlacementZone.CenterChest,
      name: emoji,
    });
    onClose();
  };

  const renderItems = (items: ArtItem[]) => (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map((item, i) => (
        <button
          key={item.emoji + i}
          type="button"
          onClick={() => handleAdd(item.emoji)}
          className="aspect-square rounded-lg bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 transition-all flex items-center justify-center text-3xl hover:scale-110 active:scale-95"
          title={item.keywords[0]}
        >
          {item.emoji}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar arte..."
          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all placeholder:text-slate-400 font-medium"
        />
      </div>

      {/* Search results */}
      {searchResults !== null && (
        <section>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
            Resultados ({searchResults.length})
          </label>
          {searchResults.length > 0 ? (
            renderItems(searchResults)
          ) : (
            <div className="py-10 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Sin resultados
            </div>
          )}
        </section>
      )}

      {/* Category list (when no search and no active category) */}
      {searchResults === null && !activeCategory && (
        <section>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">
            Categorias
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className="group flex flex-col items-center gap-2 py-4 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30 hover:shadow-sm transition-all"
              >
                <span className="text-3xl leading-none group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  {cat.label}
                </span>
                <span className="text-[8.5px] font-bold uppercase text-slate-400">
                  {cat.items.length} items
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Items inside a category */}
      {searchResults === null && activeCategory && (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setActiveCategoryId(null)}
            className="flex items-center gap-1.5 text-[10px] font-black text-violet-600 uppercase tracking-widest hover:text-violet-700 transition-colors"
          >
            <ArrowLeft size={12} />
            Categorias
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeCategory.icon}</span>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
              {activeCategory.label}
            </h3>
          </div>
          {renderItems(activeCategory.items)}
        </section>
      )}

      {/* Trending teaser */}
      {searchResults === null && !activeCategory && (
        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3.5 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-md shadow-violet-500/20">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-900 leading-tight">
              ¿No ves lo que quieres?
            </p>
            <p className="text-[9.5px] text-slate-500 mt-0.5 leading-snug">
              Genera un diseno unico con IA en el panel anterior.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
