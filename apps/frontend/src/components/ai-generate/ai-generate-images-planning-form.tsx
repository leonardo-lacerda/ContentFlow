import { Button } from '@gitroom/react/form/button';

import {
  MAX_CAROUSEL_SLIDES,
  MIN_CAROUSEL_SLIDES,
  carouselTemplates,
  inputClass,
  textAreaClass,
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

  return (
    <form
      onSubmit={generatePlan}
      className="rounded-[18px] border border-black/10 bg-white p-[32px] shadow-sm dark:border-white/10 dark:bg-[#101010]"
    >
      <div className="mb-[24px] flex flex-col gap-[8px]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 font-bold text-stone-800 dark:text-stone-100">
            1
          </div>
          <h3 className="text-[24px] font-[700] text-black dark:text-white">
            Sobre o que vamos falar?
          </h3>
        </div>
        <p className="text-[15px] text-black/60 dark:text-white/60 ml-13 pl-[12px]">
          Me conte a ideia central. O estúdio cria a copy visual de cada slide e a direção das imagens.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2 ml-11">
        <label className="flex flex-col gap-[8px] md:col-span-2">
          <span className="text-[14px] font-[600]">
            Para qual empresa vamos criar?
          </span>
          <select
            value={selectedCompanyId}
            onChange={(event) => {
              const nextId = event.target.value;
              const nextCompany = companyProfiles.find(
                (company) => company.id === nextId
              );
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
                {company.summary?.trim()
                  ? ' - resumo ok'
                  : ' - falta resumo'}
              </option>
            ))}
          </select>
          {!hasRequiredCompanySummary && (
            <span className="text-[12px] text-yellow-300">
              O resumo da empresa é obrigatório para gerar ideias e
              carrosséis.{' '}
              <a
                href="/onboarding/company"
                className="font-[700] text-primary hover:underline"
              >
                Completar onboarding
              </a>
            </span>
          )}
        </label>

        <label className="flex flex-col gap-[8px] md:col-span-2">
          <span className="text-[14px] font-[600]">
            Qual é o tema principal do seu post?
          </span>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Ex: 5 dicas para melhorar a conversão do seu site"
            className={`${inputClass} !h-[50px] !text-[15px]`}
            maxLength={240}
          />
        </label>

        <div className="md:col-span-2 rounded-[12px] border border-newTableBorder bg-newBgColorInner p-[12px]">
          <div className="flex flex-wrap items-center gap-[10px]">
            <button
              type="button"
              onClick={generateCompanyIdeas}
              className="flex items-center gap-[8px] rounded-[10px] border border-black/10 bg-white px-[12px] py-[8px] text-[13px] font-[800] text-black shadow-sm hover:border-stone-500/40 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              disabled={
                loadingIdeas ||
                loadingCompanyProfile ||
                !hasRequiredCompanySummary
              }
            >
              {loadingIdeas && <Spinner size={14} />}
              {loadingIdeas
                ? 'Gerando ideias...'
                : companyIdeas.length > 0
                ? 'Gerar mais ideias (sem repetir)'
                : 'Gerar ideias com contexto da empresa'}
            </button>
            <a
              href="/onboarding/company"
              className="rounded-[10px] px-[10px] py-[8px] text-[13px] font-[800] text-white hover:bg-white/10 hover:underline"
            >
              Abrir onboarding da empresa
            </a>
            {hasRequiredCompanySummary ? (
              <span className="text-[12px] text-green-400">
                Usando contexto de{' '}
                {companyProfile?.companyName || 'empresa selecionada'}
              </span>
            ) : (
              <span className="text-[12px] text-yellow-300">
                Sem resumo salvo: complete o onboarding para liberar ideias
              </span>
            )}
          </div>

          {ideasError && (
            <div className="mt-[8px] text-[12px] text-red-300">
              {ideasError}
            </div>
          )}

          {companyIdeas.length > 0 && (
            <div className="mt-[8px] text-[12px] text-green-400">
              {companyIdeas.length} ideia{companyIdeas.length > 1 ? 's' : ''}{' '}
              salva{companyIdeas.length > 1 ? 's' : ''} — ficam guardadas e não
              gastam tokens ao reabrir.
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
                  className="rounded-[10px] border border-black/10 bg-white p-[10px] text-left text-black hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  <div className="text-[13px] font-[700]">{idea.title}</div>
                  {idea.hook && (
                    <div className="mt-[4px] text-[12px] text-textItemBlur">
                      {idea.hook}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col gap-[8px]">
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

        <label className="flex flex-col gap-[8px]">
          <span className="text-[14px] font-[500]">
            Qual o seu objetivo?
          </span>
          <select
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className={inputClass}
          >
            <option value="educar e gerar engajamento">
              Educar e engajar minha audiência
            </option>
            <option value="vender uma oferta">
              Vender um produto ou serviço
            </option>
            <option value="gerar autoridade">
              Mostrar que sou especialista (Autoridade)
            </option>
            <option value="capturar leads">
              Capturar contatos (Leads)
            </option>
          </select>
        </label>

        <label className="flex flex-col gap-[8px]">
          <span className="text-[14px] font-[500]">Plataforma</span>
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className={inputClass}
          >
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
          </select>
        </label>

        <div className="md:col-span-2 rounded-[14px] border border-stone-500/20 bg-stone-500/10 p-[14px]">
          <div className="mb-[10px] flex flex-wrap items-center justify-between gap-[10px]">
            <div>
              <span className="text-[14px] font-[800] text-black dark:text-white">
                Quantidade de imagens
              </span>
              <p className="mt-[3px] text-[12px] text-black/55 dark:text-white/60">
                Escolha quantos slides com texto serão criados neste carrossel.
              </p>
            </div>
            <span className="rounded-full bg-white px-[10px] py-[5px] text-[12px] font-[900] text-stone-900 dark:bg-white/10 dark:text-white">
              {slideCount} de {MAX_CAROUSEL_SLIDES}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-[10px] md:grid-cols-[1fr_92px]">
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
            <input
              type="number"
              value={slideCount}
              onChange={(event) => setSlideCount(Number(event.target.value))}
              min={MIN_CAROUSEL_SLIDES}
              max={MAX_CAROUSEL_SLIDES}
              className={inputClass}
              aria-label="Número de imagens"
            />
          </div>
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

        {/* Botão de Opções Avançadas */}
        <div className="md:col-span-2 mt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="rounded-[10px] px-[10px] py-[8px] text-[14px] font-[800] text-white hover:bg-white/10 hover:underline flex items-center gap-1"
          >
            {showAdvanced
              ? 'Ocultar opções avançadas'
              : 'Mostrar opções avançadas'}
          </button>
        </div>

        {showAdvanced && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-[16px] p-[16px] bg-newBgColorInner rounded-[12px] border border-newTableBorder mt-2">
            <label className="flex flex-col gap-[8px]">
              <span className="text-[14px] font-[500]">Público-alvo</span>
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="Ex: empreendedores"
                className={inputClass}
                maxLength={240}
              />
            </label>

            <label className="flex flex-col gap-[8px]">
              <span className="text-[14px] font-[500]">Tom de voz</span>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className={inputClass}
              >
                <option value="claro, prático e persuasivo">
                  Claro, prático e persuasivo
                </option>
                <option value="especialista, direto e premium">
                  Especialista, direto e premium
                </option>
                <option value="leve, divertido e provocativo">
                  Leve, divertido e provocativo
                </option>
                <option value="emocional, acolhedor e inspirador">
                  Emocional, acolhedor e inspirador
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-[8px]">
              <span className="text-[14px] font-[500]">
                Modelo de texto
              </span>
              <input
                value={textModel}
                onChange={(event) => setTextModel(event.target.value)}
                className={inputClass}
                maxLength={128}
              />
            </label>

            <label className="flex flex-col gap-[8px] md:col-span-2">
              <span className="text-[14px] font-[500]">
                Estilo visual das imagens
              </span>
              <textarea
                value={visualStyle}
                onChange={(event) => setVisualStyle(event.target.value)}
                className={`${textAreaClass} min-h-[80px]`}
                maxLength={400}
              />
            </label>

            <label className="flex flex-col gap-[8px] md:col-span-2">
              <span className="text-[14px] font-[500]">
                Observações da marca
              </span>
              <textarea
                value={brandNotes}
                onChange={(event) => setBrandNotes(event.target.value)}
                placeholder="Ex: mencionar minha empresa..."
                className={`${textAreaClass} min-h-[80px]`}
                maxLength={600}
              />
            </label>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-[16px] rounded-[12px] border border-newTableBorder bg-newBgColor p-[16px]">
              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">
                  Nome da marca
                </span>
                <input
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder="Ex: RevOps"
                  className={inputClass}
                  maxLength={80}
                />
              </label>

              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">Cores</span>
                <input
                  value={brandColors}
                  onChange={(event) => setBrandColors(event.target.value)}
                  className={inputClass}
                  maxLength={120}
                />
              </label>

              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">
                  Fontes / estilo tipográfico
                </span>
                <input
                  value={brandFonts}
                  onChange={(event) => setBrandFonts(event.target.value)}
                  className={inputClass}
                  maxLength={180}
                />
              </label>

              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">CTA padrão</span>
                <input
                  value={defaultCta}
                  onChange={(event) => setDefaultCta(event.target.value)}
                  className={inputClass}
                  maxLength={120}
                />
              </label>

              <label className="flex flex-col gap-[8px] md:col-span-2">
                <span className="text-[14px] font-[500]">
                  Termos proibidos
                </span>
                <input
                  value={forbiddenTerms}
                  onChange={(event) =>
                    setForbiddenTerms(event.target.value)
                  }
                  placeholder="Ex: garantido, milagre, sem esforço"
                  className={inputClass}
                  maxLength={240}
                />
              </label>

              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">
                  Uso do logo / assinatura
                </span>
                <select
                  value={logoUsage}
                  onChange={(event) => setLogoUsage(event.target.value)}
                  className={inputClass}
                >
                  <option value="subtle">Assinatura discreta</option>
                  <option value="text">Só selo textual</option>
                  <option value="none">Não usar logo</option>
                </select>
              </label>

              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">
                  Posição da assinatura
                </span>
                <select
                  value={logoPosition}
                  onChange={(event) => setLogoPosition(event.target.value)}
                  className={inputClass}
                >
                  <option value="top-right">Topo direito</option>
                  <option value="top-left">Topo esquerdo</option>
                  <option value="bottom-right">Rodapé direito</option>
                  <option value="bottom-left">Rodapé esquerdo</option>
                </select>
              </label>

              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">
                  Referência de logo/identidade
                </span>
                <select
                  value={selectedLogoReferenceId}
                  onChange={(event) =>
                    setSelectedLogoReferenceId(event.target.value)
                  }
                  className={inputClass}
                  disabled={!brandLogoReferences.length}
                >
                  <option value="">
                    {brandLogoReferences.length
                      ? 'Usar apenas o nome da marca'
                      : 'Nenhuma imagem do onboarding'}
                  </option>
                  {brandLogoReferences.map((reference) => (
                    <option key={reference.id} value={reference.id}>
                      {reference.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">
                  Tamanho da assinatura
                </span>
                <select
                  value={logoScale}
                  onChange={(event) => setLogoScale(event.target.value)}
                  className={inputClass}
                >
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio</option>
                  <option value="badge">Selo/pill</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="mt-[24px] ml-11 flex items-center gap-[16px]">
        <Button
          type="submit"
          loading={planning}
          disabled={planDisabled}
          className="rounded-[10px] !h-[48px] !px-8 text-[15px] font-[800] !bg-stone-950 !text-white hover:!bg-stone-800 disabled:!bg-black/10 disabled:!text-black/35 dark:!bg-stone-100 dark:!text-stone-950 dark:hover:!bg-white dark:disabled:!bg-white/10 dark:disabled:!text-white/45"
        >
          Criar copy visual
        </Button>
        <span className="text-[13px] text-textItemBlur">
          Roteiro, texto dos slides e direção visual
        </span>
      </div>
    </form>
  );
}
