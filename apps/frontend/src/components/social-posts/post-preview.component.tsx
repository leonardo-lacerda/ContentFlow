'use client';

import React from 'react';
import type { GeneratedSocialPost } from './social-posts.types';
import { PlatformBadge } from './platform-badge.component';

export function PostPreview({ post }: { post: GeneratedSocialPost }) {
  return (
    <div className="border rounded-lg p-4 space-y-3" style={{ background: 'var(--background, white)' }}>
      <div className="flex items-center justify-between">
        <PlatformBadge platform={post.platform} />
        <span className="text-xs" style={{ color: 'var(--muted, #888)' }}>{post.charCount} chars</span>
      </div>
      <div className="whitespace-pre-wrap text-sm">{post.content}</div>
      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {post.hashtags.map((tag, i) => (
            <span key={i} className="text-xs" style={{ color: 'var(--primary, #3b82f6)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
      {post.cta && (
        <div className="text-xs font-medium" style={{ color: 'var(--success, #22c55e)' }}>
          CTA: {post.cta}
        </div>
      )}
      <div className="text-xs italic" style={{ color: 'var(--muted, #888)' }}>
        Tone: {post.tone}
      </div>
      {post.notes && (
        <div className="text-xs" style={{ color: 'var(--warning, #eab308)' }}>
          📝 {post.notes}
        </div>
      )}
    </div>
  );
}
