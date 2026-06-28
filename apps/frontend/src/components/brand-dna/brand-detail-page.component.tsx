'use client';

import { useParams, useRouter } from 'next/navigation';
import { useBrand, useLatestDna, mutateBrand } from './brand-dna.hooks';
import {
  selectBrand,
  updateBrand,
  createDnaSnapshot,
} from './brand-dna.service';
import { BrandStatusBadge } from './brand-status-badge.component';
import { BrandAssetList } from './brand-asset-list.component';
import { DnaSnapshotList } from './dna-snapshot-list.component';
import { AnalyzeSiteButton } from './analyze-site-button.component';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Save,
  Pencil,
  Building2,
} from 'lucide-react';
import { useState } from 'react';

const inputClass =
  'h-[48px] w-full rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] px-[16px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20';

const textAreaClass =
  'w-full rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] px-[16px] py-[12px] text-[14px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white resize-none transition duration-200 focus:border-black/40 dark:focus:border-white/40';

export function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toaster = useToaster();
  const modals = useModals();
  const brandId = params.id as string;

  const { data: brand, isLoading, error, mutate } = useBrand(brandId);
  const { data: latestDna } = useLatestDna(brandId);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const dna = latestDna?.data || latestDna;

  const handleSelect = async () => {
    try {
      await selectBrand(brand.id);
      toaster.show('Marca selecionada', 'success');
      mutateBrand(brand.id);
      mutate();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao selecionar marca', 'warning');
    }
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      toaster.show('O nome não pode ser vazio', 'warning');
      return;
    }
    try {
      await updateBrand(brand.id, { name: nameValue.trim() });
      toaster.show('Nome atualizado', 'success');
      setEditingName(false);
      mutate();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao salvar', 'warning');
    }
  };

  const handleCreateDna = () => {
    let form = {
      sourceType: 'manual' as string,
      summaryTagline: '',
      summaryDescription: '',
      summaryIndustry: '',
      summaryTargetAudience: '',
      voiceTone: '',
      voiceStyle: '',
      voicePersonality: '',
      voiceForbiddenWords: '',
      audienceDemographics: '',
      audiencePainPoints: '',
      audienceDesires: '',
      audienceObjections: '',
      offerProducts: '',
      offerServices: '',
      offerUniqueSellingPoints: '',
      offerPricingHint: '',
      visualColors: '',
      visualStyle: '',
      visualTypographyHint: '',
      constraintsDo: '',
      constraintsAvoid: '',
      constraintsRequiredElements: '',
    };

    modals.openModal({
      title: 'Criar Brand DNA Manualmente',
      size: 600,
      maxSize: '90vw',
      children: (close: () => void) => (
        <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6">
          <Section title="Resumo">
            <Field label="Tagline" value={form.summaryTagline} onChange={(v) => { form.summaryTagline = v; }} />
            <Field label="Descrição" value={form.summaryDescription} onChange={(v) => { form.summaryDescription = v; }} textarea />
            <Field label="Indústria" value={form.summaryIndustry} onChange={(v) => { form.summaryIndustry = v; }} />
            <Field label="Público-alvo" value={form.summaryTargetAudience} onChange={(v) => { form.summaryTargetAudience = v; }} />
          </Section>
          <Section title="Voz da Marca">
            <Field label="Tom" value={form.voiceTone} onChange={(v) => { form.voiceTone = v; }} />
            <Field label="Estilo" value={form.voiceStyle} onChange={(v) => { form.voiceStyle = v; }} />
            <Field label="Personalidade" value={form.voicePersonality} onChange={(v) => { form.voicePersonality = v; }} />
            <Field label="Palavras proibidas (vírgula separada)" value={form.voiceForbiddenWords} onChange={(v) => { form.voiceForbiddenWords = v; }} />
          </Section>
          <Section title="Público">
            <Field label="Demografia" value={form.audienceDemographics} onChange={(v) => { form.audienceDemographics = v; }} textarea />
            <Field label="Dores (vírgula separada)" value={form.audiencePainPoints} onChange={(v) => { form.audiencePainPoints = v; }} />
            <Field label="Desejos (vírgula separada)" value={form.audienceDesires} onChange={(v) => { form.audienceDesires = v; }} />
            <Field label="Objeções (vírgula separada)" value={form.audienceObjections} onChange={(v) => { form.audienceObjections = v; }} />
          </Section>
          <Section title="Oferta">
            <Field label="Produtos (vírgula separada)" value={form.offerProducts} onChange={(v) => { form.offerProducts = v; }} />
            <Field label="Serviços (vírgula separada)" value={form.offerServices} onChange={(v) => { form.offerServices = v; }} />
            <Field label="Diferenciais (vírgula separada)" value={form.offerUniqueSellingPoints} onChange={(v) => { form.offerUniqueSellingPoints = v; }} />
            <Field label="Sugestão de preço" value={form.offerPricingHint} onChange={(v) => { form.offerPricingHint = v; }} />
          </Section>
          <Section title="Identidade Visual">
            <Field label="Cores (vírgula separada)" value={form.visualColors} onChange={(v) => { form.visualColors = v; }} />
            <Field label="Estilo visual" value={form.visualStyle} onChange={(v) => { form.visualStyle = v; }} />
            <Field label="Tipografia" value={form.visualTypographyHint} onChange={(v) => { form.visualTypographyHint = v; }} />
          </Section>
          <Section title="Diretrizes">
            <Field label="Fazer (vírgula separada)" value={form.constraintsDo} onChange={(v) => { form.constraintsDo = v; }} />
            <Field label="Evitar (vírgula separada)" value={form.constraintsAvoid} onChange={(v) => { form.constraintsAvoid = v; }} />
            <Field label="Elementos obrigatórios (vírgula separada)" value={form.constraintsRequiredElements} onChange={(v) => { form.constraintsRequiredElements = v; }} />
          </Section>
          <div className="flex justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
            <Button onClick={close} secondary>Cancelar</Button>
            <Button onClick={async () => {
              try {
                await createDnaSnapshot(brand.id, {
                  sourceType: 'manual',
                  summary: {
                    tagline: form.summaryTagline,
                    description: form.summaryDescription,
                    industry: form.summaryIndustry,
                    targetAudience: form.summaryTargetAudience,
                  },
                  voice: {
                    tone: form.voiceTone,
                    style: form.voiceStyle,
                    personality: form.voicePersonality,
                    forbiddenWords: form.voiceForbiddenWords.split(',').map(s => s.trim()).filter(Boolean),
                  },
                  audience: {
                    demographics: form.audienceDemographics,
                    painPoints: form.audiencePainPoints.split(',').map(s => s.trim()).filter(Boolean),
                    desires: form.audienceDesires.split(',').map(s => s.trim()).filter(Boolean),
                    objections: form.audienceObjections.split(',').map(s => s.trim()).filter(Boolean),
                  },
                  offer: {
                    products: form.offerProducts.split(',').map(s => s.trim()).filter(Boolean),
                    services: form.offerServices.split(',').map(s => s.trim()).filter(Boolean),
                    uniqueSellingPoints: form.offerUniqueSellingPoints.split(',').map(s => s.trim()).filter(Boolean),
                    pricingHint: form.offerPricingHint,
                  },
                  visual: {
                    colors: form.visualColors.split(',').map(s => s.trim()).filter(Boolean),
                    style: form.visualStyle,
                    typographyHint: form.visualTypographyHint,
                  },
                  constraints: {
                    do: form.constraintsDo.split(',').map(s => s.trim()).filter(Boolean),
                    avoid: form.constraintsAvoid.split(',').map(s => s.trim()).filter(Boolean),
                    requiredElements: form.constraintsRequiredElements.split(',').map(s => s.trim()).filter(Boolean),
                  },
                });
                toaster.show('Brand DNA criado com sucesso!', 'success');
                mutateBrand(brand.id);
                close();
              } catch (err: any) {
                toaster.show(err.message || 'Erro ao criar DNA', 'warning');
              }
            }}>
              <Save className="w-4 h-4" />
              Salvar DNA
            </Button>
          </div>
        </div>
      ),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-black dark:border-white/20 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-gray-500">Marca não encontrada</p>
        <Button onClick={() => router.push('/brands')}>Voltar para Marcas</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/brands')}
          className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Marcas
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass + ' !h-[40px] !text-[20px] font-bold w-[300px]'}
                    defaultValue={brand.name}
                    onChange={(e) => setNameValue(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <Button onClick={handleSaveName}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => setEditingName(false)} secondary>Cancelar</Button>
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold text-black dark:text-white cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2"
                  onClick={() => {
                    setNameValue(brand.name);
                    setEditingName(true);
                  }}
                >
                  {brand.name}
                  <Pencil className="w-4 h-4 text-black/30 dark:text-white/30" />
                </h1>
              )}
              <BrandStatusBadge status={brand.status} />
              {brand.selected && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Selecionada
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2">
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {brand.website}
                </a>
              )}
              {brand.industry && (
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {brand.industry}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!brand.selected && (
              <Button onClick={handleSelect}>
                <CheckCircle className="w-4 h-4" />
                Selecionar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Analyze Site */}
      <section className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Análise de Site
        </h2>
        <AnalyzeSiteButton brandId={brand.id} website={brand.website} />
      </section>

      {/* Brand DNA */}
      <section className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Brand DNA</h2>
          <Button onClick={handleCreateDna}>
            <Pencil className="w-4 h-4" />
            Criar DNA manualmente
          </Button>
        </div>

        {dna ? (
          <DnaSnapshotList brandId={brand.id} />
        ) : (
          <div className="text-center py-8 text-black/40 dark:text-white/40">
            <p className="text-sm">Nenhum Brand DNA encontrado.</p>
            <p className="text-xs mt-1">
              Analise o site ou crie um DNA manualmente para começar.
            </p>
          </div>
        )}
      </section>

      {/* Assets */}
      <section className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6">
        <h2 className="text-lg font-semibold mb-4">Assets da Marca</h2>
        <BrandAssetList brandId={brand.id} />
      </section>
    </div>
  );
}

// Helper components for the DNA creation modal
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold mb-3 text-black dark:text-white border-b border-black/10 dark:border-white/10 pb-2">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-black/60 dark:text-white/60">
        {label}
      </label>
      {textarea ? (
        <textarea
          className={textAreaClass}
          rows={3}
          defaultValue={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputClass + ' !h-[40px]'}
          defaultValue={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
