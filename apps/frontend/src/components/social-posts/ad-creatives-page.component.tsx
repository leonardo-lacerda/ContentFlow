'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
  useCreateDrawer,
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  FilterChip,
} from '@gitroom/frontend/components/new-layout/page-system';
import type {
  GeneratedAdCreative,
  AdCreativeBatch,
  SavedAdCreative,
} from '../ads/ads.types';
import {
  generateAds,
  saveAds,
  updateAd,
  deleteAd,
  exportAd,
} from '../ads/ads.service';
import { useSavedAds, useAdTemplates } from '../ads/ads.hooks';
import {
  buildContextFromPrefill,
  useAmpliarPrefill,
} from '@gitroom/frontend/components/ampliar/use-ampliar-prefill';
import { AmpliarSourceBanner } from '@gitroom/frontend/components/ampliar/ampliar-source-banner.component';
import { AmpliarAiPaths } from '@gitroom/frontend/components/ampliar/ampliar-ai-paths.component';
import {
  buildAdsAiPaths,
  type AmpliarAiPath,
} from '@gitroom/frontend/components/ampliar/ampliar-ai-presets';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Trash2, Download, Search } from 'lucide-react';

const PLATFORM_LABELS: Record<string, string> = {
  META_FACEBOOK: 'Facebook',
  META_INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
};

const PLATFORM_COLORS: Record<string, string> = {
  META_FACEBOOK: '#1877F2',
  META_INSTAGRAM: '#E4405F',
  LINKEDIN: '#0A66C2',
};

const OBJECTIVES = [
  'AWARENESS',
  'CONSIDERATION',
  'CONVERSION',
  'LEAD_GENERATION',
  'TRAFFIC',
  'ENGAGEMENT',
];

const AD_TYPES = ['AUTO', 'STATIC', 'CAROUSEL'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-newSettings text-textItemBlur border border-newTableBorder' },
  APPROVED: { label: 'Aprovado', color: 'bg-emerald-500/15 text-emerald-400' },
  EXPORTED: { label: 'Exportado', color: 'bg-blue-500/15 text-blue-400' },
};

const IMPACT_COLORS: Record<string, string> = {
  'quick-win': 'bg-green-500/15 text-green-400',
  'medium-term': 'bg-yellow-500/15 text-yellow-400',
  'long-term': 'bg-blue-500/15 text-blue-400',
};

const IMPACT_LABELS: Record<string, string> = {
  'quick-win': 'Rápido',
  'medium-term': 'Médio prazo',
  'long-term': 'Longo prazo',
};

/* ------------------------------------------------------------------ */
/*  Collapsible section                                                */
/* ------------------------------------------------------------------ */

function CollapsibleSection({ title, icon, children, defaultOpen = false }: { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const arrowCls = "transition-transform " + (open ? "rotate-180" : "");
  return (
    <div className="border border-newTableBorder rounded-[10px] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-[12px] bg-newBgColorInner hover:bg-newSettings transition-colors text-left">
        <div className="flex items-center gap-[8px]">{icon}<span className="text-[13px] font-[600] text-newTextColor">{title}</span></div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={arrowCls}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open ? <div className="p-[12px] border-t border-newTableBorder">{children}</div> : null}
    </div>
  );
}

