'use client';

import { useState, useMemo } from 'react';
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
  Search,
  Calendar,
  Dna,
  Zap,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { useBrands, mutateBrands } from './brand-dna.hooks';
import { createBrand, selectBrand, deleteBrand } from './brand-dna.service';
import { BrandStatusBadge } from './brand-status-badge.component';
import { BrandProfile, BrandStatus } from './brand-dna.types';
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
  FilterChip,
} from '@gitroom/frontend/components/new-layout/page-system';

const industryOptions = [
  'SaaS B2B', 'E-commerce', 'Educação', 'Saúde e bem-estar', 'Finanças',
  'Agência / Marketing', 'Indústria', 'Serviços locais', 'Imobiliário',
  'Alimentação', 'Moda e beleza', 'Tecnologia',
];

const STATUS_FILTERS: Array<{ label: string; value: BrandStatus | '' }> = [
  { label: 'Todas', value: '' },
  { label: 'Rascunho', value: 'DRAFT' },
  { label: 'Analisando', value: 'ANALYZING' },
  { label: 'Revisão', value: 'NEEDS_REVIEW' },
  { label: 'Ativo', value: 'ACTIVE' },
  { label: 'Falhou', value: 'FAILED' },
];

const STATUS_COLORS: Record<string, { border: string; bg: string; glow: string }> = {
  DRAFT: { border: 'border-[color:var(--cf-border)]', bg: 'bg-[color:var(--cf-bg-subtle)]', glow: '' },
  ANALYZING: { border: 'border-[color:var(--cf-blue)]/30', bg: 'bg-[color:var(--cf-blue-soft)]', glow: '' },
  NEEDS_REVIEW: { border: 'border-[color:var(--cf-yellow)]/50', bg: 'bg-[color:var(--cf-yellow-soft)]', glow: '' },
  ACTIVE: { border: 'border-[color:var(--cf-green)]/40', bg: 'bg-[color:var(--cf-green-soft)]', glow: '' },
  FAILED: { border: 'border-[color:var(--cf-coral)]/45', bg: 'bg-[color:var(--cf-coral-soft)]', glow: '' },
};

