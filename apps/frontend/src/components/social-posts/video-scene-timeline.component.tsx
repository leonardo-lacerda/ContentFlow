'use client';

import React from 'react';
import type { VideoScene } from './video-scripts.types';

const SCENE_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-lime-500',
];

export function VideoSceneTimeline({
  scenes,
  activeIndex,
  onSceneClick,
}: {
  scenes: VideoScene[];
  activeIndex?: number;
  onSceneClick?: (index: number) => void;
}) {
  if (!scenes.length) return null;

  const totalDuration = scenes.reduce((acc, s) => acc + (s.durationSec || 0), 0);
  if (totalDuration === 0) return null;

  return (
    <div className="flex gap-0.5 h-8 rounded-lg overflow-hidden">
      {scenes.map((scene, i) => {
        const pct = ((scene.durationSec || 0) / totalDuration) * 100;
        const color = SCENE_COLORS[i % SCENE_COLORS.length];
        const isActive = activeIndex === i;

        return (
          <div
            key={scene.index ?? i}
            className={`relative group cursor-pointer transition-all ${color} ${
              isActive ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-transparent' : 'opacity-60 hover:opacity-90'
            }`}
            style={{ width: `${Math.max(pct, 2)}%` }}
            onClick={() => onSceneClick?.(i)}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Cena {i + 1} · {scene.durationSec || 0}s
            </div>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80">
              {i + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
