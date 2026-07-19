'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { areYouSure } from '@gitroom/frontend/components/layout/new-modal';
import {
  Plus,
  CheckCircle,
  ExternalLink,
  Trash2,
  Loader,
  Building2,
} from 'lucide-react';
import { useBrands, mutateBrands } from './brand-dna.hooks';
import { createBrand, selectBrand, deleteBrand } from './brand-dna.service';
import { BrandStatusBadge } from './brand-status-badge.component';
import { BrandProfile } from './brand-dna.types';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
  useCreateDrawer,
  FormField,
  FormInput,
  FormSelect,
} from '@gitroom/frontend/components/new-layout/page-system';

const industryOptions = [
  'SaaS B2B',
  'E-commerce',
  'Educação',
  'Saúde e bem-estar',
  'Finanças',
  'Agência / Marketing',
  'Indústria',
  'Serviços locais',
  'Imobiliário',
  'Alimentação',
  'Moda e beleza',
  'Tecnologia',
];

function CreateBrandForm({
  onCreated,
  onClose,
}: {
  onCreated: (id: string) => void;
  onClose: () => void;
}) {
  const toaster = useToaster();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toaster.show('O nome é obrigatório', 'warning');
      return;
    }
    setLoading(true);
    try {
      const brand = await createBrand({
        name: name.trim(),
        website: website.trim() || undefined,
        industry: industry || undefined,
      });
      toaster.show('Marca criada com sucesso!', 'success');
      mutateBrands();
      onCreated(brand.id);
      onClose();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao criar marca', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <FormField label="Nome" required>
        <FormInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Minha Empresa"
          autoFocus
        />
      </FormField>
      <FormField label="Website" hint="Opcional">
        <FormInput
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://exemplo.com"
        />
      </FormField>
      <FormField label="Indústria" hint="Opcional">
        <FormSelect
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          <option value="">Selecione...</option>
          {industryOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </FormSelect>
      </FormField>
      <div className="flex justify-end gap-[8px]">
        <Button secondary onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleCreate} loading={loading} disabled={!name.trim()}>
          Criar
        </Button>
      </div>
    </div>
  );
}

export function BrandListPage() {
  const router = useRouter();
  const toaster = useToaster();
  const { openCreateDrawer } = useCreateDrawer();
  const { data: brandsRaw, isLoading, error, mutate } = useBrands();
  const brands: BrandProfile[] = Array.isArray(brandsRaw)
    ? brandsRaw
    : brandsRaw?.data || [];

  const openCreate = () => {
    openCreateDrawer({
      title: 'Nova marca',
      size: 480,
      children: (close) => (
        <CreateBrandForm
          onClose={close}
          onCreated={(id) => router.push(`/brands/${id}`)}
        />
      ),
    });
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
    const confirmed = await areYouSure({
      title: 'Excluir marca',
      description: `Tem certeza que deseja excluir "${brand.name}"? O histórico de posts e carrosséis será preservado.`,
      approveLabel: 'Excluir',
      cancelLabel: 'Cancelar',
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
      <PageShell>
        <PageBody className="!p-0">
          <div className="flex flex-1 items-center justify-center min-h-[320px]">
            <Loader className="w-8 h-8 animate-spin text-textItemBlur" />
          </div>
        </PageBody>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <EmptyState
            title="Erro ao carregar marcas"
            description="Não foi possível carregar a lista de marcas."
            actionLabel="Tentar novamente"
            onAction={() => mutate()}
          />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        description={
          brands.length
            ? `${brands.length} ${brands.length === 1 ? 'marca' : 'marcas'} cadastrada${brands.length !== 1 ? 's' : ''}`
            : 'Gerencie as marcas e o Brand DNA da sua organização.'
        }
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nova marca
          </Button>
        }
      />
      <PageBody className={!brands.length ? '!p-0' : undefined}>
        {!brands.length ? (
          <EmptyState
            icon={<Building2 className="w-5 h-5" />}
            title="Nenhuma marca cadastrada"
            description="Crie sua primeira marca para gerar carrosséis e conteúdos com Brand DNA."
            actionLabel="Criar primeira marca"
            onAction={openCreate}
          />
        ) : (
          <div className="flex flex-col gap-[10px]">
            {brands.map((brand) => (
              <SectionCard
                key={brand.id}
                className={`!p-[14px] ${
                  brand.selected
                    ? '!border-emerald-500/40 bg-emerald-500/5'
                    : ''
                }`}
              >
                <div className="flex items-center gap-[12px]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[8px] flex-wrap">
                      <span className="text-[14px] font-[600] text-newTextColor truncate">
                        {brand.name}
                      </span>
                      {brand.selected ? (
                        <span className="inline-flex items-center gap-[4px] text-[11px] font-[600] text-emerald-400 bg-emerald-500/15 px-[8px] py-[2px] rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Selecionada
                        </span>
                      ) : null}
                      <BrandStatusBadge status={brand.status} />
                    </div>
                    <div className="flex items-center gap-[8px] mt-[4px] flex-wrap">
                      {brand.website ? (
                        <span className="text-[12px] text-textItemBlur truncate">
                          {brand.website}
                        </span>
                      ) : null}
                      {brand.industry ? (
                        <span className="text-[11px] text-textItemBlur bg-newSettings border border-newTableBorder px-[8px] py-[2px] rounded-[6px]">
                          {brand.industry}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-[8px] shrink-0">
                    {!brand.selected ? (
                      <Button
                        secondary
                        className="!h-[32px] !text-[12px]"
                        onClick={() => handleSelect(brand.id)}
                      >
                        Selecionar
                      </Button>
                    ) : null}
                    <Button
                      secondary
                      className="!h-[32px] !text-[12px]"
                      onClick={() => router.push(`/brands/${brand.id}`)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                    <Button
                      secondary
                      className="!h-[32px] !text-[12px]"
                      onClick={() => handleDelete(brand)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}
