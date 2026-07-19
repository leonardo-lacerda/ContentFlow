'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
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
import {
  buildContextFromPrefill,
  useAmpliarPrefill,
} from '@gitroom/frontend/components/ampliar/use-ampliar-prefill';
import { AmpliarSourceBanner } from '@gitroom/frontend/components/ampliar/ampliar-source-banner.component';
import { AmpliarAiPaths } from '@gitroom/frontend/components/ampliar/ampliar-ai-paths.component';
import {
  buildEmailAiPaths,
  type AmpliarAiPath,
} from '@gitroom/frontend/components/ampliar/ampliar-ai-presets';
import { useToaster } from '@gitroom/react/toaster/toaster';

type CampaignType = 'NEWSLETTER' | 'WELCOME_SEQUENCE' | 'PROMOTIONAL';
type CampaignStatus = 'DRAFT' | 'GENERATING' | 'READY' | 'EXPORTED' | 'FAILED';

interface EmailCampaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string;
  preheader?: string;
  bodyHtml: string;
  bodyJson?: { blocks: any[] };
  ctaText?: string;
  ctaUrl?: string;
  ctaColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  sequenceIndex?: number;
  sequenceTotal?: number;
  sequenceDelayDays?: number;
  exportCount: number;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  category: string;
  exampleSubjects: string[];
}

const typeLabel = (type: CampaignType) => {
  switch (type) {
    case 'NEWSLETTER':
      return 'Newsletter';
    case 'WELCOME_SEQUENCE':
      return 'Boas-vindas';
    case 'PROMOTIONAL':
      return 'Promocional';
    default:
      return type;
  }
};

const statusClass = (status: CampaignStatus) => {
  switch (status) {
    case 'READY':
      return 'bg-emerald-500/15 text-emerald-400';
    case 'EXPORTED':
      return 'bg-btnPrimary/20 text-newTextColor';
    case 'GENERATING':
      return 'bg-amber-500/15 text-amber-400';
    case 'FAILED':
      return 'bg-red-500/15 text-red-400';
    default:
      return 'bg-newSettings text-textItemBlur border border-newTableBorder';
  }
};

function GenerateCampaignForm({
  brandId,
  templates,
  onDone,
  onClose,
  initialType,
  initialName,
  initialContext,
  contentIdeaId,
  carouselProjectId,
}: {
  brandId?: string;
  templates: EmailTemplate[];
  onDone: () => void;
  onClose: () => void;
  initialType?: string;
  initialName?: string;
  initialContext?: string;
  contentIdeaId?: string;
  carouselProjectId?: string;
}) {
  const fetch = useFetch();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedType = (initialType || 'welcome_sequence').toLowerCase();
  const [campaignType, setCampaignType] = useState(
    normalizedType.includes('welcome')
      ? 'welcome_sequence'
      : normalizedType.includes('promo')
        ? 'promotional'
        : normalizedType === 'newsletter'
          ? 'newsletter'
          : 'welcome_sequence'
  );
  const [campaignName, setCampaignName] = useState(initialName || '');
  const [templateId, setTemplateId] = useState('');
  const [additionalContext, setAdditionalContext] = useState(initialContext || '');
  const [sequenceLength, setSequenceLength] = useState(4);

  const handleGenerate = async () => {
    if (!brandId) return;
    if (campaignType !== 'welcome_sequence' && !campaignName.trim()) return;

    setGenerating(true);
    setError(null);
    try {
      const endpoint =
        campaignType === 'welcome_sequence'
          ? '/email-campaigns/generate-welcome-sequence'
          : '/email-campaigns/generate';

      const body =
        campaignType === 'welcome_sequence'
          ? {
              brandProfileId: brandId,
              sequenceLength,
              additionalContext,
              contentIdeaId,
              carouselProjectId,
            }
          : {
              brandProfileId: brandId,
              campaignType,
              name: campaignName.trim(),
              templateId: templateId || undefined,
              additionalContext,
              contentIdeaId,
              carouselProjectId,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Falha ao gerar campanha');
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      {!brandId ? (
        <div className="text-[13px] text-textItemBlur rounded-[10px] border border-newTableBorder bg-newSettings p-[12px]">
          Selecione uma marca no seletor do topo antes de gerar.
        </div>
      ) : null}

      <FormField label="Tipo">
        <FormSelect
          value={campaignType}
          onChange={(e) => setCampaignType(e.target.value)}
        >
          <option value="newsletter">Newsletter</option>
          <option value="promotional">Promocional</option>
          <option value="welcome_sequence">Sequência de boas-vindas</option>
        </FormSelect>
      </FormField>

      {campaignType !== 'welcome_sequence' ? (
        <FormField label="Nome da campanha" required>
          <FormInput
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Ex.: Newsletter de março"
          />
        </FormField>
      ) : (
        <FormField label="Tamanho da sequência">
          <FormInput
            type="number"
            min={2}
            max={8}
            value={sequenceLength}
            onChange={(e) => setSequenceLength(Number(e.target.value) || 3)}
          />
        </FormField>
      )}

      {templates.length > 0 && campaignType !== 'welcome_sequence' ? (
        <FormField label="Template" hint="Opcional">
          <FormSelect
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Automático</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label || t.labelEn}
              </option>
            ))}
          </FormSelect>
        </FormField>
      ) : null}

      <FormField label="Contexto adicional" hint="Opcional">
        <FormTextarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          rows={3}
          placeholder="Temas, ofertas, tom..."
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
          loading={generating}
          disabled={
            !brandId ||
            (campaignType !== 'welcome_sequence' && !campaignName.trim())
          }
        >
          Gerar campanha
        </Button>
      </div>
    </div>
  );
}

