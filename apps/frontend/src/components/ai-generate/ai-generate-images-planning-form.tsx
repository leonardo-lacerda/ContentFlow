import { useState } from 'react';
import { Button } from '@gitroom/react/form/button';

import {
  MAX_CAROUSEL_SLIDES,
  MIN_CAROUSEL_SLIDES,
  audienceOptions,
  carouselTemplates,
  goalOptions,
  inputClass,
  logoPositionOptions,
  logoScaleOptions,
  logoUsageOptions,
  platformOptions,
  textAreaClass,
  toneOptions,
  visualStylePresets,
} from './ai-generate-images.constants';
import { Spinner } from './ai-generate-images.loaders';
import type {
  CarouselIdea,
  CompanyProfile,
  ReferenceImage,
} from './ai-generate-images.types';

type AiGenerateImagesPlanningFormProps = {
  applyCompanyBrandKit: (company?: CompanyProfile) => void;
  applyTemplate: (id: string) => void;
  audience: string;
  brandColors: string;
  brandFonts: string;
  brandLogoReferences: ReferenceImage[];
  brandName: string;
  brandNotes: string;
  companyIdeas: CarouselIdea[];
  companyProfile: CompanyProfile | null;
  companyProfiles: CompanyProfile[];
  defaultCta: string;
  forbiddenTerms: string;
  generateCompanyIdeas: () => void;
  generatePlan: (event: any) => void;
  goal: string;
  hasRequiredCompanySummary: boolean;
  ideasError: string;
  loadingCompanyProfile: boolean;
  loadingIdeas: boolean;
  logoPosition: string;
  logoScale: string;
  logoUsage: string;
  planDisabled: boolean;
  planning: boolean;
  platform: string;
  selectedCompanyId: string;
  selectedLogoReferenceId: string;
  selectedTemplate: string;
  setAudience: (value: string) => void;
  setBrandColors: (value: string) => void;
  setBrandFonts: (value: string) => void;
  setBrandName: (value: string) => void;
  setBrandNotes: (value: string) => void;
  setCompanyIdeas: (value: CarouselIdea[]) => void;
  setDefaultCta: (value: string) => void;
  setForbiddenTerms: (value: string) => void;
  setGoal: (value: string) => void;
  setIdeasError: (value: string) => void;
  setLogoPosition: (value: string) => void;
  setLogoScale: (value: string) => void;
  setLogoUsage: (value: string) => void;
  setPlatform: (value: string) => void;
  setSelectedCompanyId: (value: string) => void;
  setSelectedLogoReferenceId: (value: string) => void;
  setShowAdvanced: (value: boolean) => void;
  setSlideCount: (value: number) => void;
  setTextModel: (value: string) => void;
  setTone: (value: string) => void;
  setTopic: (value: string) => void;
  setVisualStyle: (value: string) => void;
  showAdvanced: boolean;
  slideCount: number;
  syncBrandReferences: (company?: CompanyProfile) => void;
  textModel: string;
  tone: string;
  topic: string;
  visualStyle: string;
};

const BRIEF_STEPS = ['Empresa & Ideia', 'Formato', 'Marca & Ajustes'];

