'use client';

import React from 'react';
import type { GeneratedSocialPost } from './social-posts.types';
import { PostPreview } from './post-preview.component';
import { Button } from '@gitroom/react/form/button';

export function SocialPostCard({
  post,
  onUse,
}: {
  post: GeneratedSocialPost;
  onUse?: (post: GeneratedSocialPost) => void;
}) {
  return (
    <div className="relative flex flex-col gap-[10px]">
      <PostPreview post={post} />
      {onUse ? (
        <div>
          <Button
            secondary
            className="!h-[32px] !text-[12px]"
            onClick={() => onUse(post)}
          >
            Criar rascunho
          </Button>
        </div>
      ) : null}
    </div>
  );
}