function PreviewPanel({
  campaign,
  html,
  onClose,
  onExport,
}: {
  campaign: EmailCampaign;
  html: string | null;
  onClose: () => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-[14px]">
      <div>
        <div className="text-[14px] font-[600] text-newTextColor">
          {campaign.name}
        </div>
        <div className="text-[12px] text-textItemBlur mt-[2px]">
          Assunto: {campaign.subject}
          {campaign.preheader ? ` · Preheader: ${campaign.preheader}` : ''}
        </div>
      </div>
      <div className="rounded-[10px] border border-newTableBorder bg-white overflow-hidden min-h-[280px] max-h-[55vh] overflow-y-auto">
        {html ? (
          <iframe
            title="preview"
            srcDoc={html}
            className="w-full min-h-[400px] border-0 bg-white"
          />
        ) : (
          <div className="p-[20px] text-[13px] text-textItemBlur">
            Carregando preview...
          </div>
        )}
      </div>
      <div className="flex justify-end gap-[8px]">
        <Button secondary onClick={onClose}>
          Fechar
        </Button>
        <Button onClick={onExport}>Exportar HTML</Button>
      </div>
    </div>
  );
}

function EmailCampaignsPageInner() {
  const fetch = useFetch();
  const { data: selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id as string | undefined;
  const { openCreateDrawer } = useCreateDrawer();
  const prefill = useAmpliarPrefill();
  const toaster = useToaster();

  const [activeTab, setActiveTab] = useState<'all' | CampaignType>('all');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const query = activeTab !== 'all' ? `?type=${activeTab}` : '';
      const res = await fetch(`/email-campaigns${query}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : data?.items || []);
      }
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [fetch, activeTab]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/email-campaigns/templates');
        if (res.ok) setTemplates(await res.json());
      } catch {
        /* ignore */
      }
    })();
  }, [fetch]);

  const handleExport = async (campaign: EmailCampaign) => {
    try {
      const res = await fetch(`/email-campaigns/${campaign.id}/export`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `${campaign.name}.html`;
        a.click();
        URL.revokeObjectURL(url);
        loadCampaigns();
      }
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    try {
      await fetch(`/email-campaigns/${id}`, { method: 'DELETE' });
      loadCampaigns();
    } catch {
      /* ignore */
    }
  };

  const openGenerate = () => {
    openCreateDrawer({
      title: 'Gerar campanha de e-mail',
      size: 560,
      children: (close) => (
        <GenerateCampaignForm
          brandId={brandId || prefill.brandId}
          templates={templates}
          onClose={close}
          onDone={loadCampaigns}
          initialType={prefill.emailType || (prefill.hasSource ? 'promotional' : 'welcome_sequence')}
          initialName={prefill.topic || ''}
          initialContext={buildContextFromPrefill(prefill)}
          contentIdeaId={prefill.ideaId}
          carouselProjectId={prefill.projectId}
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
    try {
      const p = path.payload;
      const mode = String(p.mode || 'welcome_sequence');
      const endpoint =
        mode === 'welcome_sequence'
          ? '/email-campaigns/generate-welcome-sequence'
          : '/email-campaigns/generate';
      const body =
        mode === 'welcome_sequence'
          ? {
              brandProfileId: bid,
              sequenceLength: Number(p.sequenceLength) || 4,
              additionalContext: p.additionalContext,
              contentIdeaId: p.contentIdeaId || prefill.ideaId,
              carouselProjectId: p.carouselProjectId || prefill.projectId,
            }
          : {
              brandProfileId: bid,
              campaignType: p.campaignType || mode,
              name: String(p.name || prefill.topic || 'Campanha'),
              additionalContext: p.additionalContext,
              contentIdeaId: p.contentIdeaId || prefill.ideaId,
              carouselProjectId: p.carouselProjectId || prefill.projectId,
            };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.msg || 'Falha ao gerar e-mail');
      }
      toaster.show('Campanha gerada com IA', 'success');
      await loadCampaigns();
    } catch (e: any) {
      toaster.show(e.message || 'Falha ao gerar com IA', 'warning');
    } finally {
      setAiLoadingId(null);
    }
  };

  const openPreview = async (campaign: EmailCampaign) => {
    let html: string | null = campaign.bodyHtml || null;
    try {
      const res = await fetch(`/email-campaigns/${campaign.id}/preview`);
      if (res.ok) {
        const data = await res.json();
        html = data.html || html;
      }
    } catch {
      /* keep bodyHtml */
    }

    openCreateDrawer({
      title: 'Preview da campanha',
      size: 800,
      children: (close) => (
        <PreviewPanel
          campaign={campaign}
          html={html}
          onClose={close}
          onExport={() => handleExport(campaign)}
        />
      ),
    });
  };

  const tabs: Array<{ id: 'all' | CampaignType; label: string }> = [
    { id: 'all', label: 'Todas' },
    { id: 'NEWSLETTER', label: 'Newsletter' },
    { id: 'WELCOME_SEQUENCE', label: 'Boas-vindas' },
    { id: 'PROMOTIONAL', label: 'Promocional' },
  ];

  return (
    <PageShell>
      <PageHeader
        description="Newsletters, sequências de boas-vindas e e-mails promocionais gerados com a voz da marca."
        tabs={tabs.map((t) => (
          <FilterChip
            key={t.id}
            active={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </FilterChip>
        ))}
        actions={<Button onClick={openGenerate}>Gerar campanha</Button>}
      />
      <PageBody className={!loading && campaigns.length === 0 ? '!p-0' : undefined}>
        <div className="px-5 pt-3 max-w-[960px] w-full mx-auto">
          <AmpliarSourceBanner prefill={prefill} />
          <AmpliarAiPaths
            title="Caminhos de e-mail com IA"
            description="Boas-vindas, promo da ideia ou newsletter — a IA usa o DNA e o hook sem você montar brief."
            paths={buildEmailAiPaths(prefill)}
            loadingId={aiLoadingId}
            disabled={!brandId && !prefill.brandId}
            onSelect={runAiPath}
            onAdvanced={openGenerate}
            advancedLabel="Formulário avançado"
          />
        </div>
        {loading ? (
          <div className="text-[13px] text-textItemBlur py-[40px] text-center">
            Carregando campanhas...
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6H20V18H4V6Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 7L12 13L20 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="Escolha um caminho de e-mail acima"
            description="Welcome, promo da ideia ou newsletter — ou abra o formulário avançado."
            actionLabel="Formulário avançado"
            onAction={openGenerate}
          />
        ) : (
          <div className="flex flex-col gap-[10px]">
            {campaigns.map((campaign) => (
              <SectionCard
                key={campaign.id}
                className="!p-[14px] flex items-center gap-[12px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[8px] flex-wrap mb-[4px]">
                    <span className="text-[14px] font-[600] text-newTextColor truncate">
                      {campaign.name}
                    </span>
                    <span
                      className={`text-[11px] px-[8px] py-[2px] rounded-full font-[600] ${statusClass(
                        campaign.status
                      )}`}
                    >
                      {campaign.status}
                    </span>
                    <span className="text-[11px] px-[8px] py-[2px] rounded-[6px] bg-newSettings border border-newTableBorder text-textItemBlur">
                      {typeLabel(campaign.type)}
                    </span>
                  </div>
                  <div className="text-[12px] text-textItemBlur truncate">
                    Assunto: {campaign.subject}
                    {campaign.sequenceIndex !== undefined &&
                    campaign.sequenceTotal !== undefined
                      ? ` · E-mail ${campaign.sequenceIndex + 1}/${
                          campaign.sequenceTotal
                        }`
                      : ''}
                  </div>
                  <div className="text-[11px] text-textItemBlur mt-[4px]">
                    {new Date(campaign.createdAt).toLocaleDateString('pt-BR')} ·{' '}
                    {campaign.exportCount} exports
                  </div>
                </div>
                <div className="flex items-center gap-[8px] shrink-0">
                  <Button
                    secondary
                    className="!h-[32px] !text-[12px]"
                    onClick={() => openPreview(campaign)}
                  >
                    Preview
                  </Button>
                  <Button
                    secondary
                    className="!h-[32px] !text-[12px]"
                    onClick={() => handleExport(campaign)}
                  >
                    Exportar
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(campaign.id)}
                    className="text-[12px] text-textItemBlur hover:text-red-400 px-[8px] h-[32px]"
                  >
                    Excluir
                  </button>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}

export function EmailCampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-textItemBlur">Carregando e-mails…</div>
      }
    >
      <EmailCampaignsPageInner />
    </Suspense>
  );
}