const AVATAR_COLORS = [
  'from-violet-600 to-indigo-600',
  'from-emerald-600 to-teal-600',
  'from-orange-600 to-red-600',
  'from-cyan-600 to-blue-600',
  'from-pink-600 to-rose-600',
  'from-amber-600 to-yellow-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function CreateBrandForm({ onCreated, onClose }: { onCreated: (id: string) => void; onClose: () => void }) {
  const toaster = useToaster();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toaster.show('O nome é obrigatório', 'warning'); return; }
    setLoading(true);
    try {
      const brand = await createBrand({ name: name.trim(), website: website.trim() || undefined, industry: industry || undefined });
      toaster.show('Marca criada com sucesso!', 'success');
      mutateBrands();
      onCreated(brand.id);
      onClose();
    } catch (err: any) { toaster.show(err.message || 'Erro ao criar marca', 'warning'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <FormField label="Nome" required>
        <FormInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Minha Empresa" autoFocus />
      </FormField>
      <FormField label="Website" hint="Opcional">
        <FormInput value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://exemplo.com" />
      </FormField>
      <FormField label="Indústria" hint="Opcional">
        <FormSelect value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">Selecione...</option>
          {industryOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </FormSelect>
      </FormField>
      <div className="flex justify-end gap-[8px]">
        <Button secondary onClick={onClose}>Cancelar</Button>
        <Button onClick={handleCreate} loading={loading} disabled={!name.trim()}>Criar</Button>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function BrandListPage() {
  const router = useRouter();
  const toaster = useToaster();
  const { openCreateDrawer } = useCreateDrawer();
  const { data: brandsRaw, isLoading, error, mutate } = useBrands();
  const brands: BrandProfile[] = useMemo(
    () => (Array.isArray(brandsRaw) ? brandsRaw : brandsRaw?.data || []),
    [brandsRaw]
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BrandStatus | ''>('');

  const filtered = useMemo(() => {
    let result = brands;
    if (statusFilter) result = result.filter((b) => b.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q) || b.website?.toLowerCase().includes(q) || b.industry?.toLowerCase().includes(q));
    }
    return result;
  }, [brands, statusFilter, search]);

  // Dashboard metrics
  const metrics = useMemo(() => {
    const total = brands.length;
    const active = brands.filter((b) => b.status === 'ACTIVE').length;
    const needsReview = brands.filter((b) => b.status === 'NEEDS_REVIEW').length;
    const analyzing = brands.filter((b) => b.status === 'ANALYZING').length;
    return { total, active, needsReview, analyzing };
  }, [brands]);

  const openCreate = () => {
    openCreateDrawer({
      title: 'Nova marca',
      size: 480,
      children: (close) => <CreateBrandForm onClose={close} onCreated={(id) => router.push(`/brands/${id}`)} />,
    });
  };

  const handleSelect = async (id: string) => {
    try { await selectBrand(id); toaster.show('Marca selecionada', 'success'); mutateBrands(); }
    catch (err: any) { toaster.show(err.message || 'Erro ao selecionar marca', 'warning'); }
  };

  const handleDelete = async (brand: BrandProfile) => {
    const confirmed = await areYouSure({
      title: 'Excluir marca',
      description: `Tem certeza que deseja excluir "${brand.name}"? O histórico de posts e carrosséis será preservado.`,
      approveLabel: 'Excluir', cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;
    try { await deleteBrand(brand.id); toaster.show('Marca excluída', 'success'); mutateBrands(); }
    catch (err: any) { toaster.show(err.message || 'Erro ao excluir marca', 'warning'); }
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
          <EmptyState title="Erro ao carregar marcas" description="Não foi possível carregar a lista de marcas." actionLabel="Tentar novamente" onAction={() => mutate()} />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        description={brands.length ? `${brands.length} marca${brands.length !== 1 ? 's' : ''} cadastrada${brands.length !== 1 ? 's' : ''}` : 'Gerencie as marcas e o Brand DNA da sua organização.'}
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Nova marca</Button>}
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
          <>
            {/* Dashboard metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="cf-section-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[color:var(--cf-bg-subtle)] flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-textItemBlur" />
                  </div>
                </div>
                <div className="text-[24px] font-[800] text-newTextColor leading-none">{metrics.total}</div>
                <div className="text-[11px] text-textItemBlur mt-1">Total de marcas</div>
              </div>
              <div className="cf-section-card !border-[color:var(--cf-green)]/30 !bg-[color:var(--cf-green-soft)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[color:var(--cf-green)]" />
                  </div>
                </div>
                <div className="text-[24px] font-[800] text-[color:var(--cf-green)] leading-none">{metrics.active}</div>
                <div className="text-[11px] text-[color:var(--cf-green)]/70 mt-1">Ativas com DNA</div>
              </div>
              <div className="cf-section-card !border-[color:var(--cf-yellow)]/45 !bg-[color:var(--cf-yellow-soft)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-[color:var(--cf-yellow)]" />
                  </div>
                </div>
                <div className="text-[24px] font-[800] text-newTextColor leading-none">{metrics.needsReview}</div>
                <div className="text-[11px] text-textItemBlur mt-1">Precisam revisão</div>
              </div>
              <div className="cf-section-card !border-[color:var(--cf-blue)]/35 !bg-[color:var(--cf-blue-soft)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[color:var(--cf-blue)]" />
                  </div>
                </div>
                <div className="text-[24px] font-[800] text-[color:var(--cf-blue)] leading-none">{metrics.analyzing}</div>
                <div className="text-[11px] text-[color:var(--cf-blue)]/70 mt-1">Sendo analisadas</div>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textItemBlur" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, website ou indústria..."
                  className="cf-control pl-9 pr-3 text-[13px]"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_FILTERS.map((f) => (
                  <FilterChip key={f.value} active={statusFilter === f.value} onClick={() => setStatusFilter(f.value)}>
                    {f.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            {/* Brand cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-12 text-textItemBlur text-[13px]">
                  Nenhuma marca encontrada com esses filtros.
                </div>
              ) : (
                filtered.map((brand) => {
                  const colors = STATUS_COLORS[brand.status] || STATUS_COLORS.DRAFT;
                  return (
                    <div
                      key={brand.id}
                      className={`cf-section-card group relative ${colors.border} ${colors.bg} p-5 transition-all ${colors.glow} cursor-pointer`}
                      onClick={() => router.push(`/brands/${brand.id}`)}
                    >
                      {/* Selected badge */}
                      {brand.selected && (
                        <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-[700] text-[color:var(--cf-green)] bg-[color:var(--cf-green-soft)] px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Ativa
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(brand.name)} flex items-center justify-center text-white text-[18px] font-[800] shrink-0 shadow-lg`}>
                          {getInitials(brand.name)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-[700] text-newTextColor truncate pr-16">{brand.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <BrandStatusBadge status={brand.status} />
                            {brand.industry && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--cf-bg-subtle)] border border-newTableBorder text-textItemBlur">
                                {brand.industry}
                              </span>
                            )}
                          </div>
                          {brand.website && (
                            <div className="text-[11px] text-textItemBlur mt-2 flex items-center gap-1 truncate">
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              {brand.website.replace(/^https?:\/\//, '')}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-[10px] text-textItemBlur">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(brand.createdAt)}
                            </span>
                            {(brand.status === 'ACTIVE' || brand.status === 'NEEDS_REVIEW') && (
                                <span className="flex items-center gap-1 text-[color:var(--cf-green)]">
                                <Dna className="w-3 h-3" />
                                DNA v2
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions (show on hover) */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-newTableBorder opacity-0 group-hover:opacity-100 transition-opacity">
                        {!brand.selected && (
                          <Button secondary className="!h-[30px] !text-[11px] !flex-1" onClick={(e) => { e.stopPropagation(); handleSelect(brand.id); }}>
                            Selecionar
                          </Button>
                        )}
                        <Button secondary className="!h-[30px] !text-[11px] !flex-1" onClick={(e) => { e.stopPropagation(); router.push(`/brands/${brand.id}`); }}>
                          Abrir
                        </Button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-[color:var(--cf-coral-soft)] text-textItemBlur hover:text-[color:var(--cf-coral)] transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDelete(brand); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </PageBody>
    </PageShell>
  );
}
