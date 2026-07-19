'use client';

import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';
import { ContentSwipe } from './content-swipe.component';
import { Building2, Loader } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import {
  PageShell,
  PageBody,
  EmptyState,
} from '@gitroom/frontend/components/new-layout/page-system';

export function ContentSwipePage() {
  const { data: selectedBrand, isLoading } = useSelectedBrand();

  if (isLoading) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <div className="flex flex-1 items-center justify-center min-h-[320px]">
            <Loader className="w-8 h-8 animate-spin text-textItemBlur" />
          </div>
        </PageBody>
      </PageShell>
    );
  }

  if (!selectedBrand) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <EmptyState
            icon={<Building2 className="w-5 h-5" />}
            title="Nenhuma marca selecionada"
            description="Selecione ou crie uma marca para começar a revisar ideias de carrossel."
            secondary={
              <Link href="/brand">
                <Button>Gerenciar marcas</Button>
              </Link>
            }
          />
        </PageBody>
      </PageShell>
    );
  }

  return <ContentSwipe brandId={selectedBrand.id} />;
}
