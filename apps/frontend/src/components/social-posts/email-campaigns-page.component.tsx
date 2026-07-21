'use client';

import React, { Suspense, useState, useMemo } from 'react';
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
import { Pencil, Copy, Trash2, Eye, Download, Search } from 'lucide-react';
import { useEmailCampaigns } from './email-campaigns.hooks';
import { emailCampaignsApi } from './email-campaigns.api';
import {
  type EmailCampaign,
  type EmailCampaignType,
  EMAIL_TYPE_LABELS,
  EMAIL_STATUS_LABELS,
  EMAIL_STATUS_COLORS,
} from './email-campaigns.types';
import { EmailBlockEditor } from './email-block-editor.component';
import { EmailPreviewPanel } from './email-preview-panel.component';

/* ------------------------------------------------------------------ */
/*  Generate Form (drawer)                                            */
/* ------------------------------------------------------------------ */

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
  templates: Array<{ id: string; label: string; labelEn: string }>;
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
      if (campaignType === 'welcome_sequence') {
        await emailCampaignsApi.generateWelcomeSequence(fetch, {
          brandProfileId: brandId,
          sequenceLength,
          additionalContext: additionalContext || undefined,
          contentIdeaId,
          carouselProjectId,
        });
      } else {
        await emailCampaignsApi.generate(fetch, {
          brandProfileId: brandId,
          campaignType,
          name: campaignName.trim(),
          templateId: templateId || undefined,
          additionalContext: additionalContext || undefined,
          contentIdeaId,
          carouselProjectId,
        });
      }
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!brandId ? (
        <div className="text-[13px] text-textItemBlur rounded-[10px] border border-newTableBorder bg-newSettings p-3">
          Selecione uma marca no seletor do topo antes de gerar.
        </div>
      ) : null}

      <FormField label="Tipo">
        <FormSelect value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
          <option value="newsletter">Newsletter</option>
          <option value="promotional">Promocional</option>
          <option value="welcome_sequence">Sequência de boas-vindas</option>
        </FormSelect>
      </FormField>

      {campaignType !== 'welcome_sequence' ? (
        <FormField label="Nome da campanha" required>
          <FormInput value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex.: Newsletter de março" />
        </FormField>
      ) : (
        <FormField label="Tamanho da sequência">
          <FormInput type="number" min={2} max={8} value={sequenceLength} onChange={(e) => setSequenceLength(Number(e.target.value) || 3)} />
        </FormField>
      )}

      {templates.length > 0 && campaignType !== 'welcome_sequence' ? (
        <FormField label="Template" hint="Opcional">
          <FormSelect value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Automático</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.label || t.labelEn}</option>
            ))}
          </FormSelect>
        </FormField>
      ) : null}

      <FormField label="Contexto adicional" hint="Opcional">
        <FormTextarea value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} rows={3} placeholder="Temas, ofertas, tom..." />
      </FormField>

      {error ? (
        <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] p-3">{error}</div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button secondary onClick={onClose}>Cancelar</Button>
        <Button onClick={handleGenerate} loading={generating} disabled={!brandId || (campaignType !== 'welcome_sequence' && !campaignName.trim())}>
          Gerar campanha
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

function EmailCampaignsPageInner() {
  const fetch = useFetch();
  const { data: selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id as string | undefined;
  const { openCreateDrawer } = useCreateDrawer();
  const prefill = useAmpliarPrefill();
  const toaster = useToaster();

  const [activeTab, setActiveTab] = useState<'all' | EmailCampaignType>('all');
  const [search, setSearch] = useState('');
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; label: string; labelEn: string }>>([]);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const tabType = activeTab === 'all' ? undefined : activeTab;
  const { campaigns, isLoading, mutate } = useEmailCampaigns(tabType);

  // Load templates once
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/email-campaigns/templates');
        if (res.ok) setTemplates(await res.json());
      } catch { /* ignore */ }
    })();
  }, [fetch]);

  // Client-side search filter
  const filteredCampaigns = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        (c.preheader || '').toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  /* -- Handlers ---------------------------------------------------- */

  const openGenerate = () => {
    openCreateDrawer({
      title: 'Gerar campanha de e-mail',
      size: 560,
      children: (close) => (
        <GenerateCampaignForm
          brandId={brandId || prefill.brandId}
          templates={templates}
          onClose={close}
          onDone={() => mutate()}
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
      if (mode === 'welcome_sequence') {
        await emailCampaignsApi.generateWelcomeSequence(fetch, {
          brandProfileId: bid,
          sequenceLength: Number(p.sequenceLength) || 4,
          additionalContext: String(p.additionalContext || ''),
          contentIdeaId: String(p.contentIdeaId || prefill.ideaId || ''),
          carouselProjectId: String(p.carouselProjectId || prefill.projectId || ''),
        });
      } else {
        await emailCampaignsApi.generate(fetch, {
          brandProfileId: bid,
          campaignType: String(p.campaignType || mode),
          name: String(p.name || prefill.topic || 'Campanha'),
          additionalContext: String(p.additionalContext || ''),
          contentIdeaId: String(p.contentIdeaId || prefill.ideaId || ''),
          carouselProjectId: String(p.carouselProjectId || prefill.projectId || ''),
        });
      }
      toaster.show('Campanha gerada com IA', 'success');
      await mutate();
    } catch (e: any) {
      toaster.show(e.message || 'Falha ao gerar com IA', 'warning');
    } finally {
      setAiLoadingId(null);
    }
  };

  const openPreview = (campaign: EmailCampaign) => {
    openCreateDrawer({
      title: 'Preview da campanha',
      size: 800,
      children: (close) => (
        <EmailPreviewPanel campaign={campaign} onClose={close} />
      ),
    });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await emailCampaignsApi.delete(fetch, id);
      await mutate();
      toaster.show('Campanha excluída', 'success');
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao excluir', 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (campaign: EmailCampaign) => {
    try {
      await emailCampaignsApi.generate(fetch, {
        brandProfileId: campaign.brandProfileId || brandId || '',
        campaignType: campaign.type.toLowerCase(),
        name: `${campaign.name} (cópia)`,
        additionalContext: `Replicar a campanha "${campaign.name}" com o mesmo conteúdo e estilo.`,
      });
      await mutate();
      toaster.show('Campanha duplicada', 'success');
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao duplicar', 'warning');
    }
  };

  /* -- Tabs -------------------------------------------------------- */

  const tabs: Array<{ id: 'all' | EmailCampaignType; label: string }> = [
    { id: 'all', label: 'Todas' },
    { id: 'NEWSLETTER', label: 'Newsletter' },
    { id: 'WELCOME_SEQUENCE', label: 'Boas-vindas' },
    { id: 'PROMOTIONAL', label: 'Promocional' },
  ];

  /* -- Render ------------------------------------------------------ */

  return (
    <PageShell>
      <PageHeader
        description="Newsletters, sequências de boas-vindas e e-mails promocionais gerados com a voz da marca."
        tabs={tabs.map((t) => (
          <FilterChip key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </FilterChip>
        ))}
        actions={<Button onClick={openGenerate}>Gerar campanha</Button>}
      />
      <PageBody className={!isLoading && filteredCampaigns.length === 0 ? '!p-0' : undefined}>
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

        {/* Search bar */}
        {campaigns.length > 0 && (
          <div className="px-5 pb-2 max-w-[960px] w-full mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textItemBlur" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou assunto..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-newBgColorInner border border-newTableBorder rounded-lg text-newTextColor placeholder:text-textItemBlur focus:outline-none focus:border-btnPrimary"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-[13px] text-textItemBlur py-10 text-center">Carregando campanhas...</div>
        ) : filteredCampaigns.length === 0 && !aiLoadingId ? (
          <EmptyState
            icon={<span className="text-lg">&#9993;</span>}
            title="Escolha um caminho de e-mail acima"
            description="Welcome, promo da ideia ou newsletter — ou abra o formulário avançado."
            actionLabel="Formulário avançado"
            onAction={openGenerate}
          />
        ) : filteredCampaigns.length === 0 && aiLoadingId ? (
          <div className="text-[13px] text-textItemBlur py-10 text-center">Gerando campanha com IA...</div>
        ) : (
          <div className="flex flex-col gap-2.5 px-5 pb-5 max-w-[960px] w-full mx-auto">
            {filteredCampaigns.map((campaign) => (
              <SectionCard key={campaign.id} className="!p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold text-newTextColor truncate">{campaign.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${EMAIL_STATUS_COLORS[campaign.status]}`}>
                        {EMAIL_STATUS_LABELS[campaign.status]}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-newSettings border border-newTableBorder text-textItemBlur">
                        {EMAIL_TYPE_LABELS[campaign.type]}
                      </span>
                    </div>
                    <p className="text-xs text-textItemBlur truncate">
                      Assunto: {campaign.subject}
                      {campaign.sequenceIndex != null && campaign.sequenceTotal != null
                        ? ` · E-mail ${campaign.sequenceIndex + 1}/${campaign.sequenceTotal}`
                        : ''}
                    </p>
                    {campaign.preheader ? (
                      <p className="text-[11px] text-textItemBlur/60 truncate mt-0.5">{campaign.preheader}</p>
                    ) : null}
                    <p className="text-[11px] text-textItemBlur mt-1">
                      {campaign.bodyJson?.blocks?.length || 0} blocos · {campaign.exportCount} exports ·{' '}
                      {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <Button secondary className="!h-7 !text-xs" onClick={() => setEditingCampaign(campaign)}>
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>
                    <Button secondary className="!h-7 !text-xs" onClick={() => openPreview(campaign)}>
                      <Eye className="w-3 h-3" /> Preview
                    </Button>
                    <Button secondary className="!h-7 !text-xs" onClick={() => handleDuplicate(campaign)}>
                      <Copy className="w-3 h-3" /> Duplicar
                    </Button>
                    <Button
                      secondary
                      className="!h-7 !text-xs !text-red-400 hover:!bg-red-500/10"
                      loading={deletingId === campaign.id}
                      onClick={() => handleDelete(campaign.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </PageBody>

      {/* Block editor (fullscreen) */}
      {editingCampaign ? (
        <EmailBlockEditor
          campaign={editingCampaign}
          onSaved={() => {
            mutate();
            setEditingCampaign(null);
          }}
          onClose={() => setEditingCampaign(null)}
        />
      ) : null}

      {/* Preview panel handled via openPreview below */}
    </PageShell>
  );
}

export function EmailCampaignsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-textItemBlur">Carregando e-mails...</div>}>
      <EmailCampaignsPageInner />
    </Suspense>
  );
}
