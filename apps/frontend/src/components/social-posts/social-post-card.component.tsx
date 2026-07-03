'use client';

import React from 'react';
import type { GeneratedSocialPost } from './social-posts.types';
import { PostPreview } from './post-preview.component';

export function SocialPostCard({
  post,
  onUse,
}: {
  post: GeneratedSocialPost;
  onUse?: (post: GeneratedSocialPost) => void;
}) {
  return (
    <div className="relative">
      <PostPreview post={post} />
      {onUse && (
        <button
          onClick={() => onUse(post)}
          className="mt-2 px-3 py-1 text-white text-xs rounded transition-colors"
          style={{ background: 'var(--primary, #3b82f6)' }}
        >
          Create Draft
        </button>
      )}
    </div>
  );
}
