'use client';

import React from 'react';
import type { SocialPlatform } from './social-posts.types';

const PLATFORM_CONFIG: Record<SocialPlatform, { bg: string; text: string; icon: string }> = {
  instagram: { bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'text-white', icon: '📷' },
  linkedin:  { bg: 'bg-blue-700', text: 'text-white', icon: '💼' },
  tiktok:    { bg: 'bg-black', text: 'text-white', icon: '🎵' },
  twitter:   { bg: 'bg-sky-500', text: 'text-white', icon: '🐦' },
  threads:   { bg: 'bg-gray-900', text: 'text-white', icon: '🧵' },
  facebook:  { bg: 'bg-blue-600', text: 'text-white', icon: '👤' },
};

export function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  const config = PLATFORM_CONFIG[platform] || { bg: 'bg-gray-500', text: 'text-white', icon: '📱' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>
      <span className="capitalize">{platform}</span>
    </span>
  );
}
