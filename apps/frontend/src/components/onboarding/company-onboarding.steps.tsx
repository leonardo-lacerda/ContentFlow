'use client';

import { ChangeEvent, ReactNode } from 'react';
import { Button } from '@gitroom/react/form/button';
import {
  Building2,
  Globe,
  Target,
  Lightbulb,
  UploadCloud,
  Image as ImageIcon,
  X,
  FileText,
  Sparkles,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import {
  CompanyProfile,
  VisualIdentityAsset,
  inputClass,
  textAreaClass,
  industryOptions,
  audienceOptions,
  toneOptions,
  differentialOptions,
  ctaOptions,
  contentPreferenceOptions,
  fontStylePresets,
  styleDoLibrary,
  styleDontLibrary,
  listToArray,
} from './company-onboarding.types';
import { OptionChip, TagInput, SectionTitle, FieldLabel } from './company-onboarding.ui-helpers';

// ---- Common props shared by all steps ----

export interface StepProps {
  profile: CompanyProfile;
  update: (patch: Partial<CompanyProfile>) => void;
  toggleInField: (field: keyof CompanyProfile, value: string, max?: number) => void;
  generating: boolean;
  generateSummary: () => void;
  industryIsCustom: boolean;
  selectedTones: string[];
  uploadVisualAssets: (event: ChangeEvent<HTMLInputElement>) => void;
  removeVisualAsset: (id: string) => void;
  updateVisualAssetDescription: (id: string, description: string) => void;
  promoteAssetToLogo: (asset: VisualIdentityAsset) => void;
  removeBrandKitItem: (
    collection: 'brandPalettes' | 'brandFontPresets' | 'brandLogos' | 'styleRules',
    id: string
  ) => void;
  generateVisualIdentity: () => void;
  describingVisualIdentity: boolean;
  saveCurrentFontPreset: () => void;
  addStyleRule: (type: 'do' | 'dont', text: string) => void;
  updateStyleRule: (id: string, text: string) => void;
  removeStyleRuleByContent: (type: 'do' | 'dont', text: string) => void;
  contentPillars: string[];
  postIdeas: string[];
  deleteCompany: () => void;
  selectedCompanyId: string;
  saving: boolean;
}

// ---- Step 1 — Identity ----

export const IdentityStep = ({
  profile,
  update,
  generating,
  generateSummary,
  industryIsCustom,
  toggleInField,
}: StepProps) => (
  <div className="flex flex-col gap-[24px]">
    <SectionTitle
      title="Identidade básica"
      subtitle="Comece com o nome e o site. Nós analisamos o site e já adiantamos o resto pra você."
    />

    <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2">
      <label className="group flex flex-col gap-[10px]">
        <FieldLabel>Nome da empresa</FieldLabel>
        <div className="relative">
          <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
            <Building2 className="h-[18px] w-[18px]" />
          </div>
          <input
            value={profile.companyName}
            onChange={(event) => update({ companyName: event.target.value })}
            className={inputClass}
            placeholder="Ex: TechFlow"
            maxLength={120}
          />
        </div>
      </label>

      <label className="group flex flex-col gap-[10px]">
        <FieldLabel>Website oficial</FieldLabel>
        <div className="relative">
          <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
            <Globe className="h-[18px] w-[18px]" />
          </div>
          <input
            value={profile.website}
            onChange={(event) => update({ website: event.target.value })}
            placeholder="https://seusite.com"
            className={inputClass}
            maxLength={300}
          />
        </div>
      </label>
    </div>

    <div className="flex flex-col gap-[10px] rounded-[16px] border border-stone-500/20 bg-stone-500/5 p-[18px]">
      <div className="flex items-center gap-[8px]">
        <Sparkles className="h-[18px] w-[18px] text-stone-600 dark:text-stone-300" />
        <span className="text-[14px] font-[800] text-black dark:text-white">Preenchimento automático</span>
      </div>
      <p className="text-[13px] leading-relaxed text-black/55 dark:text-white/55">
        Analisamos o conteúdo do seu site para gerar o resumo da empresa, pilares e ideias de conteúdo. Você só revisa e ajusta.
      </p>
      <Button
        type="button"
        onClick={generateSummary}
        loading={generating}
        className="!bg-stone-950 hover:!bg-stone-800 border-none !text-white shadow-none dark:!bg-stone-100 dark:!text-stone-950 dark:hover:!bg-white w-fit"
      >
        <Sparkles className="mr-2 h-4 w-4 inline-block" />
        Analisar meu site
      </Button>
    </div>

    <div className="flex flex-col gap-[12px]">
      <FieldLabel>Setor / Nicho</FieldLabel>
      <div className="flex flex-wrap gap-[8px]">
        {industryOptions.map((option) => (
          <OptionChip
            key={option}
            active={profile.industry === option}
            onClick={() => update({ industry: profile.industry === option ? '' : option })}
          >
            {option}
          </OptionChip>
        ))}
      </div>
      {industryIsCustom && (
        <input
          value={profile.industry}
          onChange={(event) => update({ industry: event.target.value })}
          placeholder="Setor personalizado"
          className="h-[44px] w-full max-w-[360px] rounded-[10px] border border-black/10 bg-white px-[14px] text-[14px] text-black outline-none dark:border-white/10 dark:bg-[#171717] dark:text-white"
          maxLength={160}
        />
      )}
      <button
        type="button"
        onClick={() => update({ industry: industryIsCustom ? '' : ' ' })}
        className="w-fit text-[12px] font-[700] text-black/45 underline-offset-2 hover:underline dark:text-white/45"
      >
        {industryIsCustom ? 'Usar opções acima' : 'Outro setor (digitar)'}
      </button>
    </div>

    <div className="flex flex-col gap-[12px]">
      <div>
        <FieldLabel>Público-alvo</FieldLabel>
        <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">Selecione um ou mais.</p>
      </div>
      <div className="flex flex-wrap gap-[8px]">
        {audienceOptions.map((option) => (
          <OptionChip
            key={option}
            active={listToArray(profile.targetAudience).includes(option)}
            onClick={() => toggleInField('targetAudience', option)}
          >
            {option}
          </OptionChip>
        ))}
      </div>
    </div>
  </div>
);

// ---- Step 2 — Positioning ----

export const PositioningStep = ({
  profile,
  update,
  toggleInField,
  selectedTones,
}: StepProps) => (
  <div className="flex flex-col gap-[24px]">
    <SectionTitle
      title="Posicionamento"
      subtitle="O que você oferece, o que te diferencia e como soa a sua marca."
    />

    <label className="flex flex-col gap-[10px]">
      <FieldLabel>Produtos ou serviços</FieldLabel>
      <p className="-mt-[4px] text-[12px] text-black/50 dark:text-white/50">
        Se você analisou o site, isto pode já vir no resumo. Ajuste em uma linha.
      </p>
      <textarea
        value={profile.productsOrServices}
        onChange={(event) => update({ productsOrServices: event.target.value })}
        placeholder="Ex: Plataforma de agendamento de posts para redes sociais."
        className={`${textAreaClass} min-h-[90px]`}
        maxLength={500}
      />
    </label>

    <div className="flex flex-col gap-[12px]">
      <div>
        <FieldLabel>Diferenciais competitivos</FieldLabel>
        <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">Selecione o que mais combina com a sua marca.</p>
      </div>
      <div className="flex flex-wrap gap-[8px]">
        {differentialOptions.map((option) => (
          <OptionChip
            key={option}
            active={listToArray(profile.differentials).includes(option)}
            onClick={() => toggleInField('differentials', option)}
          >
            {option}
          </OptionChip>
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-[12px]">
      <div>
        <FieldLabel>Tom de voz da marca</FieldLabel>
        <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">
          Escolha até 3 ({selectedTones.length}/3).
        </p>
      </div>
      <div className="flex flex-wrap gap-[8px]">
        {toneOptions.map((option) => (
          <OptionChip
            key={option}
            active={selectedTones.includes(option)}
            onClick={() => toggleInField('toneOfVoice', option, 3)}
          >
            {option}
          </OptionChip>
        ))}
      </div>
    </div>
  </div>
);

// ---- Step 3 — Visual ----

export const VisualStep = ({
  profile,
  update,
  uploadVisualAssets,
  removeVisualAsset,
  promoteAssetToLogo,
  removeBrandKitItem,
  generateVisualIdentity,
  describingVisualIdentity,
  saveCurrentFontPreset,
  updateVisualAssetDescription,
}: StepProps) => (
  <div className="flex flex-col gap-[24px]">
    <SectionTitle
      title="Identidade visual"
      subtitle="Envie referências e nós descrevemos o estilo. Depois é só confirmar cores e letras."
    />

    <label className="flex cursor-pointer flex-col items-center justify-center gap-[10px] rounded-[18px] border border-dashed border-black/20 bg-white/70 p-[24px] text-center transition hover:border-stone-500/50 hover:bg-stone-50 dark:border-white/20 dark:bg-black/20 dark:hover:bg-white/5">
      <UploadCloud className="h-[28px] w-[28px] text-stone-500 dark:text-stone-300" />
      <div>
        <p className="text-[14px] font-[800] text-black dark:text-white">Enviar referências visuais</p>
        <p className="mt-[2px] text-[12px] text-black/55 dark:text-white/55">
          Posts, logos, banners ou prints. Até 8 imagens.
        </p>
      </div>
      <input type="file" accept="image/*" multiple className="hidden" onChange={uploadVisualAssets} />
    </label>

    {!!(profile.visualIdentityAssets || []).length && (
      <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
        {(profile.visualIdentityAssets || []).map((asset) => (
          <div
            key={asset.id}
            className="overflow-hidden rounded-[16px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#151824]"
          >
            <div className="relative aspect-[4/3] bg-black/5 dark:bg-white/5">
              <img src={asset.dataUrl} alt={asset.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeVisualAsset(asset.id)}
                className="absolute right-[10px] top-[10px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600"
                aria-label="Remover referência visual"
              >
                <X className="h-[16px] w-[16px]" />
              </button>
            </div>
            <div className="flex flex-col gap-[8px] p-[12px]">
              <div className="flex items-center gap-[8px] text-[12px] font-[700] text-black/70 dark:text-white/70">
                <ImageIcon className="h-[14px] w-[14px]" />
                <span className="truncate">{asset.name}</span>
              </div>
              <button
                type="button"
                onClick={() => promoteAssetToLogo(asset)}
                className="w-fit rounded-[9px] border border-stone-500/20 bg-stone-500/10 px-[10px] py-[7px] text-[11px] font-[900] text-stone-800 hover:bg-stone-500/15 dark:text-stone-200"
              >
                Usar como logo oficial
              </button>
              <textarea
                value={asset.description}
                onChange={(event) => updateVisualAssetDescription(asset.id, event.target.value)}
                placeholder="Descrição editável. O sistema preenche após a análise."
                className={`${textAreaClass} min-h-[80px] p-[12px] text-[12px]`}
                maxLength={1600}
              />
            </div>
          </div>
        ))}
      </div>
    )}

    {!!(profile.brandLogos || []).length && (
      <div className="rounded-[16px] border border-stone-500/20 bg-stone-500/10 p-[14px]">
        <div className="mb-[10px] text-[13px] font-[900] text-stone-800 dark:text-stone-100">Logos oficiais</div>
        <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2">
          {(profile.brandLogos || []).map((logo) => (
            <div key={logo.id} className="flex gap-[10px] rounded-[12px] border border-stone-500/20 bg-white/70 p-[10px] dark:bg-black/20">
              <img src={logo.dataUrl} alt={logo.name} className="h-[58px] w-[58px] rounded-[10px] object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-[900] text-black dark:text-white">{logo.name}</div>
                <button type="button" onClick={() => removeBrandKitItem('brandLogos', logo.id)} className="mt-[6px] text-[11px] font-[800] text-red-400">
                  remover logo
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="flex flex-wrap items-center gap-[12px]">
      <Button
        type="button"
        onClick={generateVisualIdentity}
        loading={describingVisualIdentity}
        className="!bg-stone-950 hover:!bg-stone-800 border-none !text-white shadow-none dark:!bg-stone-100 dark:!text-stone-950 dark:hover:!bg-white"
      >
        <FileText className="mr-2 h-4 w-4 inline-block" />
        Analisar identidade visual
      </Button>
    </div>

    <div className="flex flex-col gap-[12px] rounded-[16px] border border-black/10 bg-white/60 p-[18px] dark:border-white/10 dark:bg-black/20">
      <div>
        <FieldLabel>Estilo das letras</FieldLabel>
        <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">Como os textos dentro das imagens devem parecer.</p>
      </div>
      <div className="grid grid-cols-1 gap-[8px]">
        {fontStylePresets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => update({ brandFonts: preset })}
            className={`rounded-[12px] border px-[12px] py-[10px] text-left text-[13px] font-[700] transition ${
              profile.brandFonts === preset
                ? 'border-stone-900 bg-stone-900/5 text-stone-900 dark:border-white dark:bg-white/5 dark:text-stone-100'
                : 'border-black/10 bg-black/5 text-black/65 hover:border-stone-500/40 dark:border-white/10 dark:bg-white/5 dark:text-white/65'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={saveCurrentFontPreset}
        className="w-fit rounded-[10px] border border-stone-500/20 bg-stone-500/10 px-[12px] py-[8px] text-[12px] font-[800] text-stone-800 transition hover:bg-stone-500/15 dark:text-stone-200"
      >
        Salvar estilo de letras
      </button>
    </div>

    {profile.visualIdentitySummary && (
      <label className="flex flex-col gap-[8px]">
        <FieldLabel>Resumo visual da marca</FieldLabel>
        <textarea
          value={profile.visualIdentitySummary}
          onChange={(event) => update({ visualIdentitySummary: event.target.value })}
          className={`${textAreaClass} min-h-[120px]`}
          maxLength={4000}
        />
      </label>
    )}
  </div>
);

// ---- Step 4 — Voice & Rules ----

export const VoiceRulesStep = ({
  profile,
  update,
  toggleInField,
  addStyleRule,
  updateStyleRule,
  removeBrandKitItem,
  removeStyleRuleByContent,
}: StepProps) => (
  <div className="flex flex-col gap-[24px]">
    <SectionTitle
      title="Voz e regras"
      subtitle="Defina chamada padrão, o que evitar e o estilo dos seus conteúdos."
    />

    <div className="flex flex-col gap-[12px]">
      <FieldLabel>Chamada para ação (CTA) padrão</FieldLabel>
      <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
        {ctaOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => update({ defaultCta: profile.defaultCta === option ? '' : option })}
            className={`rounded-[12px] border px-[14px] py-[11px] text-left text-[13px] font-[700] transition ${
              profile.defaultCta === option
                ? 'border-stone-900 bg-stone-900/5 text-stone-900 dark:border-white dark:bg-white/5 dark:text-stone-100'
                : 'border-black/10 bg-black/5 text-black/65 hover:border-stone-500/40 dark:border-white/10 dark:bg-white/5 dark:text-white/65'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <input
        value={ctaOptions.includes(profile.defaultCta) ? '' : profile.defaultCta}
        onChange={(event) => update({ defaultCta: event.target.value })}
        placeholder="Ou escreva um CTA personalizado"
        className="h-[44px] w-full rounded-[10px] border border-black/10 bg-white px-[14px] text-[14px] text-black outline-none dark:border-white/10 dark:bg-[#171717] dark:text-white"
        maxLength={240}
      />
    </div>

    <div className="flex flex-col gap-[12px]">
      <div>
        <FieldLabel>Preferências de conteúdo</FieldLabel>
        <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">Que tipos de post você prefere.</p>
      </div>
      <div className="flex flex-wrap gap-[8px]">
        {contentPreferenceOptions.map((option) => (
          <OptionChip
            key={option}
            active={listToArray(profile.contentPreferences).includes(option)}
            onClick={() => toggleInField('contentPreferences', option)}
          >
            {option}
          </OptionChip>
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-[10px]">
      <div>
        <FieldLabel>Termos proibidos</FieldLabel>
        <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">Digite e pressione Enter para adicionar.</p>
      </div>
      <TagInput
        value={profile.forbiddenTerms}
        onChange={(next) => update({ forbiddenTerms: next })}
        placeholder="Ex: garantido, milagre, sem esforço"
      />
    </div>

    <div className="flex flex-col gap-[12px]">
      <FieldLabel>Regras de estilo</FieldLabel>
      <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
        <div className="flex flex-col gap-[8px]">
          <span className="text-[12px] font-[900] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Usar</span>
          {styleDoLibrary.map((text) => {
            const active = (profile.styleRules || []).some((rule) => rule.type === 'do' && rule.text === text);
            return (
              <button
                key={text}
                type="button"
                onClick={() =>
                  active ? removeStyleRuleByContent('do', text) : addStyleRule('do', text)
                }
                className={`rounded-[10px] border px-[12px] py-[9px] text-left text-[12px] font-[700] transition ${
                  active
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                    : 'border-black/10 bg-black/5 text-black/60 hover:border-emerald-500/40 dark:border-white/10 dark:bg-white/5 dark:text-white/60'
                }`}
              >
                {active ? '✓ ' : '+ '}
                {text}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-[8px]">
          <span className="text-[12px] font-[900] uppercase tracking-[0.12em] text-red-700 dark:text-red-300">Evitar</span>
          {styleDontLibrary.map((text) => {
            const active = (profile.styleRules || []).some((rule) => rule.type === 'dont' && rule.text === text);
            return (
              <button
                key={text}
                type="button"
                onClick={() =>
                  active ? removeStyleRuleByContent('dont', text) : addStyleRule('dont', text)
                }
                className={`rounded-[10px] border px-[12px] py-[9px] text-left text-[12px] font-[700] transition ${
                  active
                    ? 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200'
                    : 'border-black/10 bg-black/5 text-black/60 hover:border-red-500/40 dark:border-white/10 dark:bg-white/5 dark:text-white/60'
                }`}
              >
                {active ? '✓ ' : '+ '}
                {text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom rules added (editable) */}
      {(profile.styleRules || []).some(
        (rule) => ![...styleDoLibrary, ...styleDontLibrary].includes(rule.text)
      ) && (
        <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2">
          {(profile.styleRules || [])
            .filter((rule) => ![...styleDoLibrary, ...styleDontLibrary].includes(rule.text))
            .map((rule) => (
              <div key={rule.id} className={`rounded-[12px] border p-[10px] ${rule.type === 'do' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
                <div className="mb-[6px] flex items-center justify-between gap-[8px]">
                  <span className="text-[11px] font-[900] uppercase tracking-[0.12em] text-black/60 dark:text-white/60">
                    {rule.type === 'do' ? 'Usar' : 'Evitar'}
                  </span>
                  <button type="button" onClick={() => removeBrandKitItem('styleRules', rule.id)} className="text-[11px] font-[800] text-red-400">remover</button>
                </div>
                <textarea
                  value={rule.text}
                  onChange={(event) => updateStyleRule(rule.id, event.target.value)}
                  className="min-h-[60px] w-full resize-y rounded-[10px] border border-black/10 bg-white/60 p-[10px] text-[12px] text-black outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  maxLength={500}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  </div>
);

// ---- Step 5 — Review ----

export const ReviewStep = ({
  profile,
  update,
  contentPillars,
  postIdeas,
  deleteCompany,
  selectedCompanyId,
  saving,
}: StepProps) => (
  <div className="flex flex-col gap-[24px]">
    <SectionTitle
      title="Revisão final"
      subtitle="Confira o resumo gerado e ajuste se necessário. Depois é só concluir."
    />

    {!profile.summary && (
      <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 p-[14px] text-[13px] text-amber-700 dark:text-amber-200">
        Você ainda não gerou o resumo da empresa. Volte ao passo 1 e clique em "Analisar meu site" para um resultado melhor (mas você já pode concluir mesmo assim).
      </div>
    )}

    <label className="flex flex-col gap-[10px]">
      <FieldLabel>Resumo de contexto</FieldLabel>
      <textarea
        value={profile.summary}
        onChange={(event) => update({ summary: event.target.value })}
        className={`${textAreaClass} min-h-[150px] text-[13px] leading-relaxed`}
        placeholder="Resumo gerado pela análise do site. Você pode editar."
        maxLength={4000}
      />
    </label>

    {contentPillars.length > 0 && (
      <div className="flex flex-col gap-[10px]">
        <h3 className="flex items-center gap-[8px] text-[15px] font-[700] text-black dark:text-white">
          <Target className="h-[16px] w-[16px] text-stone-500 dark:text-stone-300" />
          Pilares de conteúdo
        </h3>
        <div className="flex flex-wrap gap-[8px]">
          {contentPillars.map((pillar, index) => (
            <span key={`${pillar}-${index}`} className="rounded-full border border-stone-500/20 bg-stone-500/10 px-[12px] py-[6px] text-[12px] font-medium text-stone-700 dark:text-stone-200">
              {pillar}
            </span>
          ))}
        </div>
      </div>
    )}

    {postIdeas.length > 0 && (
      <div className="flex flex-col gap-[10px]">
        <h3 className="flex items-center gap-[8px] text-[15px] font-[700] text-black dark:text-white">
          <Lightbulb className="h-[16px] w-[16px] text-stone-500 dark:text-stone-300" />
          Ideias iniciais
        </h3>
        <div className="flex flex-col gap-[8px]">
          {postIdeas.map((idea, index) => (
            <div key={`${idea}-${index}`} className="rounded-[12px] border border-black/5 bg-black/5 p-[12px] text-[13px] leading-relaxed text-black/80 dark:border-white/5 dark:bg-white/5 dark:text-white/80">
              {idea}
            </div>
          ))}
        </div>
      </div>
    )}

    <button
      type="button"
      onClick={deleteCompany}
      disabled={!selectedCompanyId || saving}
      className="flex w-fit items-center gap-[8px] text-[13px] font-[700] text-red-400 transition hover:text-red-500 disabled:opacity-40"
    >
      <Trash2 className="h-[15px] w-[15px]" />
      Excluir esta empresa
    </button>
  </div>
);
