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
  Loader,
} from 'lucide-react';
import { useState } from 'react';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
  formControlClass,
} from '@gitroom/frontend/components/new-layout/page-system';

const inputClass = formControlClass + ' h-[48px]';

const textAreaClass = formControlClass + ' resize-none min-h-[88px]';

export function BrandDetailPage(props: { brandId?: string } = {}) {
  const brandIdProp = props.brandId;
  const params = useParams();
  const router = useRouter();
  const toaster = useToaster();
  const modals = useModals();
  const brandId = brandIdProp || (params?.id as string);

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
          <div className="flex justify-end gap-3 pt-4 border-t border-newTableBorder">
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
      <PageShell>
        <PageBody className="!p-0">
          <div className="flex flex-1 items-center justify-center min-h-[320px]">
            <Loader className="w-8 h-8 animate-spin text-textItemBlur" />
          </div>
        </PageBody>
      </PageShell>
    );
  }

  if (error || !brand) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <EmptyState
            title="Marca não encontrada"
            description="Esta marca não existe ou você não tem acesso."
            actionLabel="Voltar para marcas"
            onAction={() => router.push('/')}
          />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        description={brand.industry || 'Detalhes, Brand DNA e assets da marca.'}
        filters={
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[13px] text-textItemBlur hover:text-newTextColor transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Marcas
          </button>
        }
        actions={
          <div className="flex items-center gap-2">
            {brand.selected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-[600] text-emerald-400 bg-emerald-500/15 px-[8px] py-[4px] rounded-full">
                <CheckCircle className="w-3 h-3" />
                Selecionada
              </span>
            ) : (
              <Button onClick={handleSelect} className="!h-[36px] !text-[12px]">
                <CheckCircle className="w-4 h-4" />
                Selecionar
              </Button>
            )}
          </div>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-[16px]">
          <SectionCard>
            <div className="flex items-start justify-between gap-[12px] flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  {editingName ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        className={inputClass + ' !h-[40px] !text-[16px] font-bold w-[280px]'}
                        defaultValue={brand.name}
                        onChange={(e) => setNameValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      />
                      <Button onClick={handleSaveName} className="!h-[36px]">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setEditingName(false)}
                        secondary
                        className="!h-[36px]"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-[18px] font-[700] text-newTextColor hover:opacity-80 transition-opacity flex items-center gap-2"
                      onClick={() => {
                        setNameValue(brand.name);
                        setEditingName(true);
                      }}
                    >
                      {brand.name}
                      <Pencil className="w-4 h-4 text-textItemBlur" />
                    </button>
                  )}
                  <BrandStatusBadge status={brand.status} />
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {brand.website ? (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-textItemBlur hover:text-newTextColor flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {brand.website}
                    </a>
                  ) : null}
                  {brand.industry ? (
                    <span className="text-[11px] text-textItemBlur bg-newBgColorInner border border-newTableBorder px-[8px] py-[2px] rounded-[6px]">
                      {brand.industry}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Análise de site"
            description="Extraia Brand DNA a partir do website da marca."
          >
            <div className="flex items-center gap-2 mb-3 text-textItemBlur">
              <Building2 className="w-4 h-4" />
            </div>
            <AnalyzeSiteButton brandId={brand.id} website={brand.website} />
          </SectionCard>

          <SectionCard
            title="Brand DNA"
            actions={
              <Button onClick={handleCreateDna} className="!h-[36px] !text-[12px]">
                <Pencil className="w-4 h-4" />
                Criar DNA manualmente
              </Button>
            }
          >
            {dna ? (
              <DnaSnapshotList brandId={brand.id} />
            ) : (
              <div className="text-center py-8 text-textItemBlur">
                <p className="text-[13px]">Nenhum Brand DNA encontrado.</p>
                <p className="text-[12px] mt-1">
                  Analise o site ou crie um DNA manualmente para começar.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Assets da marca">
            <BrandAssetList brandId={brand.id} />
          </SectionCard>
        </div>
      </PageBody>
    </PageShell>
  );
}

// Helper components for the DNA creation modal
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold mb-3 text-newTextColor border-b border-newTableBorder pb-2">
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
      <label className="text-[13px] font-medium text-textItemBlur">{label}</label>
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
