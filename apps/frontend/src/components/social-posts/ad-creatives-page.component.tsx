'use client';

import React, { Suspense, useEffect, useState } from 'react';
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
  AdTemplateSummary,
  PolicyWarning,
} from '../ads/ads.types';
import {
  generateAds,
  saveAds,
  listAds,
  getAdTemplates,
} from '../ads/ads.service';
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
function PolicyWarningsList({ warnings }: { warnings: PolicyWarning[] }) {
  if (!warnings?.length) return null;
  return (
    <div className="mt-[8px] flex flex-col gap-[6px]">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="text-[12px] rounded-[8px] border border-newTableBorder bg-newBgColorInner p-[10px] text-textItemBlur"
        >
          <span className="font-[600] text-newTextColor">[{w.ruleId}]</span>{' '}
          {w.message}
          {w.suggestion ? (
            <div className="mt-[4px] opacity-80">Sugestão: {w.suggestion}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function AdCreativeCard({
  ad,
  onSave,
  saving,
}: {
  ad: GeneratedAdCreative;
  onSave?: () => void;
  saving?: boolean;
}) {
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
        {ad.policyWarnings?.some((w) => w.severity === 'critical') ? (
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

      {/* Strategic Rationale */}
      {(ad as any).rationale ? (
        <CollapsibleSection title="Estratégia" defaultOpen={true} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          <div className="flex flex-col gap-[10px]">
            <div><div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[4px]">Por que esta abordagem funciona</div><p className="text-[13px] text-newTextColor">{(ad as any).rationale}</p></div>
            {(ad as any).emotionalHook ? <div><div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[4px]">Gatilho Emocional</div><p className="text-[13px] text-newTextColor">{(ad as any).emotionalHook}</p></div> : null}
            {(ad as any).platformOptimization ? <div><div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[4px]">Otimização para a Plataforma</div><p className="text-[13px] text-newTextColor">{(ad as any).platformOptimization}</p></div> : null}
          </div>
        </CollapsibleSection>
      ) : null}

      {/* Targeting */}
      {(ad as any).targeting && (ad as any).targeting.length > 0 ? (
        <CollapsibleSection title="Público-Alvo" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          <div className="flex flex-col gap-[10px]">
            {(ad as any).targeting.map((t: any, i: number) => (
              <div key={i} className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner">
                <div className="text-[13px] font-[600] text-newTextColor mb-[4px]">{t.audience}</div>
                <div className="text-[12px] text-textItemBlur mb-[4px]"><b>Demográficos:</b> {t.demographics}</div>
                <div className="text-[12px] text-textItemBlur mb-[4px]"><b>Interesses:</b> {t.interests.join(", ")}</div>
                {t.exclusions && t.exclusions.length > 0 ? <div className="text-[12px] text-textItemBlur mb-[4px]"><b>Exclusões:</b> {t.exclusions.join(", ")}</div> : null}
                <div className="text-[12px] text-newTextColor mt-[4px] italic">{t.rationale}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {/* Image Prompts */}
      {ad.imagePrompts && ad.imagePrompts.length > 0 ? (
        <CollapsibleSection title="Direção Visual" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}>
          <div className="flex flex-col gap-[8px]">
            {ad.imagePrompts.map((ip: any, i: number) => (
              <div key={i} className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner">
                <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[4px]">{ip.role}</div>
                <p className="text-[12px] text-newTextColor">{ip.prompt}</p>
                {ip.aspectRatio ? <span className="text-[11px] text-textItemBlur mt-[4px] inline-block">Ratio: {ip.aspectRatio}</span> : null}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {/* A/B Tests */}
      {(ad as any).abTests && (ad as any).abTests.length > 0 ? (
        <CollapsibleSection title="Testes A/B" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          <div className="flex flex-col gap-[8px]">
            {(ad as any).abTests.map((test: any, i: number) => (
              <div key={i} className="border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner">
                <div className="text-[12px] font-[600] text-newTextColor mb-[4px]">Testar: {test.variant}</div>
                <div className="text-[12px] text-textItemBlur mb-[2px]"><b>Atual:</b> {test.currentValue}</div>
                <div className="text-[12px] text-textItemBlur mb-[4px]"><b>Alternativa:</b> {test.suggestedAlternative}</div>
                <div className="text-[12px] text-newTextColor italic">{test.hypothesis}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {/* Growth Tips */}
      {(ad as any).growthTips && (ad as any).growthTips.length > 0 ? (
        <CollapsibleSection title="Dicas de Crescimento" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          <div className="flex flex-col gap-[8px]">
            {(ad as any).growthTips.map((tip: any, i: number) => (
              <div key={i} className="flex items-start gap-[8px] border border-newTableBorder rounded-[8px] p-[10px] bg-newBgColorInner">
                <span className={"text-[10px] px-[6px] py-[2px] rounded-full font-[600] whitespace-nowrap " + (IMPACT_COLORS[tip.impact] || "")}>{IMPACT_LABELS[tip.impact] || tip.impact}</span>
                <div className="flex-1">
                  <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide">{tip.category}</div>
                  <div className="text-[12px] text-newTextColor mt-[2px]">{tip.tip}</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {/* Expected Metrics */}
      {(ad as any).expectedMetrics ? (
        <CollapsibleSection title="Métricas Esperadas" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
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

      {/* Pre-Launch Checklist */}
      {(ad as any).preLaunchChecklist && (ad as any).preLaunchChecklist.length > 0 ? (
        <CollapsibleSection title="Checklist Pré-Lançamento" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          <div className="flex flex-col gap-[6px]">
            {(ad as any).preLaunchChecklist.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-[8px] text-[12px] text-newTextColor">
                <span className="text-btnPrimary mt-[1px]">&#9744;</span><span>{item}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      <PolicyWarningsList warnings={ad.policyWarnings || []} />

      {onSave ? (
        <div className="pt-[4px] flex gap-[8px]">
          <Button secondary loading={saving} onClick={onSave} className="!h-[32px] !text-[12px]">Salvar</Button>
        </div>
      ) : null}
    </SectionCard>
  );
}

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
  templates: AdTemplateSummary[];
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
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
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
        <FormInput
          value={contentObjective}
          onChange={(e) => setContentObjective(e.target.value)}
          placeholder="Ex.: promover o novo curso de IA"
        />
      </FormField>

      <FormField label="Produto / serviço" hint="Opcional">
        <FormInput
          value={productOrService}
          onChange={(e) => setProductOrService(e.target.value)}
          placeholder="Ex.: curso online de IA"
        />
      </FormField>

      <div className="flex flex-col gap-[8px]">
        <span className="text-[12px] font-[600] text-newTextColor">
          Plataformas *
        </span>
        <div className="flex flex-wrap gap-[6px]">
          {Object.keys(PLATFORM_LABELS).map((p) => (
            <FilterChip
              key={p}
              active={platforms.includes(p)}
              onClick={() => togglePlatform(p)}
            >
              {PLATFORM_LABELS[p]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <FormField label="Objetivo">
          <FormSelect
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            {OBJECTIVES.map((o) => (
              <option key={o} value={o}>
                {o.replace(/_/g, ' ')}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Tipo">
          <FormSelect
            value={adType}
            onChange={(e) =>
              setAdType(e.target.value as 'AUTO' | 'STATIC' | 'CAROUSEL')
            }
          >
            {AD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FormSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <FormField label="Template" hint="Opcional">
          <FormSelect
            value={adTemplateId}
            onChange={(e) => setAdTemplateId(e.target.value)}
          >
            <option value="">Automático</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label || t.labelEn || t.id}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Variantes">
          <FormInput
            type="number"
            min={1}
            max={5}
            value={variants}
            onChange={(e) => setVariants(Number(e.target.value) || 1)}
          />
        </FormField>
      </div>

      <FormField label="URL de destino" hint="Opcional">
        <FormInput
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://"
        />
      </FormField>

      <FormField label="Contexto adicional" hint="Opcional">
        <FormTextarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          rows={3}
        />
      </FormField>

      {error ? (
        <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] p-[12px]">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-[8px]">
        <Button secondary onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleGenerate}
          loading={loading}
          disabled={!brandId || !contentObjective.trim() || !platforms.length}
        >
          Gerar ads
        </Button>
      </div>
    </div>
  );
}

function exportAdsCsv(ads: GeneratedAdCreative[]) {
  const header = [
    'platform',
    'type',
    'headline',
    'primaryText',
    'description',
    'ctaButton',
    'destinationUrl',
  ];
  const rows = ads.map((ad) =>
    [
      ad.platform,
      ad.type,
      ad.headline,
      ad.primaryText,
      ad.description || '',
      ad.ctaButton,
      ad.destinationUrl || '',
    ]
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

function AdCreativesPageInner() {
  const { data: selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id as string | undefined;
  const { openCreateDrawer } = useCreateDrawer();
  const prefill = useAmpliarPrefill();
  const toaster = useToaster();

  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<AdCreativeBatch | null>(null);
  const [savedAds, setSavedAds] = useState<any[]>([]);
  const [templates, setTemplates] = useState<AdTemplateSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  useEffect(() => {
    getAdTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingList(true);
      try {
        if (!brandId) {
          if (mounted) setSavedAds([]);
          return;
        }
        const ads = await listAds({ brandProfileId: brandId });
        if (mounted) setSavedAds(Array.isArray(ads) ? ads : []);
      } catch {
        if (mounted) setSavedAds([]);
      } finally {
        if (mounted) setLoadingList(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [brandId]);

  const openGenerate = (opts?: {
    objective?: string;
    context?: string;
    ideaId?: string;
    projectId?: string;
  }) => {
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
          initialVariants={3}
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
    setError(null);
    try {
      const saved = await saveAds({ ads: batch, brandProfileId: brandId });
      setSavedAds((prev) => [...(Array.isArray(saved) ? saved : []), ...prev]);
      setBatch(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generatedAds = batch?.ads || [];
  const hasContent = generatedAds.length > 0 || savedAds.length > 0;

  return (
    <PageShell>
      <PageHeader
        description="Kit de anúncios com DNA da marca — preview, policy check e export CSV."
        actions={
          <div className="flex gap-2">
            {generatedAds.length > 0 ? (
              <Button secondary onClick={() => exportAdsCsv(generatedAds)}>
                Baixar kit CSV
              </Button>
            ) : null}
            <Button onClick={() => openGenerate()}>Gerar ads</Button>
          </div>
        }
      />
      <PageBody className={!hasContent && !loadingList ? '!p-0' : undefined}>
        <div className="px-[20px] pt-[12px] max-w-[960px] w-full mx-auto">
          <AmpliarSourceBanner prefill={prefill} />
          <AmpliarAiPaths
            title="Caminhos de anúncio com IA"
            description="A IA escolhe plataforma, objetivo e tom com base na ideia e no DNA. Um clique gera 3 variações."
            paths={buildAdsAiPaths(prefill, selectedBrand as any)}
            loadingId={aiLoadingId}
            disabled={!brandId && !prefill.brandId}
            onSelect={runAiPath}
            onAdvanced={() => openGenerate()}
            advancedLabel="Formulário avançado"
          />
        </div>
        {error ? (
          <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] p-[12px] mx-5">
            {error}
          </div>
        ) : null}

        {loadingList && !hasContent && !aiLoadingId ? (
          <div className="text-[13px] text-textItemBlur py-[40px] text-center">
            Carregando...
          </div>
        ) : !hasContent && !aiLoadingId ? (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7H20M4 12H20M4 17H14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            }
            title="Escolha um caminho acima"
            description="Ou use o formulário avançado se quiser controlar cada campo."
            actionLabel="Formulário avançado"
            onAction={() => openGenerate()}
          />
        ) : (
          <div className="flex flex-col gap-[20px]">
            {generatedAds.length > 0 ? (
              <div className="flex flex-col gap-[12px]">
                <div className="flex items-center justify-between gap-[12px]">
                  <div className="text-[13px] font-[600] text-newTextColor">
                    Gerados agora ({generatedAds.length})
                  </div>
                  <div className="flex gap-2">
                    <Button
                      secondary
                      onClick={() => exportAdsCsv(generatedAds)}
                      className="!h-[32px] !text-[12px]"
                    >
                      Export CSV
                    </Button>
                    <Button
                      onClick={handleSaveBatch}
                      loading={saving}
                      className="!h-[32px] !text-[12px]"
                    >
                      Salvar todos
                    </Button>
                  </div>
                </div>
                <div className="grid gap-[12px]">
                  {generatedAds.map((ad: GeneratedAdCreative, i: number) => (
                    <AdCreativeCard key={`gen-${i}`} ad={ad} />
                  ))}
                </div>
              </div>
            ) : null}

            {savedAds.length > 0 ? (
              <div className="flex flex-col gap-[12px]">
                <div className="text-[13px] font-[600] text-newTextColor">
                  Salvos ({savedAds.length})
                </div>
                <div className="grid gap-[12px]">
                  {savedAds.map((ad: any, i: number) => (
                    <AdCreativeCard
                      key={ad.id || `saved-${i}`}
                      ad={ad as GeneratedAdCreative}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}

export function AdCreativesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-textItemBlur">Carregando anúncios…</div>
      }
    >
      <AdCreativesPageInner />
    </Suspense>
  );
}
