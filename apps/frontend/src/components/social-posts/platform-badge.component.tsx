'use client';

import React from 'react';
import type { SocialPlatform } from './social-posts.types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from './social-posts.types';

export function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  const color = PLATFORM_COLORS[platform] || 'bg-newSettings text-textItemBlur';
  return (
    <span className={`inline-flex items-center px-[8px] py-[3px] rounded-[6px] text-[11px] font-[600] ${color}`}>
      {PLATFORM_LABELS[platform] || platform}
    </span>
  );
}
