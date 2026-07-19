'use client';

import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import { useBrands, useSelectedBrand } from './brand-dna.hooks';
import { BrandDetailPage } from './brand-detail-page.component';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
} from '@gitroom/frontend/components/new-layout/page-system';
/**
 * ContentFlow v1: 1 marca por conta.
 * Sem lista multi-marca — selected ou primeira marca, senão onboarding.
 */
export function BrandSinglePage() {
  const router = useRouter();
  const { data: selected, isLoading: loadingSelected } = useSelectedBrand();
  const { data: brands, isLoading: loadingBrands } = useBrands();

  const list = Array.isArray(brands) ? brands : (brands as any)?.brands || [];
  const brandId = selected?.id || list[0]?.id;

  if (loadingSelected || loadingBrands) {
    return (
      <PageShell>
        <PageBody>
          <div className="flex items-center justify-center py-20 text-textItemBlur gap-2">
            <Loader className="w-5 h-5 animate-spin" />
            Carregando marca…
          </div>
        </PageBody>
      </PageShell>
    );
  }

  if (!brandId) {
    return (
      <PageShell>
        <PageHeader
          description="Uma marca por conta. Cole a URL e a IA monta o DNA."
        />
        <PageBody>
          <EmptyState
            title="Nenhuma marca ainda"
            description="Comece o onboarding: cole a URL do site e revise o Brand DNA."
            actionLabel="Colar URL da marca"
            onAction={() => router.push('/onboarding')}
          />
        </PageBody>
      </PageShell>
    );
  }

  return <BrandDetailPage brandId={brandId} />;
}