function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[999px] border px-[14px] py-[8px] text-[13px] font-[700] transition ${
        active
          ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
          : 'border-black/10 bg-white text-black/65 hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export function AiGenerateImagesPlanningForm(props: AiGenerateImagesPlanningFormProps) {
  const {
    applyCompanyBrandKit,
    applyTemplate,
    audience,
    brandColors,
    brandFonts,
    brandLogoReferences,
    brandName,
    brandNotes,
    companyIdeas,
    companyProfile,
    companyProfiles,
    defaultCta,
    forbiddenTerms,
    generateCompanyIdeas,
    generatePlan,
    goal,
    hasRequiredCompanySummary,
    ideasError,
    loadingCompanyProfile,
    loadingIdeas,
    logoPosition,
    logoScale,
    logoUsage,
    planDisabled,
    planning,
    platform,
    selectedCompanyId,
    selectedLogoReferenceId,
    selectedTemplate,
    setAudience,
    setBrandColors,
    setBrandFonts,
    setBrandName,
    setBrandNotes,
    setCompanyIdeas,
    setDefaultCta,
    setForbiddenTerms,
    setGoal,
    setIdeasError,
    setLogoPosition,
    setLogoScale,
    setLogoUsage,
    setPlatform,
    setSelectedCompanyId,
    setSelectedLogoReferenceId,
    setShowAdvanced,
    setSlideCount,
    setTextModel,
    setTone,
    setTopic,
    setVisualStyle,
    showAdvanced,
    slideCount,
    syncBrandReferences,
    textModel,
    tone,
    topic,
    visualStyle,
  } = props;

  const [step, setStep] = useState(0);
  const [editingBrandKit, setEditingBrandKit] = useState(false);

  const goNext = () => setStep((current) => Math.min(current + 1, BRIEF_STEPS.length - 1));
  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const audienceIsCustom = Boolean(audience && !audienceOptions.includes(audience));
  const brandSwatches = (brandColors || '')
    .split(/[,;\n]/)
    .map((color) => color.trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <form
      onSubmit={generatePlan}
      className="rounded-[18px] border border-black/10 bg-white p-[28px] shadow-sm dark:border-white/10 dark:bg-[#101010]"
    >
      {/* Cabeçalho + stepper do brief */}
      <div className="mb-[24px] flex flex-col gap-[16px]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 font-bold text-stone-800 dark:text-stone-100">
            1
          </div>
          <div>
            <h3 className="text-[24px] font-[700] text-black dark:text-white">Briefing do carrossel</h3>
            <p className="text-[14px] text-black/55 dark:text-white/55">
              Em 3 passos rápidos, quase tudo por seleção. O estúdio cria a copy e a direção visual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-[6px]">
          {BRIEF_STEPS.map((label, index) => {
            const isActive = index === step;
            const isDone = index < step;
            return (
              <div key={label} className="flex flex-1 items-center gap-[6px]">
                <button
                  type="button"
                  onClick={() => index <= step && setStep(index)}
                  disabled={index > step}
                  className={`flex items-center gap-[8px] rounded-full px-[12px] py-[7px] text-[12px] font-[800] transition ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                      : isDone
                      ? 'bg-stone-900/10 text-stone-800 dark:bg-white/10 dark:text-white/80'
                      : 'text-black/40 dark:text-white/40'
                  } ${index > step ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-current text-[11px]">
                    {index + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {index < BRIEF_STEPS.length - 1 && (
                  <div className={`h-[2px] flex-1 rounded-full ${isDone ? 'bg-stone-900/40 dark:bg-white/40' : 'bg-black/10 dark:bg-white/10'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PASSO 1 — EMPRESA & IDEIA */}
      {step === 0 && (
        <div className="grid grid-cols-1 gap-[16px]">
          <label className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[600]">Para qual empresa vamos criar?</span>
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextCompany = companyProfiles.find((company) => company.id === nextId);
                setSelectedCompanyId(nextId);
                applyCompanyBrandKit(nextCompany);
                syncBrandReferences(nextCompany);
                setCompanyIdeas([]);
                setIdeasError('');
              }}
              className={`${inputClass} !h-[50px] !text-[15px]`}
              disabled={loadingCompanyProfile}
            >
              <option value="">Selecione uma empresa</option>
              {companyProfiles.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName || 'Empresa sem nome'}
                  {company.summary?.trim() ? ' - resumo ok' : ' - falta resumo'}
                </option>
              ))}
            </select>
            {!hasRequiredCompanySummary && (
              <span className="text-[12px] text-yellow-300">
                O resumo da empresa é obrigatório para gerar ideias e carrosséis.{' '}
                <a href="/onboarding/company" className="font-[700] text-primary hover:underline">
                  Completar onboarding
                </a>
              </span>
            )}
          </label>

          <label className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[600]">Qual é o tema principal do seu post?</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ex: 5 dicas para melhorar a conversão do seu site"
              className={`${inputClass} !h-[50px] !text-[15px]`}
              maxLength={240}
            />
          </label>

          <div className="rounded-[12px] border border-newTableBorder bg-newBgColorInner p-[14px]">
            <div className="flex flex-wrap items-center gap-[10px]">
              <button
                type="button"
                onClick={generateCompanyIdeas}
                className="flex items-center gap-[8px] rounded-[10px] border border-black/10 bg-white px-[12px] py-[8px] text-[13px] font-[800] text-black shadow-sm hover:border-stone-500/40 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                disabled={loadingIdeas || loadingCompanyProfile || !hasRequiredCompanySummary}
              >
                {loadingIdeas && <Spinner size={14} />}
                {loadingIdeas
                  ? 'Gerando ideias...'
                  : companyIdeas.length > 0
                  ? 'Gerar mais ideias (sem repetir)'
                  : 'Gerar ideias com contexto da empresa'}
              </button>
              {hasRequiredCompanySummary ? (
                <span className="text-[12px] text-green-400">
                  Usando contexto de {companyProfile?.companyName || 'empresa selecionada'}
                </span>
              ) : (
                <span className="text-[12px] text-yellow-300">
                  Sem resumo salvo: complete o onboarding para liberar ideias
                </span>
              )}
            </div>

            {ideasError && <div className="mt-[8px] text-[12px] text-red-300">{ideasError}</div>}

            {companyIdeas.length > 0 && (
              <div className="mt-[8px] text-[12px] text-green-400">
                {companyIdeas.length} ideia{companyIdeas.length > 1 ? 's' : ''} salva
                {companyIdeas.length > 1 ? 's' : ''} — ficam guardadas e não gastam tokens ao reabrir.
              </div>
            )}

            {companyIdeas.length > 0 && (
              <div className="mt-[10px] grid grid-cols-1 gap-[8px] md:grid-cols-2">
                {companyIdeas.map((idea, index) => (
                  <button
                    key={`${idea.title}-${index}`}
                    type="button"
                    onClick={() => {
                      setTopic(idea.title);
                      if (idea.goal) {
                        setGoal(idea.goal);
                      }
                    }}
                    className={`rounded-[10px] border p-[10px] text-left transition ${
                      topic === idea.title
                        ? 'border-stone-950 bg-stone-50 dark:border-white dark:bg-white/10'
                        : 'border-black/10 bg-white hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10'
                    } text-black dark:text-white`}
                  >
                    <div className="text-[13px] font-[700]">{idea.title}</div>
                    {idea.hook && <div className="mt-[4px] text-[12px] text-textItemBlur">{idea.hook}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASSO 2 — FORMATO */}
      {step === 1 && (
        <div className="grid grid-cols-1 gap-[20px]">
          <div className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[600]">Template</span>
            <div className="grid grid-cols-2 gap-[8px] md:grid-cols-4">
              {carouselTemplates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyTemplate(item.id)}
                  className={`h-[40px] rounded-[10px] border px-[10px] text-[13px] font-[600] transition ${
                    selectedTemplate === item.id
                      ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
                      : 'border-black/10 bg-white text-black/65 hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[600]">Qual o seu objetivo?</span>
            <div className="flex flex-wrap gap-[8px]">
              {goalOptions.map((option) => (
                <ChoiceChip key={option.value} active={goal === option.value} onClick={() => setGoal(option.value)}>
                  {option.label}
                </ChoiceChip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[600]">Plataforma</span>
            <div className="flex flex-wrap gap-[8px]">
              {platformOptions.map((option) => (
                <ChoiceChip key={option.value} active={platform === option.value} onClick={() => setPlatform(option.value)}>
                  {option.label}
                </ChoiceChip>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-stone-500/20 bg-stone-500/10 p-[14px]">
            <div className="mb-[10px] flex flex-wrap items-center justify-between gap-[10px]">
              <div>
                <span className="text-[14px] font-[800] text-black dark:text-white">Quantidade de imagens</span>
                <p className="mt-[3px] text-[12px] text-black/55 dark:text-white/60">
                  Quantos slides com texto serão criados neste carrossel.
                </p>
              </div>
              <span className="rounded-full bg-white px-[10px] py-[5px] text-[12px] font-[900] text-stone-900 dark:bg-white/10 dark:text-white">
                {slideCount} de {MAX_CAROUSEL_SLIDES}
              </span>
            </div>
            <input
              type="range"
              value={slideCount}
              onChange={(event) => setSlideCount(Number(event.target.value))}
              min={MIN_CAROUSEL_SLIDES}
              max={MAX_CAROUSEL_SLIDES}
              step={1}
              className="w-full accent-stone-900 dark:accent-white"
              aria-label="Quantidade de imagens"
            />
            <div className="mt-[10px] flex flex-wrap gap-[8px]">
              {[5, 8, 10].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSlideCount(count)}
                  className={`rounded-[999px] border px-[10px] py-[6px] text-[12px] font-[800] ${
                    slideCount === count
                      ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
                      : 'border-black/10 bg-white text-black/65 hover:border-stone-500/40 dark:border-white/10 dark:bg-white/10 dark:text-white/75'
                  }`}
                >
                  {count} imagens
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PASSO 3 — MARCA & AJUSTES */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-[20px]">
          {/* Brand kit auto-preenchido e recolhido */}
          <div className="rounded-[14px] border border-black/10 bg-stone-50 p-[16px] dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-[10px]">
              <div className="flex items-center gap-[12px]">
                {brandSwatches.length > 0 && (
                  <span className="flex">
                    {brandSwatches.map((color, index) => (
                      <span
                        key={`${color}-${index}`}
                        className="h-[22px] w-[22px] rounded-full border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: color, marginLeft: index ? -6 : 0 }}
                      />
                    ))}
                  </span>
                )}
                <div>
                  <div className="text-[14px] font-[900] text-black dark:text-white">
                    {brandName.trim() ? `Usando a marca de ${brandName}` : 'Brand Kit da empresa'}
                  </div>
                  <p className="text-[12px] text-black/55 dark:text-white/55">
                    Cores, fontes, CTA, logo e termos vêm do onboarding. Ajuste só se precisar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBrandKit((value) => !value)}
                className="rounded-[10px] border border-black/10 bg-white px-[12px] py-[8px] text-[12px] font-[800] text-black/70 hover:bg-stone-50 dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
              >
                {editingBrandKit ? 'Recolher' : 'Ajustar'}
              </button>
            </div>

            {editingBrandKit && (
              <div className="mt-[14px] grid grid-cols-1 gap-[14px] md:grid-cols-2">
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[13px] font-[600]">Nome da marca</span>
                  <input value={brandName} onChange={(event) => setBrandName(event.target.value)} className={inputClass} maxLength={80} />
                </label>
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[13px] font-[600]">Cores</span>
                  <input value={brandColors} onChange={(event) => setBrandColors(event.target.value)} className={inputClass} maxLength={120} />
                </label>
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[13px] font-[600]">Fontes / estilo tipográfico</span>
                  <input value={brandFonts} onChange={(event) => setBrandFonts(event.target.value)} className={inputClass} maxLength={180} />
                </label>
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[13px] font-[600]">CTA padrão</span>
                  <input value={defaultCta} onChange={(event) => setDefaultCta(event.target.value)} className={inputClass} maxLength={120} />
                </label>
                <label className="flex flex-col gap-[6px] md:col-span-2">
                  <span className="text-[13px] font-[600]">Termos proibidos</span>
                  <input
                    value={forbiddenTerms}
                    onChange={(event) => setForbiddenTerms(event.target.value)}
                    placeholder="Ex: garantido, milagre, sem esforço"
                    className={inputClass}
                    maxLength={240}
                  />
                </label>

                <div className="md:col-span-2 grid grid-cols-1 gap-[10px] md:grid-cols-2">
                  <div className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">Uso do logo</span>
                    <div className="flex flex-wrap gap-[8px]">
                      {logoUsageOptions.map((option) => (
                        <ChoiceChip key={option.value} active={logoUsage === option.value} onClick={() => setLogoUsage(option.value)}>
                          {option.label}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">Posição da assinatura</span>
                    <div className="flex flex-wrap gap-[8px]">
                      {logoPositionOptions.map((option) => (
                        <ChoiceChip key={option.value} active={logoPosition === option.value} onClick={() => setLogoPosition(option.value)}>
                          {option.label}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">Tamanho da assinatura</span>
                    <div className="flex flex-wrap gap-[8px]">
                      {logoScaleOptions.map((option) => (
                        <ChoiceChip key={option.value} active={logoScale === option.value} onClick={() => setLogoScale(option.value)}>
                          {option.label}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>
                  <label className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">Referência de logo/identidade</span>
                    <select
                      value={selectedLogoReferenceId}
                      onChange={(event) => setSelectedLogoReferenceId(event.target.value)}
                      className={inputClass}
                      disabled={!brandLogoReferences.length}
                    >
                      <option value="">
                        {brandLogoReferences.length ? 'Usar apenas o nome da marca' : 'Nenhuma imagem do onboarding'}
                      </option>
                      {brandLogoReferences.map((reference) => (
                        <option key={reference.id} value={reference.id}>
                          {reference.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Público-alvo (chips) */}
          <div className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[600]">Público-alvo</span>
            <div className="flex flex-wrap gap-[8px]">
              {audienceOptions.map((option) => (
                <ChoiceChip key={option} active={audience === option} onClick={() => setAudience(audience === option ? '' : option)}>
                  {option}
                </ChoiceChip>
              ))}
            </div>
            {audienceIsCustom && (
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="Público personalizado"
                className={`${inputClass} max-w-[360px]`}
                maxLength={240}
              />
            )}
            <button
              type="button"
              onClick={() => setAudience(audienceIsCustom ? '' : ' ')}
              className="w-fit text-[12px] font-[700] text-black/45 underline-offset-2 hover:underline dark:text-white/45"
            >
              {audienceIsCustom ? 'Usar opções acima' : 'Outro público (digitar)'}
            </button>
          </div>

          {/* Tom de voz (chips) */}
          <div className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[600]">Tom de voz</span>
            <div className="flex flex-wrap gap-[8px]">
              {toneOptions.map((option) => (
                <ChoiceChip key={option.value} active={tone === option.value} onClick={() => setTone(option.value)}>
                  {option.label}
                </ChoiceChip>
              ))}
            </div>
          </div>

          {/* Estilo visual (presets) */}
          <div className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[600]">Estilo visual das imagens</span>
            <div className="grid grid-cols-2 gap-[8px] md:grid-cols-4">
              {visualStylePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setVisualStyle(preset.value)}
                  className={`rounded-[10px] border px-[10px] py-[10px] text-[13px] font-[700] transition ${
                    visualStyle === preset.value
                      ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
                      : 'border-black/10 bg-white text-black/65 hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Avançado de verdade: modelo de texto, estilo custom, observações */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="rounded-[10px] px-[10px] py-[8px] text-[13px] font-[800] text-black/60 hover:bg-black/5 hover:underline dark:text-white/70 dark:hover:bg-white/10"
            >
              {showAdvanced ? 'Ocultar opções avançadas' : 'Mostrar opções avançadas'}
            </button>

            {showAdvanced && (
              <div className="mt-[10px] grid grid-cols-1 gap-[14px] rounded-[12px] border border-newTableBorder bg-newBgColorInner p-[16px] md:grid-cols-2">
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[13px] font-[500]">Modelo de texto</span>
                  <input value={textModel} onChange={(event) => setTextModel(event.target.value)} className={inputClass} maxLength={128} />
                </label>
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[13px] font-[500]">Estilo visual (personalizado)</span>
                  <textarea
                    value={visualStyle}
                    onChange={(event) => setVisualStyle(event.target.value)}
                    className={`${textAreaClass} min-h-[80px]`}
                    maxLength={400}
                  />
                </label>
                <label className="flex flex-col gap-[6px] md:col-span-2">
                  <span className="text-[13px] font-[500]">Observações da marca</span>
                  <textarea
                    value={brandNotes}
                    onChange={(event) => setBrandNotes(event.target.value)}
                    placeholder="Ex: mencionar minha empresa..."
                    className={`${textAreaClass} min-h-[80px]`}
                    maxLength={600}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navegação do brief */}
      <div className="mt-[24px] flex items-center justify-between gap-[12px] border-t border-black/5 pt-[20px] dark:border-white/5">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="rounded-[10px] px-[16px] py-[11px] text-[14px] font-[700] text-black/60 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-30 dark:text-white/60 dark:hover:text-white"
        >
          Voltar
        </button>

        {step < BRIEF_STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={goNext}
            className="rounded-[10px] !h-[48px] !px-8 text-[15px] font-[800]"
          >
            Continuar
          </Button>
        ) : (
          <div className="flex items-center gap-[16px]">
            <span className="hidden text-[13px] text-textItemBlur sm:inline">Roteiro, texto dos slides e direção visual</span>
            <Button
              type="submit"
              loading={planning}
              disabled={planDisabled}
              className="rounded-[10px] !h-[48px] !px-8 text-[15px] font-[800] !bg-stone-950 !text-white hover:!bg-stone-800 disabled:!bg-black/10 disabled:!text-black/35 dark:!bg-stone-100 dark:!text-stone-950 dark:hover:!bg-white dark:disabled:!bg-white/10 dark:disabled:!text-white/45"
            >
              Criar copy visual
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
