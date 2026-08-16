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

// ---- Confidence bar ----

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
        <div className={'h-full rounded-full transition-all duration-500 ' + color} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

// ---- DNA summary display (v2.0.0) ----

function DnaSummaryCard({ dna }: { dna: any }) {
  if (!dna) return null;
  const { summary, voice, audience, offer, visual, constraints, messaging, contentGuidelines, confidence } = dna;

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Tagline + Description */}
      {summary && (
        <div className="border border-newTableBorder rounded-[10px] p-[14px] bg-gradient-to-br from-newBgColorInner to-transparent">
          {summary.tagline && <div className="text-[14px] font-[700] text-newTextColor mb-[4px]">{summary.tagline}</div>}
          {summary.description && <div className="text-[12px] text-textItemBlur leading-relaxed line-clamp-3">{summary.description}</div>}
          {summary.missionStatement && (
            <div className="mt-2 text-[12px] text-newTextColor italic">&ldquo;{summary.missionStatement}&rdquo;</div>
          )}
          {summary.valueProposition && (
            <div className="mt-1 text-[11px] text-emerald-500 font-medium">Proposta de valor: {summary.valueProposition}</div>
          )}
          <div className="flex flex-wrap gap-[6px] mt-[8px]">
            {summary.industry && <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-newSettings border border-newTableBorder text-textItemBlur">{summary.industry}</span>}
            {summary.targetAudience && <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-newSettings border border-newTableBorder text-textItemBlur">{summary.targetAudience}</span>}
          </div>
        </div>
      )}

      {/* Confidence Scores (all 6) */}
      {confidence && (
        <div className="border border-newTableBorder rounded-[10px] p-[14px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[10px]">Scores de Confiança</div>
          <div className="flex flex-col gap-[8px]">
            <ConfidenceBar label="Geral" value={confidence.overall} />
            <ConfidenceBar label="Textual" value={confidence.textual} />
            <ConfidenceBar label="Visual" value={confidence.visual} />
            <ConfidenceBar label="Comercial" value={confidence.commercial} />
            <ConfidenceBar label="Messaging" value={confidence.messaging} />
            <ConfidenceBar label="Valores da marca" value={confidence.brandValues} />
          </div>
        </div>
      )}

      {/* 2-column grid: Voice, Audience, Offer, Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
        {/* Voice */}
        {voice && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Voz da Marca</div>
            <div className="flex flex-col gap-[4px]">
              {voice.tone && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Tom:</span> {voice.tone}</div>}
              {voice.style && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Estilo:</span> {voice.style}</div>}
              {voice.personality && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Personalidade:</span> {voice.personality}</div>}
              {voice.forbiddenWords?.length > 0 && (
                <div className="text-[11px] text-red-400 mt-[4px]">Evitar: {voice.forbiddenWords.join(', ')}</div>
              )}
              {voice.examplePhrases?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-[600] text-textItemBlur uppercase">Exemplos:</span>
                  {voice.examplePhrases.map((p: string, i: number) => (
                    <div key={i} className="text-[11px] italic text-black/50 dark:text-white/50 pl-2 border-l-2 border-black/10 dark:border-white/10">&ldquo;{p}&rdquo;</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audience */}
        {audience && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Público</div>
            <div className="flex flex-col gap-[4px]">
              {audience.demographics && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Demografia:</span> {audience.demographics}</div>}
              {audience.painPoints?.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Dores:</span> {audience.painPoints.join(', ')}</div>}
              {audience.desires?.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Desejos:</span> {audience.desires.join(', ')}</div>}
              {audience.objections?.length > 0 && <div className="text-[12px] text-textItemBlur"><span className="font-[600]">Objeções:</span> {audience.objections.join(', ')}</div>}
              {audience.buyerPersonas?.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <span className="text-[10px] font-[600] text-textItemBlur uppercase">Personas:</span>
                  {audience.buyerPersonas.map((p: any, i: number) => (
                    <div key={i} className="rounded-lg bg-newSettings border border-newTableBorder p-2 text-[11px]">
                      <span className="font-semibold text-newTextColor">{p.name}</span>
                      <span className="text-textItemBlur ml-1">({p.role})</span>
                      <p className="text-textItemBlur mt-0.5">{p.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Offer */}
        {offer && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Oferta</div>
            <div className="flex flex-col gap-[4px]">
              {offer.products?.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Produtos:</span> {offer.products.join(', ')}</div>}
              {offer.services?.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Serviços:</span> {offer.services.join(', ')}</div>}
              {offer.uniqueSellingPoints?.length > 0 && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Diferenciais:</span> {offer.uniqueSellingPoints.join(', ')}</div>}
              {offer.pricingHint && <div className="text-[12px] text-textItemBlur italic">Preço: {offer.pricingHint}</div>}
              {offer.category && <div className="text-[12px] text-textItemBlur">Categoria: {offer.category}</div>}
              {offer.topCompetitors?.length > 0 && (
                <div className="mt-1">
                  <span className="text-[10px] font-[600] text-textItemBlur uppercase">Concorrentes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {offer.topCompetitors.map((c: string, i: number) => (
                      <span key={i} className="text-[10px] px-[6px] py-[2px] rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Visual Identity */}
        {visual && (
          <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
            <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Identidade Visual</div>
            <div className="flex flex-col gap-[4px]">
              {visual.colors?.length > 0 && (
                <div className="flex items-center gap-[6px]">
                  <span className="text-[12px] text-newTextColor font-[600]">Cores:</span>
                  <div className="flex gap-[4px]">
                    {visual.colors.map((c: string, i: number) => (
                      <span key={i} className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-newTableBorder shadow-sm" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                </div>
              )}
              {visual.style && <div className="text-[12px] text-newTextColor"><span className="font-[600]">Estilo:</span> {visual.style}</div>}
              {visual.typographyHint && <div className="text-[12px] text-textItemBlur italic">Tipografia: {visual.typographyHint}</div>}
              {visual.imageryStyle && <div className="text-[12px] text-textItemBlur italic">Estilo de imagens: {visual.imageryStyle}</div>}
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
                <div className="text-[10px] font-[600] text-blue-400 uppercase mb-[4px]">Obrigatório</div>
                {constraints.requiredElements.map((item: string, i: number) => <div key={i} className="text-[12px] text-newTextColor">* {item}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messaging (v2.0.0) */}
      {messaging && (messaging.messagingPillars?.length > 0 || messaging.keyMessages?.length > 0) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Messaging</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
            {messaging.messagingPillars?.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-cyan-400 uppercase mb-[4px]">Pilares de Comunicação</div>
                <div className="flex flex-col gap-[3px]">
                  {messaging.messagingPillars.map((p: string, i: number) => (
                    <div key={i} className="text-[12px] text-newTextColor flex items-start gap-1"><span className="text-cyan-400 shrink-0">&#9670;</span> {p}</div>
                  ))}
                </div>
              </div>
            )}
            {messaging.keyMessages?.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-purple-400 uppercase mb-[4px]">Mensagens-chave</div>
                <div className="flex flex-col gap-[3px]">
                  {messaging.keyMessages.map((m: string, i: number) => (
                    <div key={i} className="text-[12px] text-newTextColor flex items-start gap-1"><span className="text-purple-400 shrink-0">&#9654;</span> {m}</div>
                  ))}
                </div>
              </div>
            )}
            {messaging.callToActionStyle && (
              <div className="sm:col-span-2">
                <div className="text-[10px] font-[600] text-pink-400 uppercase mb-[4px]">Estilo de CTA</div>
                <div className="text-[12px] text-newTextColor">{messaging.callToActionStyle}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Guidelines (v2.0.0) */}
      {contentGuidelines && (contentGuidelines.preferredFormats?.length > 0 || contentGuidelines.hashtagsStrategy || contentGuidelines.emojiUsage) && (
        <div className="border border-newTableBorder rounded-[10px] p-[12px] bg-newBgColorInner">
          <div className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide mb-[8px]">Diretrizes de Conteúdo</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
            {contentGuidelines.preferredFormats?.length > 0 && (
              <div>
                <div className="text-[10px] font-[600] text-teal-300 uppercase mb-[4px]">Formatos Preferidos</div>
                <div className="flex flex-wrap gap-[4px]">
                  {contentGuidelines.preferredFormats.map((f: string, i: number) => (
                    <span key={i} className="text-[11px] px-[6px] py-[2px] rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">{f}</span>
                  ))}
                </div>
              </div>
            )}
            {contentGuidelines.hashtagsStrategy && (
              <div>
                <div className="text-[10px] font-[600] text-indigo-300 uppercase mb-[4px]">Estratégia de Hashtags</div>
                <div className="text-[12px] text-newTextColor">{contentGuidelines.hashtagsStrategy}</div>
              </div>
            )}
            {contentGuidelines.emojiUsage && (
              <div>
                <div className="text-[10px] font-[600] text-yellow-300 uppercase mb-[4px]">Uso de Emojis</div>
                <div className="text-[12px] text-newTextColor">{contentGuidelines.emojiUsage}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Brand health bar ----

function BrandHealthBar({ dna }: { dna: any }) {
  if (!dna) return null;
  const fields = [
    dna.summary?.tagline, dna.summary?.description, dna.summary?.industry, dna.summary?.targetAudience,
    dna.summary?.missionStatement, dna.summary?.valueProposition,
    dna.voice?.tone, dna.voice?.style, dna.voice?.personality, dna.voice?.examplePhrases?.length > 0,
    dna.audience?.demographics, dna.audience?.painPoints?.length > 0, dna.audience?.desires?.length > 0, dna.audience?.buyerPersonas?.length > 0,
    dna.offer?.products?.length > 0 || dna.offer?.services?.length > 0, dna.offer?.uniqueSellingPoints?.length > 0, dna.offer?.category, dna.offer?.topCompetitors?.length > 0,
    dna.visual?.colors?.length > 0, dna.visual?.style, dna.visual?.imageryStyle,
    dna.constraints?.do?.length > 0 || dna.constraints?.avoid?.length > 0,
    dna.messaging?.messagingPillars?.length > 0, dna.messaging?.keyMessages?.length > 0,
    dna.contentGuidelines?.preferredFormats?.length > 0 || dna.contentGuidelines?.hashtagsStrategy,
  ];
  const filled = fields.filter(Boolean).length;
  const total = fields.length;
  const pct = Math.round((filled / total) * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-[10px]">
      <div className="flex-1">
        <div className="h-[8px] rounded-full bg-newTableBorder overflow-hidden">
          <div className={'h-full rounded-full transition-all duration-500 ' + color} style={{ width: pct + '%' }} />
        </div>
      </div>
      <span className="text-[12px] font-[600] text-newTextColor shrink-0">{pct}%</span>
    </div>
  );
}

// ---- Manual DNA creation form ----

function ManualDnaForm({ brandId, onClose }: { brandId: string; onClose: () => void }) {
  const toaster = useToaster();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sourceType: 'manual',
    summaryTagline: '', summaryDescription: '', summaryIndustry: '', summaryTargetAudience: '',
    summaryMissionStatement: '', summaryValueProposition: '',
    voiceTone: '', voiceStyle: '', voicePersonality: '', voiceForbiddenWords: '', voiceExamplePhrases: '',
    audienceDemographics: '', audiencePainPoints: '', audienceDesires: '', audienceObjections: '',
    audienceBuyerPersonas: '',
    offerProducts: '', offerServices: '', offerUniqueSellingPoints: '', offerPricingHint: '', offerCategory: '', offerTopCompetitors: '',
    visualColors: '', visualStyle: '', visualTypographyHint: '', visualImageryStyle: '',
    constraintsDo: '', constraintsAvoid: '', constraintsRequiredElements: '',
    messagingPillars: '', messagingKeyMessages: '', messagingCallToActionStyle: '',
    contentGuidelinesPreferredFormats: '', contentGuidelinesHashtagsStrategy: '', contentGuidelinesEmojiUsage: '',
  });

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const split = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createDnaSnapshot(brandId, {
        sourceType: 'manual',
        summary: {
          tagline: form.summaryTagline,
          description: form.summaryDescription,
          industry: form.summaryIndustry,
          targetAudience: form.summaryTargetAudience,
          missionStatement: form.summaryMissionStatement,
          valueProposition: form.summaryValueProposition,
        },
        voice: {
          tone: form.voiceTone,
          style: form.voiceStyle,
          personality: form.voicePersonality,
          forbiddenWords: split(form.voiceForbiddenWords),
          examplePhrases: split(form.voiceExamplePhrases),
        },
        audience: {
          demographics: form.audienceDemographics,
          painPoints: split(form.audiencePainPoints),
          desires: split(form.audienceDesires),
          objections: split(form.audienceObjections),
          buyerPersonas: form.audienceBuyerPersonas
            ? form.audienceBuyerPersonas.split('\n').filter(Boolean).map((line) => {
                const [name, role, ...descParts] = line.split('|').map((s) => s.trim());
                return { name: name || '', role: role || '', description: descParts.join(' | ') || '' };
              })
            : [],
        },
        offer: {
          products: split(form.offerProducts),
          services: split(form.offerServices),
          uniqueSellingPoints: split(form.offerUniqueSellingPoints),
          pricingHint: form.offerPricingHint || null,
          category: form.offerCategory || null,
          topCompetitors: split(form.offerTopCompetitors),
        },
        visual: {
          colors: split(form.visualColors),
          style: form.visualStyle,
          typographyHint: form.visualTypographyHint || null,
          imageryStyle: form.visualImageryStyle || null,
        },
        constraints: {
          do: split(form.constraintsDo),
          avoid: split(form.constraintsAvoid),
          requiredElements: split(form.constraintsRequiredElements),
        },
        messaging: {
          messagingPillars: split(form.messagingPillars),
          keyMessages: split(form.messagingKeyMessages),
          callToActionStyle: form.messagingCallToActionStyle || null,
        },
        contentGuidelines: {
          preferredFormats: split(form.contentGuidelinesPreferredFormats),
          hashtagsStrategy: form.contentGuidelinesHashtagsStrategy || null,
          emojiUsage: form.contentGuidelinesEmojiUsage || null,
        },
      });
      toaster.show('Brand DNA criado com sucesso!', 'success');
      mutateBrand(brandId);
      onClose();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao criar DNA', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h3 className="text-[15px] font-semibold mb-3 text-newTextColor border-b border-newTableBorder pb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Field = ({ label, value, keyName, textarea, hint }: { label: string; value: string; keyName: string; textarea?: boolean; hint?: string }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-textItemBlur">{label}{hint && <span className="text-[10px] text-textItemBlur ml-1">({hint})</span>}</label>
      {textarea ? (
        <textarea className={textAreaClass} rows={3} value={value} onChange={(e) => set(keyName, e.target.value)} />
      ) : (
        <input className={inputClass + ' !h-[40px]'} value={value} onChange={(e) => set(keyName, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6">
      <Section title="Resumo">
        <Field label="Tagline" value={form.summaryTagline} keyName="summaryTagline" />
        <Field label="Descrição" value={form.summaryDescription} keyName="summaryDescription" textarea />
        <Field label="Indústria" value={form.summaryIndustry} keyName="summaryIndustry" />
        <Field label="Público-alvo" value={form.summaryTargetAudience} keyName="summaryTargetAudience" />
        <Field label="Missão" value={form.summaryMissionStatement} keyName="summaryMissionStatement" textarea />
        <Field label="Proposta de valor" value={form.summaryValueProposition} keyName="summaryValueProposition" />
      </Section>
      <Section title="Voz da Marca">
        <Field label="Tom" value={form.voiceTone} keyName="voiceTone" />
        <Field label="Estilo" value={form.voiceStyle} keyName="voiceStyle" />
        <Field label="Personalidade" value={form.voicePersonality} keyName="voicePersonality" />
        <Field label="Palavras proibidas" value={form.voiceForbiddenWords} keyName="voiceForbiddenWords" hint="vírgula separada" />
        <Field label="Exemplos de voz" value={form.voiceExamplePhrases} keyName="voiceExamplePhrases" hint="vírgula separada" />
      </Section>
      <Section title="Público">
        <Field label="Demografia" value={form.audienceDemographics} keyName="audienceDemographics" textarea />
        <Field label="Dores" value={form.audiencePainPoints} keyName="audiencePainPoints" hint="vírgula separada" />
        <Field label="Desejos" value={form.audienceDesires} keyName="audienceDesires" hint="vírgula separada" />
        <Field label="Objeções" value={form.audienceObjections} keyName="audienceObjections" hint="vírgula separada" />
        <Field label="Personas" value={form.audienceBuyerPersonas} keyName="audienceBuyerPersonas" hint="1 por linha: nome | papel | descrição" textarea />
      </Section>
      <Section title="Oferta">
        <Field label="Produtos" value={form.offerProducts} keyName="offerProducts" hint="vírgula separada" />
        <Field label="Serviços" value={form.offerServices} keyName="offerServices" hint="vírgula separada" />
        <Field label="Diferenciais" value={form.offerUniqueSellingPoints} keyName="offerUniqueSellingPoints" hint="vírgula separada" />
        <Field label="Sugestão de preço" value={form.offerPricingHint} keyName="offerPricingHint" />
        <Field label="Categoria" value={form.offerCategory} keyName="offerCategory" hint="SaaS, E-commerce, etc." />
        <Field label="Principais concorrentes" value={form.offerTopCompetitors} keyName="offerTopCompetitors" hint="vírgula separada" />
      </Section>
      <Section title="Identidade Visual">
        <Field label="Cores" value={form.visualColors} keyName="visualColors" hint="hex, vírgula separada" />
        <Field label="Estilo visual" value={form.visualStyle} keyName="visualStyle" />
        <Field label="Tipografia" value={form.visualTypographyHint} keyName="visualTypographyHint" />
        <Field label="Estilo de imagens" value={form.visualImageryStyle} keyName="visualImageryStyle" />
      </Section>
      <Section title="Diretrizes">
        <Field label="Fazer" value={form.constraintsDo} keyName="constraintsDo" hint="vírgula separada" />
        <Field label="Evitar" value={form.constraintsAvoid} keyName="constraintsAvoid" hint="vírgula separada" />
        <Field label="Elementos obrigatórios" value={form.constraintsRequiredElements} keyName="constraintsRequiredElements" hint="vírgula separada" />
      </Section>
      <Section title="Messaging">
        <Field label="Pilares de comunicação" value={form.messagingPillars} keyName="messagingPillars" hint="vírgula separada" />
        <Field label="Mensagens-chave" value={form.messagingKeyMessages} keyName="messagingKeyMessages" hint="vírgula separada" />
        <Field label="Estilo de CTA" value={form.messagingCallToActionStyle} keyName="messagingCallToActionStyle" hint="urgency-driven, value-led, etc." />
      </Section>
      <Section title="Diretrizes de Conteúdo">
        <Field label="Formatos preferidos" value={form.contentGuidelinesPreferredFormats} keyName="contentGuidelinesPreferredFormats" hint="vírgula separada" />
        <Field label="Estratégia de hashtags" value={form.contentGuidelinesHashtagsStrategy} keyName="contentGuidelinesHashtagsStrategy" />
        <Field label="Uso de emojis" value={form.contentGuidelinesEmojiUsage} keyName="contentGuidelinesEmojiUsage" />
      </Section>
      <div className="flex justify-end gap-3 pt-4 border-t border-newTableBorder">
        <Button onClick={onClose} secondary>Cancelar</Button>
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />
          Salvar DNA
        </Button>
      </div>
    </div>
  );
}

// ---- Main page ----

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
    modals.openModal({
      title: 'Criar Brand DNA Manualmente',
      size: 600,
      maxSize: '90vw',
      children: (close: () => void) => <ManualDnaForm brandId={brand.id} onClose={close} />,
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
            onAction={() => router.push('/brands')}
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
            onClick={() => router.push('/brands')}
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
          {/* Brand info card */}
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
                      <Button onClick={() => setEditingName(false)} secondary className="!h-[36px]">
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-[18px] font-[700] text-newTextColor hover:opacity-80 transition-opacity flex items-center gap-2"
                      onClick={() => { setNameValue(brand.name); setEditingName(true); }}
                    >
                      {brand.name}
                      <Pencil className="w-4 h-4 text-textItemBlur" />
                    </button>
                  )}
                  <BrandStatusBadge status={brand.status} />
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {brand.website ? (
                    <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-textItemBlur hover:text-newTextColor flex items-center gap-1">
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
                {brand.status === 'FAILED' && brand.lastAnalysisError ? (
                  <div className="mt-3 text-[12px] text-red-500 bg-red-500/10 border border-red-500/25 rounded-[8px] px-[10px] py-[6px]">
                    <span className="font-[600]">Última análise falhou: </span>
                    {brand.lastAnalysisError}
                  </div>
                ) : null}
                {dna && (
                  <div className="mt-3">
                    <BrandHealthBar dna={dna} />
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Site analysis */}
          <SectionCard
            title="Análise de site"
            description="Analise o site para extrair Brand DNA automaticamente."
          >
            <div className="flex items-center gap-2 mb-3 text-textItemBlur">
              <Building2 className="w-4 h-4" />
            </div>
            <AnalyzeSiteButton brandId={brand.id} website={brand.website} />
          </SectionCard>

          {/* Brand DNA */}
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
                <p className="text-[12px] mt-1">Analise o site ou crie um DNA manualmente para começar.</p>
              </div>
            )}
          </SectionCard>

          {/* Assets */}
          <SectionCard title="Ativos da Marca">
            <BrandAssetList brandId={brand.id} />
          </SectionCard>
        </div>
      </PageBody>
    </PageShell>
  );
}
