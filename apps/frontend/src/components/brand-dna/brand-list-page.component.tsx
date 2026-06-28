'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  Plus,
  CheckCircle,
  ExternalLink,
  Trash2,
  Loader,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { useBrands, useSelectedBrand, mutateBrands } from './brand-dna.hooks';
import { createBrand, selectBrand, deleteBrand } from './brand-dna.service';
import { BrandStatusBadge } from './brand-status-badge.component';
import { BrandProfile } from './brand-dna.types';

export function BrandListPage() {
  const router = useRouter();
  const toaster = useToaster();
  const modals = useModals();
  const { data: brands, isLoading, error, mutate } = useBrands();
  const { data: selectedBrand } = useSelectedBrand();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const result = await modals.show('create-brand', {
      title: 'Nova Marca',
      component: 'brand-create-form',
      props: {},
    });

    if (!result) return;

    setCreating(true);
    try {
      const brand = await createBrand({
        name: result.name,
        website: result.website,
        industry: result.industry,
      });
      toaster.show('Marca criada com sucesso!', 'success');
      mutateBrands();
      router.push(`/brands/${brand.id}`);
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao criar marca', 'warning');
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = async (id: string) => {
    try {
      await selectBrand(id);
      toaster.show('Marca selecionada', 'success');
      mutateBrands();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao selecionar marca', 'warning');
    }
  };

  const handleDelete = async (brand: BrandProfile) => {
    const confirmed = await modals.show('confirm', {
      title: 'Excluir marca',
      message: `Tem certeza que deseja excluir "${brand.name}"? O histórico de posts e carrosséis será preservado.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await deleteBrand(brand.id);
      toaster.show('Marca excluída', 'success');
      mutateBrands();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao excluir marca', 'warning');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-gray-500">Erro ao carregar marcas</p>
        <Button onClick={() => mutate()}>Tentar novamente</Button>
      </div>
    );
  }

  if (!brands || brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Building2 className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-500">Nenhuma marca cadastrada</h2>
        <p className="text-gray-400 text-center max-w-md">
          Crie sua primeira marca para começar a gerar carrosséis com Brand DNA.
        </p>
        <Button onClick={handleCreate} loading={creating}>
          <Plus className="w-4 h-4" />
          Criar Primeira Marca
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marcas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {brands.length} {brands.length === 1 ? 'marca' : 'marcas'} cadastrada{brands.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleCreate} loading={creating}>
          <Plus className="w-4 h-4" />
          Nova Marca
        </Button>
      </div>

      <div className="space-y-3">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className={`rounded-[12px] border p-4 transition-all hover:shadow-sm ${
              brand.selected
                ? 'border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/20'
                : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#171717]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{brand.name}</span>
                    {brand.selected && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Selecionada
                      </span>
                    )}
                    <BrandStatusBadge status={brand.status} />
                  </div>
                  {brand.website && (
                    <p className="text-sm text-gray-400 truncate mt-0.5">{brand.website}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {!brand.selected && (
                  <Button onClick={() => handleSelect(brand.id)}>
                    <CheckCircle className="w-4 h-4" />
                    Selecionar
                  </Button>
                )}
                <Button onClick={() => router.push(`/brands/${brand.id}`)}>
                  <ExternalLink className="w-4 h-4" />
                  Editar
                </Button>
                <Button onClick={() => handleDelete(brand)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
