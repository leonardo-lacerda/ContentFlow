'use client';

import { AiGenerateImagesComponent } from './ai-generate-images.component';
import { ArticleImportPanel } from '@gitroom/frontend/components/social-posts/article-import-panel.component';
import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';

/** Wrapper v1: import de artigo acima do estúdio de carrossel */
export function GeneratePage() {
  const { data: brand } = useSelectedBrand();
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 px-[20px] pt-[12px] max-w-[960px] w-full mx-auto">
        <ArticleImportPanel brandId={brand?.id} />
      </div>
      <div className="flex-1 min-h-0">
        <AiGenerateImagesComponent />
      </div>
    </div>
  );
}