function PolicyWarningsList({ warnings }: { warnings: any[] }) {
  if (!warnings?.length) return null;
  return (
    <div className="mt-[8px] flex flex-col gap-[6px]">
      {warnings.map((w, i) => (
        <div key={i} className="text-[12px] rounded-[8px] border border-newTableBorder bg-newBgColorInner p-[10px] text-textItemBlur">
          <span className="font-[600] text-newTextColor">[{w.ruleId}]</span> {w.message}
          {w.suggestion ? <div className="mt-[4px] opacity-80">Sugestão: {w.suggestion}</div> : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ad Card (generated or saved)                                       */
/* ------------------------------------------------------------------ */

function AdCreativeCard({
  ad,
  onSave,
  saving,
  onDelete,
  onExport,
}: {
  ad: GeneratedAdCreative | SavedAdCreative;
  onSave?: () => void;
  saving?: boolean;
  onDelete?: () => void;
  onExport?: () => void;
}) {
  const status = 'status' in ad ? (ad as SavedAdCreative).status : undefined;

  return (
    <SectionCard className="!p-[14px] flex flex-col gap-[10px]">
      <div className="flex items-center gap-[6px] flex-wrap">
        <span
          className="text-[11px] px-[8px] py-[3px] rounded-full text-white font-[600]"
          style={{ background: PLATFORM_COLORS[ad.platform] || '#6b7280' }}
        >
          {PLATFORM_LABELS[ad.platform] || ad.platform}
        </span>
        <span className="text-[11px] px-[8px] py-[3px] rounded-[6px] bg-newSettings border border-newTableBorder text-textItemBlur">
          {ad.type}
        </span>
        {status && STATUS_CONFIG[status] ? (
          <span className={`text-[11px] px-[8px] py-[3px] rounded-full font-[600] ${STATUS_CONFIG[status].color}`}>
            {STATUS_CONFIG[status].label}
          </span>
        ) : null}
        {(ad as any).policyWarnings?.some((w: any) => w.severity === 'critical') ? (
          <span className="text-[11px] px-[8px] py-[3px] rounded-[6px] bg-red-500/15 text-red-400 font-[600]">
            Compliance
          </span>
        ) : null}
      </div>

      {/* Ad Copy Preview */}
      <div className="border border-newTableBorder rounded-[10px] p-[14px] bg-gradient-to-br from-newBgColorInner to-transparent">
        <h3 className="text-[15px] font-[600] text-newTextColor mb-[4px]">{ad.headline}</h3>
        <p className="text-[13px] text-newTextColor/90 whitespace-pre-line">{ad.primaryText}</p>
        {ad.description ? <p className="text-[12px] text-textItemBlur mt-[4px]">{ad.description}</p> : null}
        <div className="flex items-center gap-[8px] text-[12px] mt-[10px]">
          <span className="px-[10px] py-[4px] rounded-[6px] font-[600] bg-btnPrimary text-btnText">{ad.ctaButton}</span>
          {ad.destinationUrl ? <span className="text-textItemBlur truncate max-w-[240px]">{ad.destinationUrl}</span> : null}
        </div>
      </div>

      {/* Strategic sections */}
      {(ad as any).rationale ? (
        <CollapsibleSection title="Estratégia" defaultOpen={true}>
          <div className="flex flex-col gap-[10px]">
            <div><div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[4px]">Por que funciona</div><p className="text-[13px] text-newTextColor">{(ad as any).rationale}</p></div>
            {(ad as any).emotionalHook ? <div><div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[4px]">Gatilho Emocional</div><p className="text-[13px] text-newTextColor">{(ad as any).emotionalHook}</p></div> : null}
            {(ad as any).platformOptimization ? <div><div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[4px]">Otimização</div><p className="text-[13px] text-newTextColor">{(ad as any).platformOptimization}</p></div> : null}
          </div>
        </CollapsibleSection>
      ) : null}

      {(ad as any).targeting?.length > 0 ? (
        <CollapsibleSection title="Público-Alvo">
          <div className="flex flex-col gap-[10px]">
            {(ad as any).targeting.map((t: any, i: number) => (
              <div key={i} className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner">
                <div className="text-[13px] font-[600] text-newTextColor mb-[4px]">{t.audience}</div>
                <div className="text-[12px] text-textItemBlur"><b>Demográficos:</b> {t.demographics}</div>
                <div className="text-[12px] text-textItemBlur"><b>Interesses:</b> {t.interests?.join(', ')}</div>
                {t.exclusions?.length ? <div className="text-[12px] text-textItemBlur"><b>Exclusões:</b> {t.exclusions.join(', ')}</div> : null}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {(ad as any).imagePrompts?.length > 0 ? (
        <CollapsibleSection title="Direção Visual">
          <div className="flex flex-col gap-[8px]">
            {(ad as any).imagePrompts.map((ip: any, i: number) => (
              <div key={i} className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner">
                <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[4px]">{ip.role}</div>
                <p className="text-[12px] text-newTextColor">{ip.prompt}</p>
                {ip.aspectRatio ? <span className="text-[11px] text-textItemBlur mt-[2px] inline-block">Ratio: {ip.aspectRatio}</span> : null}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {(ad as any).abTests?.length > 0 ? (
        <CollapsibleSection title="Testes A/B">
          <div className="flex flex-col gap-[8px]">
            {(ad as any).abTests.map((test: any, i: number) => (
              <div key={i} className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner">
                <div className="text-[12px] font-[600] text-newTextColor mb-[4px]">Testar: {test.variant}</div>
                <div className="text-[12px] text-textItemBlur"><b>Atual:</b> {test.currentValue}</div>
                <div className="text-[12px] text-textItemBlur"><b>Alternativa:</b> {test.suggestedAlternative}</div>
                <div className="text-[12px] text-newTextColor italic">{test.hypothesis}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {(ad as any).growthTips?.length > 0 ? (
        <CollapsibleSection title="Dicas de Crescimento">
          <div className="flex flex-col gap-[8px]">
            {(ad as any).growthTips.map((tip: any, i: number) => (
              <div key={i} className="flex items-start gap-[8px] border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner">
                <span className={"text-[10px] px-[6px] py-[2px] rounded-full font-[600] whitespace-nowrap " + (IMPACT_COLORS[tip.impact] || '')}>{IMPACT_LABELS[tip.impact] || tip.impact}</span>
                <div className="flex-1">
                  <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide">{tip.category}</div>
                  <div className="text-[12px] text-newTextColor mt-[2px]">{tip.tip}</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {(ad as any).expectedMetrics ? (
        <CollapsibleSection title="Métricas Esperadas">
          <div className="grid grid-cols-3 gap-[10px] mb-[8px]">
            <div className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner text-center">
              <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide">CTR</div>
              <div className="text-[14px] font-[700] text-newTextColor mt-[2px]">{(ad as any).expectedMetrics.ctr}</div>
            </div>
            <div className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner text-center">
              <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide">CPC</div>
              <div className="text-[14px] font-[700] text-newTextColor mt-[2px]">{(ad as any).expectedMetrics.cpc}</div>
            </div>
            <div className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner text-center">
              <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide">Conversão</div>
              <div className="text-[14px] font-[700] text-newTextColor mt-[2px]">{(ad as any).expectedMetrics.conversionRate}</div>
            </div>
          </div>
          <p className="text-[12px] text-textItemBlur italic">{(ad as any).expectedMetrics.notes}</p>
        </CollapsibleSection>
      ) : null}

      <PolicyWarningsList warnings={(ad as any).policyWarnings || []} />

      {/* Actions */}
      <div className="pt-[4px] flex gap-[8px] flex-wrap">
        {onSave ? (
          <Button secondary loading={saving} onClick={onSave} className="!h-[32px] !text-[12px]">
            Salvar
          </Button>
        ) : null}
        {onDelete ? (
          <Button secondary onClick={onDelete} className="!h-[32px] !text-[12px] !text-red-400 hover:!bg-red-500/10">
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </Button>
        ) : null}
        {onExport ? (
          <Button secondary onClick={onExport} className="!h-[32px] !text-[12px]">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Generate Form                                                      */
/* ------------------------------------------------------------------ */

function GenerateAdsForm({
  brandId,
  templates,
  onGenerated,
  onClose,
  initialObjective,
  initialContext,
  initialVariants = 3,
  contentIdeaId,
  carouselProjectId,
}: {
  brandId?: string;
  templates: any[];
  onGenerated: (batch: AdCreativeBatch) => void;
  onClose: () => void;
  initialObjective?: string;
  initialContext?: string;
  initialVariants?: number;
  contentIdeaId?: string;
  carouselProjectId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentObjective, setContentObjective] = useState(initialObjective || '');
  const [productOrService, setProductOrService] = useState('');
  const [objective, setObjective] = useState('TRAFFIC');
  const [adType, setAdType] = useState<'AUTO' | 'STATIC' | 'CAROUSEL'>('AUTO');
  const [platforms, setPlatforms] = useState<string[]>(['META_INSTAGRAM']);
  const [adTemplateId, setAdTemplateId] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [additionalContext, setAdditionalContext] = useState(initialContext || '');
  const [variants, setVariants] = useState(initialVariants);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleGenerate = async () => {
    if (!brandId || !contentObjective.trim() || !platforms.length) return;
    setLoading(true);
    setError(null);
    try {
      const data = await generateAds({
        brandProfileId: brandId,
        contentObjective: contentObjective.trim(),
        productOrService: productOrService || undefined,
        platforms,
        objective,
        adType,
        adTemplateId: adTemplateId || undefined,
        variants,
        destinationUrl: destinationUrl || undefined,
        additionalContext: additionalContext || undefined,
        contentIdeaId: contentIdeaId || undefined,
        carouselProjectId: carouselProjectId || undefined,
      } as any);
      onGenerated(data);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      {!brandId ? (
        <div className="text-[13px] text-textItemBlur rounded-[10px] border border-newTableBorder bg-newSettings p-[12px]">
          Selecione uma marca no seletor do topo antes de gerar.
        </div>
      ) : null}

      <FormField label="O que promover" required>
        <FormInput value={contentObjective} onChange={(e) => setContentObjective(e.target.value)} placeholder="Ex.: promover o novo curso de IA" />
      </FormField>

      <FormField label="Produto / serviço" hint="Opcional">
        <FormInput value={productOrService} onChange={(e) => setProductOrService(e.target.value)} placeholder="Ex.: curso online de IA" />
      </FormField>

      <div className="flex flex-col gap-[8px]">
        <span className="text-[12px] font-[600] text-newTextColor">Plataformas *</span>
        <div className="flex flex-wrap gap-[6px]">
          {Object.keys(PLATFORM_LABELS).map((p) => (
            <FilterChip key={p} active={platforms.includes(p)} onClick={() => togglePlatform(p)}>
              {PLATFORM_LABELS[p]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <FormField label="Objetivo">
          <FormSelect value={objective} onChange={(e) => setObjective(e.target.value)}>
            {OBJECTIVES.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Tipo">
          <FormSelect value={adType} onChange={(e) => setAdType(e.target.value as any)}>
            {AD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </FormSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <FormField label="Template" hint="Opcional">
          <FormSelect value={adTemplateId} onChange={(e) => setAdTemplateId(e.target.value)}>
            <option value="">Automático</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.label || t.labelEn || t.id}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Variantes">
          <FormInput type="number" min={1} max={5} value={variants} onChange={(e) => setVariants(Number(e.target.value) || 1)} />
        </FormField>
      </div>

      <FormField label="URL de destino" hint="Opcional">
        <FormInput value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://" />
      </FormField>

      <FormField label="Contexto adicional" hint="Opcional">
        <FormTextarea value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} rows={3} />
      </FormField>

      {error ? (
        <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] p-[12px]">{error}</div>
      ) : null}

      <div className="flex justify-end gap-[8px]">
        <Button secondary onClick={onClose}>Cancelar</Button>
        <Button onClick={handleGenerate} loading={loading} disabled={!brandId || !contentObjective.trim() || !platforms.length}>
          Gerar ads
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSV Export                                                         */
/* ------------------------------------------------------------------ */

function exportAdsCsv(ads: (GeneratedAdCreative | SavedAdCreative)[]) {
  const header = ['platform', 'type', 'headline', 'primaryText', 'description', 'ctaButton', 'destinationUrl'];
  const rows = ads.map((ad) =>
    [ad.platform, ad.type, ad.headline, ad.primaryText, ad.description || '', ad.ctaButton, ad.destinationUrl || '']
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ad-kit-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

function AdCreativesPageInner() {
  const { data: selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id as string | undefined;
  const { openCreateDrawer } = useCreateDrawer();
  const prefill = useAmpliarPrefill();
  const toaster = useToaster();

  const { ads: savedAds, isLoading: loadingSaved, mutate: mutateSaved } = useSavedAds(
    brandId ? { brandProfileId: brandId } : undefined
  );
  const { templates } = useAdTemplates();

  const [batch, setBatch] = useState<AdCreativeBatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter saved ads
  const filteredSavedAds = useMemo(() => {
    let result = savedAds;
    if (platformFilter !== 'all') {
      result = result.filter((ad) => ad.platform === platformFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((ad) =>
        ad.headline.toLowerCase().includes(q) ||
        ad.primaryText.toLowerCase().includes(q)
      );
    }
    return result;
  }, [savedAds, platformFilter, search]);

  const generatedAds = batch?.ads || [];
  const hasContent = generatedAds.length > 0 || filteredSavedAds.length > 0;

  const openGenerate = (opts?: { objective?: string; context?: string; ideaId?: string; projectId?: string }) => {
    openCreateDrawer({
      title: 'Gerar kit de anúncios',
      size: 600,
      children: (close) => (
        <GenerateAdsForm
          brandId={brandId || prefill.brandId}
          templates={templates}
          onClose={close}
          onGenerated={(data) => setBatch(data)}
          initialObjective={opts?.objective || prefill.topic || prefill.hook}
          initialContext={opts?.context || buildContextFromPrefill(prefill)}
          contentIdeaId={opts?.ideaId || prefill.ideaId}
          carouselProjectId={opts?.projectId || prefill.projectId}
        />
      ),
    });
  };

  const runAiPath = async (path: AmpliarAiPath) => {
    const bid = brandId || prefill.brandId;
    if (!bid) {
      toaster.show('Selecione uma marca antes de gerar', 'warning');
      return;
    }
    setAiLoadingId(path.id);
    setError(null);
    try {
      const p = path.payload;
      const data = await generateAds({
        brandProfileId: bid,
        contentObjective: String(p.contentObjective || prefill.topic || 'Campanha'),
        platforms: (p.platforms as string[]) || ['META_INSTAGRAM'],
        objective: String(p.objective || 'TRAFFIC'),
        adType: (p.adType as any) || 'AUTO',
        variants: Number(p.variants) || 3,
        destinationUrl: (p.destinationUrl as string) || undefined,
        additionalContext: (p.additionalContext as string) || undefined,
        contentIdeaId: (p.contentIdeaId as string) || prefill.ideaId,
        carouselProjectId: (p.carouselProjectId as string) || prefill.projectId,
      } as any);
      setBatch(data);
      toaster.show('Kit de anúncios gerado com IA', 'success');
    } catch (e: any) {
      setError(e.message || 'Falha ao gerar com IA');
      toaster.show(e.message || 'Falha ao gerar com IA', 'warning');
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleSaveBatch = async () => {
    if (!batch || !brandId) return;
    setSaving(true);
    try {
      await saveAds({ ads: batch, brandProfileId: brandId });
      await mutateSaved();
      setBatch(null);
      toaster.show('Ads salvos', 'success');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingle = async (ad: GeneratedAdCreative) => {
    if (!brandId) return;
    try {
      await saveAds({ ads: { ads: [ad] }, brandProfileId: brandId });
      await mutateSaved();
      toaster.show('Ad salvo', 'success');
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao salvar', 'warning');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAd(id);
      await mutateSaved();
      toaster.show('Ad excluído', 'success');
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao excluir', 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async (ad: SavedAdCreative) => {
    try {
      const data = await exportAd(ad.id, 'META_CSV');
      if (data?.csv) {
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ad-${ad.headline.slice(0, 30)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      await updateAd(ad.id, { status: 'EXPORTED' });
      await mutateSaved();
      toaster.show('Ad exportado', 'success');
    } catch (e: any) {
      // Fallback to client-side CSV
      exportAdsCsv([ad]);
      toaster.show('CSV gerado (client-side)', 'success');
    }
  };

  const platforms = ['all', ...Object.keys(PLATFORM_LABELS)];

  return (
    <PageShell>
      <PageHeader
        description="Kit de anúncios com DNA da marca — preview, policy check e export."
        actions={
          <div className="flex gap-2">
            {generatedAds.length > 0 ? (
              <Button secondary onClick={() => exportAdsCsv(generatedAds)} className="!h-8 !text-xs">
                Baixar CSV
              </Button>
            ) : null}
            <Button onClick={() => openGenerate()}>Gerar ads</Button>
          </div>
        }
      />
      <PageBody className={!hasContent && !loadingSaved ? '!p-0' : undefined}>
        <div className="px-[20px] pt-[12px] max-w-[960px] w-full mx-auto">
          <AmpliarSourceBanner prefill={prefill} />
          <AmpliarAiPaths
            title="Caminhos de anúncio com IA"
            description="A IA escolhe plataforma, objetivo e tom com base na ideia e no DNA."
            paths={buildAdsAiPaths(prefill, selectedBrand as any)}
            loadingId={aiLoadingId}
            disabled={!brandId && !prefill.brandId}
            onSelect={runAiPath}
            onAdvanced={() => openGenerate()}
            advancedLabel="Formulário avançado"
          />
        </div>

        {error ? (
          <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] p-[12px] mx-5">{error}</div>
        ) : null}

        {/* Search + filters */}
        {savedAds.length > 0 && (
          <div className="px-5 pb-2 max-w-[960px] w-full mx-auto flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textItemBlur" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por headline ou texto..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-newBgColorInner border border-newTableBorder rounded-lg text-newTextColor placeholder:text-textItemBlur focus:outline-none focus:border-btnPrimary"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {platforms.map((p) => (
                <FilterChip key={p} active={platformFilter === p} onClick={() => setPlatformFilter(p)}>
                  {p === 'all' ? 'Todas' : PLATFORM_LABELS[p] || p}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {loadingSaved && !hasContent && !aiLoadingId ? (
          <div className="text-[13px] text-textItemBlur py-[40px] text-center">Carregando...</div>
        ) : !hasContent && !aiLoadingId ? (
          <EmptyState
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 7H20M4 12H20M4 17H14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
            title="Escolha um caminho acima"
            description="Ou use o formulário avançado para controlar cada campo."
            actionLabel="Formulário avançado"
            onAction={() => openGenerate()}
          />
        ) : (
          <div className="flex flex-col gap-[20px] px-5 pb-5 max-w-[960px] w-full mx-auto">
            {generatedAds.length > 0 ? (
              <div className="flex flex-col gap-[12px]">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-[600] text-newTextColor">Gerados agora ({generatedAds.length})</div>
                  <div className="flex gap-2">
                    <Button secondary onClick={() => exportAdsCsv(generatedAds)} className="!h-[32px] !text-[12px]">CSV</Button>
                    <Button onClick={handleSaveBatch} loading={saving} className="!h-[32px] !text-[12px]">Salvar todos</Button>
                  </div>
                </div>
                <div className="grid gap-[12px]">
                  {generatedAds.map((ad, i) => (
                    <AdCreativeCard key={`gen-${i}`} ad={ad} onSave={() => handleSaveSingle(ad)} />
                  ))}
                </div>
              </div>
            ) : null}

            {filteredSavedAds.length > 0 ? (
              <div className="flex flex-col gap-[12px]">
                <div className="text-[13px] font-[600] text-newTextColor">
                  Salvos ({filteredSavedAds.length})
                </div>
                <div className="grid gap-[12px]">
                  {filteredSavedAds.map((ad) => (
                    <AdCreativeCard
                      key={ad.id}
                      ad={ad}
                      onDelete={() => handleDelete(ad.id)}
                      onExport={() => handleExport(ad)}
                    />
                  ))}
                </div>
              </div>
            ) : savedAds.length > 0 && filteredSavedAds.length === 0 ? (
              <div className="text-center py-8 text-sm text-textItemBlur">Nenhum ad encontrado com os filtros atuais.</div>
            ) : null}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}

export function AdCreativesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-textItemBlur">Carregando anúncios...</div>}>
      <AdCreativesPageInner />
    </Suspense>
  );
}
