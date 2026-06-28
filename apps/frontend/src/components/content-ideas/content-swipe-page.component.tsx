'use client';

import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';
import { ContentSwipe } from './content-swipe.component';
import { Lightbulb, Building2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';

export function ContentSwipePage() {
  const { data: selectedBrand, isLoading } = useSelectedBrand();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-black dark:border-white/20 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedBrand) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Building2 className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-500">
          Nenhuma marca selecionada
        </h2>
        <p className="text-gray-400 text-center max-w-md">
          Selecione ou crie uma marca para começar a revisar ideias de carrossel.
        </p>
        <Link href="/brands">
          <Button>Gerenciar Marcas</Button>
        </Link>
      </div>
    );
  }

  return <ContentSwipe brandId={selectedBrand.id} />;
}
