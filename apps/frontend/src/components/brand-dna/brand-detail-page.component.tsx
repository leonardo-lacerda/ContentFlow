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

// --- New Components ---

function ConfidenceBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-textItemBlur font-[500]">{label}</span>
        <span className="text-newTextColor font-[600]">{pct}%</span>
      </div>
      <div className="h-[6px] rounded-full bg-newTableBorder overflow-hidden">
        <div className={"h-full rounded-full transition-all duration-500 " + color} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function DnaSummaryCard({ dna }: { dna: any }) {
  if (!dna) return null;
  const { summary, voice, audience, offer, visual, constraints, messaging, contentGuidelines, confidence } = dna;
  return (
    <div className="flex flex-col gap-[16px]">
      {/* Tagline & Description */}
      {summary && (
        <div className="border border-newTableBorder rounded-[10px] p-[14px] bg-gradient-to-br from-newBgColorInner to-transparent">
          {summary.tagline && <div className="text-[14px] font-[700] text-newTextColor mb-[4px]">{summary.tagline}</div>}
          {summary.description && <div className="text-[12px] text-textItemBlur leading-relaxed line-clamp-3">{summary.description}</div>}
          <div className="flex flex-wrap gap-[6px] mt-[8px]">
            {summary.industry && <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-newSettings border border-newTableBorder text-textItemBlur">{summary.industry}</span>}
            {summary.targetAudience && <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-newSettings border border-newTableBorder text-textItemBlur">{summary.targetAudience}</span>}
          </div>
        </div>
      )}

      {/* Confidence Scores */}
      {confidence && (
        <div className="border border-newTableBorder rounded-[10px] p-[14px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[10px]">Scores de Confianca</div>
          <div className="flex flex-col gap-[8px]">
            <ConfidenceBar label="Geral" value={confidence.overall} />
            <ConfidenceBar label="Textual" value={confidence.textual} />
            <ConfidenceBar label="Visual" value={confidence.visual} />
            <ConfidenceBar label="Comercial" value={confidence.commercial} />
          </div>
        </div>
      )}

      {/* Quick DNA Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
        {/* Voice */}
        {voice && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Voz da Marca</div>
            <div className="flex flex-col gap-[4px]">
              {voice.tone && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Tom:</span> {voice.tone}</div>}
              {voice.style && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Estilo:</span> {voice.style}</div>}
              {voice.personality && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Personalidade:</span> {voice.personality}</div>}
              {voice.forbiddenWords && voice.forbiddenWords.length > 0 && (
                <div className="text-[11px] text-red-400 mt-[4px]">Evitar: {voice.forbiddenWords.join(', ')}</div>
              )}
            </div>
          </div>
        )}

        {/* Audience */}
        {audience && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Publico</div>
            <div className="flex flex-col gap-[4px]">
              {audience.demographics && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Demografia:</span> {audience.demographics}</div>}
              {audience.painPoints && audience.painPoints.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Dores:</span> {audience.painPoints.join(', ')}</div>}
              {audience.desires && audience.desires.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Desejos:</span> {audience.desires.join(', ')}</div>}
            </div>
          </div>
        )}

        {/* Offer */}
        {offer && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Oferta</div>
            <div className="flex flex-col gap-[4px]">
              {offer.products && offer.products.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Produtos:</span> {offer.products.join(', ')}</div>}
              {offer.services && offer.services.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Servicos:</span> {offer.services.join(', ')}</div>}
              {offer.uniqueSellingPoints && offer.uniqueSellingPoints.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Diferenciais:</span> {offer.uniqueSellingPoints.join(', ')}</div>}
              {offer.pricingHint && <div className="text-[12px] text-textItemBlur italic">Preco: {offer.pricingHint}</div>}
            </div>
          </div>
        )}

        {/* Visual Identity */}
        {visual && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Identidade Visual</div>
            <div className="flex flex-col gap-[4px]">
              {visual.colors && visual.colors.length > 0 && (
                <div className="flex items-center gap-[6px]">
                  <span className="text-[12px] text-newTextColor font-[600]">Cores:</span>
                  <div className="flex gap-[4px]">
                    {visual.colors.map((c: string, i: number) => (
                      <span key={i} className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-newTableBorder shadow-sm" style={{ backgroundColor: c }} title={c}>
                        <span className="text-[8px] font-bold mix-blend-difference text-white">{c.length > 0 ? '' : ''}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {visual.style && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Estilo:</span> {visual.style}</div>}
              {visual.typographyHint && <div className="text-[12px] text-textItemBlur italic">Tipografia: {visual.typographyHint}</div>}
              {visual.photographyStyle && <div className="text-[12px] text-textItemBlur italic">Fotografia: {visual.photographyStyle}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Constraints */}
      {constraints && (constraints.do.length > 0 || constraints.avoid.length > 0 || constraints.requiredElements.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Diretrizes</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
            {constraints.do.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-green-400 uppercase mb-[4px]">Fazer</div>
                {constraints.do.map((item: string, i: number) => <div key={i} className="text-[12px] text-newTextColor">+ {item}</div>)}
              </div>
            )}
            {constraints.avoid.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-red-400 uppercase mb-[4px]">Evitar</div>
                {constraints.avoid.map((item: string, i: number) => <div key={i} className="text-[12px] text-newTextColor">- {item}</div>)}
              </div>
            )}
            {constraints.requiredElements.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-blue-400 uppercase mb-[4px]">Obrigatorio</div>
                {constraints.requiredElements.map((item: string, i: number) => <div key={i} className="text-[12px] text-newTextColor">* {item}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messaging Pillars */}
      {messaging && (messaging.brandValues?.length > 0 || messaging.brandStory || messaging.messagingPillars?.length > 0 || messaging.keyCTAs?.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Comunicacao da Marca</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
            {messaging.brandValues && messaging.brandValues.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-purple-400 uppercase mb-[4px]">Valores</div>
                <div className="flex flex-wrap gap-[4px]">
                  {messaging.brandValues.map((v: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">{v}</span>
                  ))}
                </div>
              </div>
            )}
            {messaging.brandStory && (
              <div className="sm:col-span-2">
                <div className="text-[10px] font-[600] text-amber-400 uppercase mb-[4px]">Historia da Marca</div>
                <div className="text-[12px] text-newTextColor leading-relaxed italic">&ldquo;{messaging.brandStory}&rdquo;</div>
              </div>
            )}
            {messaging.messagingPillars && messaging.messagingPillars.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-cyan-400 uppercase mb-[4px]">Pilares de Comunicacao</div>
                <div className="flex flex-col gap-[3px]">
                  {messaging.messagingPillars.map((p: string, i: number) => (
                    <div key={i} className="text-[12px] text-newTextColor flex items-start gap-1"><span className="text-cyan-400 shrink-0">&#9670;</span> {p}</div>
                  ))}
                </div>
              </div>
            )}
            {messaging.keyCTAs && messaging.keyCTAs.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-pink-400 uppercase mb-[4px]">Chamadas para Acao</div>
                <div className="flex flex-wrap gap-[4px]">
                  {messaging.keyCTAs.map((cta: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30">{cta}</span>
                  ))}
                </div>
              </div>
            )}
            {messaging.emotionalTriggers && messaging.emotionalTriggers.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-rose-400 uppercase mb-[4px]">Gatilhos Emocionais</div>
                <div className="flex flex-wrap gap-[4px]">
                  {messaging.emotionalTriggers.map((t: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Competitors */}
      {messaging?.competitors && messaging.competitors.length > 0 && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Concorrentes Identificados</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px]">
            {messaging.competitors.map((comp: string, i: number) => (
              <div key={i} className="flex items-center gap-2 p-[8px] rounded-[8px] bg-newSettings border border-newTableBorder">
                <div className="w-[28px] h-[28px] rounded-full bg-orange-500/15 flex items-center justify-center text-[11px] font-bold text-orange-300">{comp.charAt(0).toUpperCase()}</div>
                <span className="text-[12px] text-newTextColor font-medium truncate">{comp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Guidelines */}
      {contentGuidelines && (contentGuidelines.postLengthHint || contentGuidelines.emojiUsage || contentGuidelines.hashtagStrategy?.length > 0 || contentGuidelines.contentMix?.length > 0 || contentGuidelines.bestPractices?.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Diretrizes de Conteudo</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
            {contentGuidelines.postLengthHint && (
              <div>
                <div className="text-[10px] font-[600] text-blue-300 uppercase mb-[4px]">Tamanho dos Posts</div>
                <div className="text-[12px] text-newTextColor">{contentGuidelines.postLengthHint}</div>
              </div>
            )}
            {contentGuidelines.emojiUsage && (
              <div>
                <div className="text-[10px] font-[600] text-yellow-300 uppercase mb-[4px]">Uso de Emojis</div>
                <div className="text-[12px] text-newTextColor">{contentGuidelines.emojiUsage}</div>
              </div>
            )}
            {contentGuidelines.hashtagStrategy && contentGuidelines.hashtagStrategy.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-indigo-300 uppercase mb-[4px]">Estrategia de Hashtags</div>
                <div className="flex flex-wrap gap-[4px]">
                  {contentGuidelines.hashtagStrategy.map((h: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">{h}</span>
                  ))}
                </div>
              </div>
            )}
            {contentGuidelines.contentMix && contentGuidelines.contentMix.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-teal-300 uppercase mb-[4px]">Mix de Conteudo</div>
                <div className="flex flex-col gap-[3px]">
                  {contentGuidelines.contentMix.map((m: string, i: number) => (
                    <div key={i} className="text-[12px] text-newTextColor flex items-start gap-1"><span className="text-teal-300 shrink-0">&#9654;</span> {m}</div>
                  ))}
                </div>
              </div>
            )}
            {contentGuidelines.bestPractices && contentGuidelines.bestPractices.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-[10px] font-[600] text-lime-300 uppercase mb-[4px]">Melhores Praticas</div>
                <div className="flex flex-wrap gap-[4px]">
                  {contentGuidelines.bestPractices.map((bp: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-lime-500/15 text-lime-300 border border-lime-500/30">{bp}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BrandHealthBar({ dna }: { dna: any }) {
  if (!dna) return null;
  const fields = [
    dna.summary?.tagline, dna.summary?.description, dna.summary?.industry, dna.summary?.targetAudience,
    dna.voice?.tone, dna.voice?.style, dna.voice?.personality,
    dna.audience?.demographics, dna.audience?.painPoints?.length > 0, dna.audience?.desires?.length > 0,
    dna.offer?.products?.length > 0 || dna.offer?.services?.length > 0, dna.offer?.uniqueSellingPoints?.length > 0,
    dna.visual?.colors?.length > 0, dna.visual?.style,
    dna.constraints?.do?.length > 0 || dna.constraints?.avoid?.length > 0,
    dna.messaging?.brandValues?.length > 0 || dna.messaging?.brandStory,
    dna.messaging?.messagingPillars?.length > 0, dna.messaging?.competitors?.length > 0,
    dna.messaging?.keyCTAs?.length > 0, dna.messaging?.emotionalTriggers?.length > 0,
    dna.contentGuidelines?.postLengthHint || dna.contentGuidelines?.emojiUsage,
    dna.contentGuidelines?.contentMix?.length > 0 || dna.contentGuidelines?.bestPractices?.length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  const total = fields.length;
  const pct = Math.round((filled / total) * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-[10px]">
      <div className="flex-1">
        <div className="h-[8px] rounded-full bg-newTableBorder overflow-hidden">
          <div className={"h-full rounded-full transition-all duration-500 " + color} style={{ width: pct + '%' }} />
        </div>
      </div>
      <span className="text-[12px] font-[600] text-newTextColor shrink-0">{pct}%</span>
    </div>
  );
}


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
      messagingBrandValues: '',
      messagingBrandStory: '',
      messagingCompetitors: '',
      messagingPillars: '',
      messagingKeyCTAs: '',
      messagingEmotionalTriggers: '',
      contentGuidelinesPostLengthHint: '',
      contentGuidelinesEmojiUsage: '',
      contentGuidelinesHashtagStrategy: '',
      contentGuidelinesContentMix: '',
      contentGuidelinesBestPractices: '',
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
          <Section title="Comunicação da Marca">
            <Field label="Valores da marca (vírgula separada)" value={form.messagingBrandValues} onChange={(v) => { form.messagingBrandValues = v; }} />
            <Field label="História da marca" value={form.messagingBrandStory} onChange={(v) => { form.messagingBrandStory = v; }} textarea />
            <Field label="Concorrentes (vírgula separada)" value={form.messagingCompetitors} onChange={(v) => { form.messagingCompetitors = v; }} />
            <Field label="Pilares de comunicação (vírgula separada)" value={form.messagingPillars} onChange={(v) => { form.messagingPillars = v; }} />
            <Field label="Chamadas para ação (vírgula separada)" value={form.messagingKeyCTAs} onChange={(v) => { form.messagingKeyCTAs = v; }} />
            <Field label="Gatilhos emocionais (vírgula separada)" value={form.messagingEmotionalTriggers} onChange={(v) => { form.messagingEmotionalTriggers = v; }} />
          </Section>
          <Section title="Diretrizes de Conteúdo">
            <Field label="Tamanho dos posts" value={form.contentGuidelinesPostLengthHint} onChange={(v) => { form.contentGuidelinesPostLengthHint = v; }} />
            <Field label="Uso de emojis" value={form.contentGuidelinesEmojiUsage} onChange={(v) => { form.contentGuidelinesEmojiUsage = v; }} />
            <Field label="Estratégia de hashtags (vírgula separada)" value={form.contentGuidelinesHashtagStrategy} onChange={(v) => { form.contentGuidelinesHashtagStrategy = v; }} />
            <Field label="Mix de conteúdo (vírgula separada)" value={form.contentGuidelinesContentMix} onChange={(v) => { form.contentGuidelinesContentMix = v; }} />
            <Field label="Melhores práticas (vírgula separada)" value={form.contentGuidelinesBestPractices} onChange={(v) => { form.contentGuidelinesBestPractices = v; }} />
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
                  messaging: {
                    brandValues: form.messagingBrandValues.split(',').map(s => s.trim()).filter(Boolean),
                    brandStory: form.messagingBrandStory,
                    competitors: form.messagingCompetitors.split(',').map(s => s.trim()).filter(Boolean),
                    messagingPillars: form.messagingPillars.split(',').map(s => s.trim()).filter(Boolean),
                    keyCTAs: form.messagingKeyCTAs.split(',').map(s => s.trim()).filter(Boolean),
                    emotionalTriggers: form.messagingEmotionalTriggers.split(',').map(s => s.trim()).filter(Boolean),
                  },
                  contentGuidelines: {
                    postLengthHint: form.contentGuidelinesPostLengthHint,
                    emojiUsage: form.contentGuidelinesEmojiUsage,
                    hashtagStrategy: form.contentGuidelinesHashtagStrategy.split(',').map(s => s.trim()).filter(Boolean),
                    contentMix: form.contentGuidelinesContentMix.split(',').map(s => s.trim()).filter(Boolean),
                    bestPractices: form.contentGuidelinesBestPractices.split(',').map(s => s.trim()).filter(Boolean),
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
            description="Analise o site para extrair Brand DNA automaticamente. O sistema analisa conteudo, estilo, publico e propostas de valor."
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

          <SectionCard title="Ativos da Marca">
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
