'use client';

import React from 'react';
import type { SocialPlatform } from './social-posts.types';

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  threads: 'Threads',
  facebook: 'Facebook',
};

export function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  return (
    <span className="inline-flex items-center px-[8px] py-[3px] rounded-[6px] text-[11px] font-[600] bg-newSettings border border-newTableBorder text-newTextColor capitalize">
      {PLATFORM_LABEL[platform] || platform}
    </span>
  );
}
