import React from 'react';
import { Shirt, Sparkles, Upload, Type, Shapes, Hash } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToolType = 'product' | 'ai' | 'upload' | 'text' | 'art' | 'names' | null;

interface LeftRailProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
}

const TOOLS = [
  { id: 'product', icon: Shirt, label: 'Producto' },
  { id: 'ai', icon: Sparkles, label: 'IA Design' },
  { id: 'upload', icon: Upload, label: 'Subir Logo' },
  { id: 'text', icon: Type, label: 'Texto' },
  { id: 'art', icon: Shapes, label: 'Arte' },
  { id: 'names', icon: Hash, label: 'Personalizar' },
] as const;

export function LeftRail({ activeTool, setActiveTool }: LeftRailProps) {
  return (
    <div className="w-20 bg-gradient-to-b from-violet-900 via-violet-800 to-fuchsia-900 flex flex-col items-center py-6 gap-6 z-50 shadow-xl">
      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-fuchsia-500/30 ring-1 ring-white/20">
        <span className="text-white font-black text-xl">S</span>
      </div>

      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
          className={cn(
            "group flex flex-col items-center gap-1.5 transition-all duration-200",
            activeTool === tool.id ? "text-white" : "text-violet-200/70 hover:text-white"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl transition-all duration-200",
            activeTool === tool.id
              ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-fuchsia-500/30 ring-1 ring-white/30"
              : "hover:bg-white/10"
          )}>
            <tool.icon size={22} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">{tool.label}</span>
        </button>
      ))}
    </div>
  );
}
