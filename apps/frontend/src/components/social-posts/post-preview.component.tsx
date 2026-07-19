'use client';

import React from 'react';
import type { GeneratedSocialPost } from './social-posts.types';
import { PlatformBadge } from './platform-badge.component';

export function PostPreview({ post }: { post: GeneratedSocialPost }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center justify-between gap-[8px]">
        <PlatformBadge platform={post.platform} />
        <span className="text-[11px] text-textItemBlur">
          {post.charCount} chars
        </span>
      </div>
      <div className="whitespace-pre-wrap text-[13px] text-newTextColor leading-relaxed">
        {post.content}
      </div>
      {post.hashtags?.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {post.hashtags.map((tag, i) => (
            <span
              key={i}
              className="text-[11px] px-[8px] py-[3px] rounded-[6px] bg-newSettings border border-newTableBorder text-textItemBlur"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
      {post.cta ? (
        <div className="text-[12px] font-[600] text-newTextColor">
          CTA: {post.cta}
        </div>
      ) : null}
      {post.tone ? (
        <div className="text-[11px] text-textItemBlur italic">Tom: {post.tone}</div>
      ) : null}
      {post.notes ? (
        <div className="text-[12px] text-amber-400/90">{post.notes}</div>
      ) : null}
    </div>
  );
}
