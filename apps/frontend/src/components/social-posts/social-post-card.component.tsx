'use client';

import React from 'react';
import type { GeneratedSocialPost } from './social-posts.types';
import { PostPreview } from './post-preview.component';

export function SocialPostCard({ post }: { post: GeneratedSocialPost }) {
  return (
    <div className="relative flex flex-col gap-[10px]">
      <PostPreview post={post} />
    </div>
  );
}
