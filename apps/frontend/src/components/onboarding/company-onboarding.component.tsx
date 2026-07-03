'use client';

import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Globe,
  Target,
  Lightbulb,
  Users,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
  X,
  Palette,
  FileText,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import {
  CompanyProfile,
  VisualIdentityAsset,
  defaultProfile,
  makeDraftAssetId,
  makeBrandKitId,
  listToArray,
  arrayToList,
  compressImageFile,
  industryOptions,
} from './company-onboarding.types';
import { OptionChip, TagInput, SectionTitle, FieldLabel } from './company-onboarding.ui-helpers';
import {
  StepProps,
  IdentityStep,
  PositioningStep,
  VisualStep,
  VoiceRulesStep,
  ReviewStep,
} from './company-onboarding.steps';

const STEPS = [
  { id: 'identity', label: 'Identidade', icon: Building2 },
  { id: 'positioning', label: 'Posicionamento', icon: Target },
  { id: 'visual', label: 'Visual', icon: Palette },
  { id: 'voice', label: 'Voz e regras', icon: MessageSquare },
  { id: 'review', label: 'Revisão', icon: CheckCircle2 },
] as const;

export const CompanyOnboardingComponent = () => {
  const { backendUrl } = useVariables();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [profile, setProfile] = useState<CompanyProfile>(defaultProfile);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [describingVisualIdentity, setDescribingVisualIdentity] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contentPillars, setContentPillars] = useState<string[]>([]);
  const [postIdeas, setPostIdeas] = useState<string[]>([]);
  const request = useCallback(
    (path: string, options: RequestInit = {}) =>
      fetch(`${backendUrl}${path}`, {
        credentials: 'include',
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          ...options.headers,
        },
      }),
    [backendUrl]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const response = await request('/settings/company-profiles');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return;
        }

        const nextCompanies = Array.isArray(data?.companies) ? data.companies : [];
        const nextSelectedId = data?.selectedCompanyId || nextCompanies[0]?.id || '';
        setCompanies(nextCompanies);
        setSelectedCompanyId(nextSelectedId);
        setProfile(nextCompanies.find((company: CompanyProfile) => company.id === nextSelectedId) || defaultProfile);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [request]);

  const update = useCallback(
    (patch: Partial<CompanyProfile>) => setProfile((current) => ({ ...current, ...patch })),
    []
  );

  // Toggle a value within a comma-separated field.
  const toggleInField = useCallback(
    (field: keyof CompanyProfile, value: string, max?: number) => {
      setProfile((current) => {
        const items = listToArray(String(current[field] || ''));
        const exists = items.includes(value);
        if (!exists && max && items.length >= max) {
          return current;
        }
        const next = exists ? items.filter((item) => item !== value) : [...items, value];
        return { ...current, [field]: arrayToList(next) };
      });
    },
    []
  );

  const saveProfile = useCallback(
    async (options: { silent?: boolean } = {}) => {
      setSaving(true);
      setError('');
      if (!options.silent) {
        setSuccess('');
      }

      try {
        const response = await request('/settings/company-profiles', {
          method: 'POST',
          body: JSON.stringify({
            ...profile,
            id: profile.id || selectedCompanyId || undefined,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data?.message || data?.error || 'Não foi possível salvar o perfil.');
          return false;
        }

        const nextProfile = data as CompanyProfile;
        setProfile((current) => ({ ...current, ...nextProfile }));
        setSelectedCompanyId(nextProfile.id || '');
        setCompanies((current) => {
          const exists = current.some((company) => company.id === nextProfile.id);
          return exists
            ? current.map((company) => (company.id === nextProfile.id ? nextProfile : company))
            : [...current, nextProfile];
        });
        if (!options.silent) {
          setSuccess('Perfil da empresa salvo com sucesso.');
        }
        return true;
      } catch (err) {
        setError('Não foi possível conectar ao servidor.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [profile, request, selectedCompanyId]
  );

  const generateSummary = async () => {
    if (!profile.website.trim()) {
      setError('Informe o site da empresa para analisarmos automaticamente.');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await request('/settings/company-profiles/generate-summary', {
        method: 'POST',
        body: JSON.stringify({
          ...profile,
          id: profile.id || selectedCompanyId || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.message || data?.error || 'Não foi possível gerar resumo.');
        return;
      }

      const nextProfile = data?.profile as CompanyProfile;
      setProfile((current) => ({
        ...current,
        ...(nextProfile || {}),
      }));
      if (nextProfile?.id) {
        setSelectedCompanyId(nextProfile.id);
      }
      if (Array.isArray(data?.companies)) {
        setCompanies(data.companies);
      }
      setContentPillars(Array.isArray(data?.contentPillars) ? data.contentPillars : []);
      setPostIdeas(Array.isArray(data?.postIdeas) ? data.postIdeas : []);
      setSuccess('Analisamos seu site. Veja o resumo e os pilares gerados abaixo.');
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setGenerating(false);
    }
  };

  const uploadVisualAssets = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith('image/')
    );
    event.target.value = '';
    if (!files.length) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const compressed = await Promise.all(files.slice(0, 8).map(async (file) => ({
        id: makeDraftAssetId(),
        name: file.name,
        type: 'image/jpeg',
        dataUrl: await compressImageFile(file),
        description: '',
      })));

      setProfile((current) => ({
        ...current,
        visualIdentityAssets: [
          ...(current.visualIdentityAssets || []),
          ...compressed,
        ].slice(0, 8),
      }));
      setSuccess('Referências visuais adicionadas. Agora analise a identidade visual.');
    } catch (err) {
      setError('Não foi possível processar uma das imagens enviadas.');
    }
  };

  const removeVisualAsset = (id: string) => {
    setProfile((current) => ({
      ...current,
      visualIdentityAssets: (current.visualIdentityAssets || []).filter(
        (asset) => asset.id !== id
      ),
    }));
  };

  const updateVisualAssetDescription = (id: string, description: string) => {
    setProfile((current) => ({
      ...current,
      visualIdentityAssets: (current.visualIdentityAssets || []).map((asset) =>
        asset.id === id ? { ...asset, description } : asset
      ),
    }));
  };

  const saveCurrentFontPreset = () => {
    if (!profile.brandFonts.trim()) {
      setError('Escolha um estilo de letra antes de salvar um preset.');
      return;
    }

    setProfile((current) => ({
      ...current,
      brandFontPresets: [
        ...(current.brandFontPresets || []),
        {
          id: makeBrandKitId('font'),
          name: `Fonte ${(current.brandFontPresets || []).length + 1}`,
          headline: current.brandFonts,
          body: current.brandFonts,
          usage: 'Preset principal para textos dentro das imagens.',
        },
      ].slice(0, 12),
    }));
    setSuccess('Preset de fonte salvo no Brand Kit.');
  };

  const promoteAssetToLogo = (asset: VisualIdentityAsset) => {
    setProfile((current) => {
      const exists = (current.brandLogos || []).some((logo) => logo.id === asset.id);
      if (exists) {
        return current;
      }

      return {
        ...current,
        brandLogos: [
          ...(current.brandLogos || []),
          {
            id: asset.id,
            name: asset.name || 'Logo da marca',
            dataUrl: asset.dataUrl,
            usage: 'Usar como assinatura discreta nos posts.',
            description: asset.description || '',
          },
        ].slice(0, 8),
      };
    });
    setSuccess('Logo adicionado ao Brand Kit.');
  };

  const removeBrandKitItem = (
    collection: 'brandPalettes' | 'brandFontPresets' | 'brandLogos' | 'styleRules',
    id: string
  ) => {
    setProfile((current) => ({
      ...current,
      [collection]: ((current[collection] as Array<{ id: string }>) || []).filter(
        (item) => item.id !== id
      ),
    }));
  };

  const addStyleRule = (type: 'do' | 'dont', text: string) => {
    setProfile((current) => {
      if ((current.styleRules || []).some((rule) => rule.type === type && rule.text === text)) {
        return current;
      }
      return {
        ...current,
        styleRules: [
          ...(current.styleRules || []),
          { id: makeBrandKitId('rule'), type, text },
        ].slice(0, 40),
      };
    });
  };

  const updateStyleRule = (id: string, text: string) => {
    setProfile((current) => ({
      ...current,
      styleRules: (current.styleRules || []).map((rule) =>
        rule.id === id ? { ...rule, text } : rule
      ),
    }));
  };

  const removeStyleRuleByContent = (type: 'do' | 'dont', text: string) => {
    setProfile((current) => ({
      ...current,
      styleRules: (current.styleRules || []).filter(
        (rule) => !(rule.type === type && rule.text === text)
      ),
    }));
  };

  const generateVisualIdentity = async () => {
    if (!(profile.visualIdentityAssets || []).length) {
      setError('Envie pelo menos uma imagem, logo ou post de referência visual.');
      return;
    }

    setDescribingVisualIdentity(true);
    setError('');
    setSuccess('');

    try {
      const response = await request('/settings/company-profiles/generate-visual-identity', {
        method: 'POST',
        body: JSON.stringify({
          ...profile,
          id: profile.id || selectedCompanyId || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.message || data?.error || 'Não foi possível descrever a identidade visual.');
        return;
      }

      const nextProfile = data?.profile as CompanyProfile;
      if (nextProfile) {
        setProfile((current) => ({ ...current, ...nextProfile }));
      }
      if (nextProfile?.id) {
        setSelectedCompanyId(nextProfile.id);
      }
      if (Array.isArray(data?.companies)) {
        setCompanies(data.companies);
      }
      setSuccess(`Identidade visual analisada${data?.model ? ` (${data.model})` : ''}. Revise e ajuste se quiser.`);
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setDescribingVisualIdentity(false);
    }
  };

  const createNewCompany = () => {
    const draftId = `draft-${Date.now()}`;
    const draft = { ...defaultProfile, id: draftId, companyName: 'Nova empresa' };
    setCompanies((current) => [...current, draft]);
    setSelectedCompanyId(draftId);
    setProfile(draft);
    setContentPillars([]);
    setPostIdeas([]);
    setStep(0);
    setError('');
    setSuccess('');
  };

  const selectCompany = (id: string) => {
    setSelectedCompanyId(id);
    setProfile(companies.find((company) => company.id === id) || defaultProfile);
    setContentPillars([]);
    setPostIdeas([]);
    setStep(0);
    setError('');
    setSuccess('');
  };

  const deleteCompany = async () => {
    const targetId = profile.id || selectedCompanyId;
    if (!targetId) {
      return;
    }

    const targetName = profile.companyName || 'esta empresa';
    if (!window.confirm(`Excluir ${targetName}? Essa ação remove o cadastro da empresa.`)) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    if (targetId.startsWith('draft-')) {
      const nextCompanies = companies.filter((company) => company.id !== targetId);
      const nextSelected = nextCompanies[0]?.id || '';
      setCompanies(nextCompanies);
      setSelectedCompanyId(nextSelected);
      setProfile(nextCompanies.find((company) => company.id === nextSelected) || defaultProfile);
      setSaving(false);
      return;
    }

    try {
      const response = await request(`/settings/company-profiles/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.message || data?.error || 'Não foi possível excluir a empresa.');
        return;
      }

      const nextCompanies = Array.isArray(data?.companies) ? data.companies : [];
      const nextSelected = data?.selectedCompanyId || nextCompanies[0]?.id || '';
      setCompanies(nextCompanies);
      setSelectedCompanyId(nextSelected);
      setProfile(nextCompanies.find((company: CompanyProfile) => company.id === nextSelected) || defaultProfile);
      setContentPillars([]);
      setPostIdeas([]);
      setStep(0);
      setSuccess('Empresa excluída com sucesso.');
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    setError('');
    await saveProfile({ silent: true });
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep((current) => Math.max(current - 1, 0));
  };

  const finish = async () => {
    const ok = await saveProfile();
    if (ok) {
      router.push('/ai-generate-images');
    }
  };

  const selectedTones = useMemo(() => listToArray(profile.toneOfVoice), [profile.toneOfVoice]);
  const industryIsCustom = Boolean(
    profile.industry && !industryOptions.includes(profile.industry)
  );

  // Build the props object for step components
  const stepProps: StepProps = {
    profile,
    update,
    toggleInField,
    generating,
    generateSummary,
    industryIsCustom,
    selectedTones,
    uploadVisualAssets,
    removeVisualAsset,
    updateVisualAssetDescription,
    promoteAssetToLogo,
    removeBrandKitItem,
    generateVisualIdentity,
    describingVisualIdentity,
    saveCurrentFontPreset,
    addStyleRule,
    updateStyleRule,
    removeStyleRuleByContent,
    contentPillars,
    postIdeas,
    deleteCompany,
    selectedCompanyId,
    saving,
  };

  if (loading) {
    return (
      <div className="relative min-h-[600px] w-full">
        <div className="mx-auto mt-[40px] flex h-[400px] w-full max-w-[920px] items-center justify-center rounded-[18px] border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#101010]">
          <div className="flex flex-col items-center gap-[16px]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/20 dark:border-white/20 border-t-black/80 dark:border-t-white/80"></div>
            <p className="text-[15px] text-black/60 dark:text-white/60 animate-pulse">Carregando ambiente de configuração...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-100px)] w-full">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_0%,rgba(120,113,108,0.12),transparent_28%),linear-gradient(180deg,rgba(245,245,244,0.08),transparent_40%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(120,113,108,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[920px] flex-col gap-[20px] pb-[60px] pt-[20px]">
        {/* Header + company switcher */}
        <div className="flex flex-col gap-[16px] rounded-[18px] border border-black/10 bg-[#f7f2ea] p-[24px] shadow-sm dark:border-white/10 dark:bg-[#141312]">
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            <div className="inline-flex w-fit items-center gap-[8px] rounded-full border border-black/10 bg-white/70 px-[12px] py-[6px] dark:border-white/10 dark:bg-white/5">
              <Building2 className="h-[14px] w-[14px] text-stone-700 dark:text-stone-200" />
              <span className="text-[12px] font-[800] uppercase tracking-[0.14em] text-stone-700 dark:text-stone-200">Configuração da marca</span>
            </div>

            {companies.length > 0 && (
              <div className="flex items-center gap-[8px]">
                <select
                  value={selectedCompanyId}
                  onChange={(event) => selectCompany(event.target.value)}
                  className="h-[40px] rounded-[10px] border border-black/10 bg-white/80 px-[12px] text-[13px] font-[600] text-black outline-none dark:border-white/10 dark:bg-white/5 dark:text-white [color-scheme:dark]"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id} className="bg-white text-black dark:bg-[#1f2230] dark:text-white">
                      {company.companyName || 'Empresa sem nome'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={createNewCompany}
                  className="flex h-[40px] items-center gap-[6px] rounded-[10px] border border-black/10 bg-white/80 px-[12px] text-[13px] font-[700] text-black/80 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                >
                  <Plus className="h-[14px] w-[14px]" />
                  Nova
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[8px]">
            <h2 className="text-[30px] font-[800] leading-tight tracking-tight text-black dark:text-white">
              Vamos configurar a sua marca
            </h2>
            <p className="max-w-[640px] text-[15px] leading-relaxed text-black/60 dark:text-white/60">
              Em poucos passos, e quase sem digitar: comece pelo seu site e depois é só escolher as opções.
            </p>
          </div>

          {/* Stepper */}
          <div className="mt-[4px] flex items-center gap-[6px]">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === step;
              const isDone = index < step;
              return (
                <div key={item.id} className="flex flex-1 items-center gap-[6px]">
                  <button
                    type="button"
                    onClick={() => index <= step && setStep(index)}
                    disabled={index > step}
                    className={`flex items-center gap-[8px] rounded-full px-[12px] py-[8px] text-[12px] font-[800] transition ${
                      isActive
                        ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                        : isDone
                        ? 'bg-stone-900/10 text-stone-800 dark:bg-white/10 dark:text-white/80'
                        : 'text-black/40 dark:text-white/40'
                    } ${index > step ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isDone ? <CheckCircle2 className="h-[15px] w-[15px]" /> : <Icon className="h-[15px] w-[15px]" />}
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`h-[2px] flex-1 rounded-full ${isDone ? 'bg-stone-900/40 dark:bg-white/40' : 'bg-black/10 dark:bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-[18px] border border-black/10 bg-white p-[28px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
          {step === 0 && <IdentityStep {...stepProps} />}
          {step === 1 && <PositioningStep {...stepProps} />}
          {step === 2 && <VisualStep {...stepProps} />}
          {step === 3 && <VoiceRulesStep {...stepProps} />}
          {step === 4 && <ReviewStep {...stepProps} />}

          {/* Messages */}
          {error && (
            <div className="mt-[20px] flex items-center gap-[12px] rounded-[14px] border border-red-500/30 bg-red-500/10 p-[14px]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-red-400">!</div>
              <p className="text-[13px] font-medium text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-[20px] flex flex-col gap-[12px]">
              <div className="flex items-center gap-[12px] rounded-[14px] border border-green-500/30 bg-green-500/10 p-[14px]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-[13px] font-medium text-green-300">{success}</p>
              </div>

              {step === 0 && profile.summary && (
                <div className="flex flex-col gap-[10px] rounded-[14px] border border-black/10 bg-black/5 p-[16px] dark:border-white/10 dark:bg-white/5">
                  <span className="text-[12px] font-[900] uppercase tracking-[0.12em] text-black/50 dark:text-white/50">Resumo gerado</span>
                  <p className="text-[13px] leading-relaxed text-black/80 dark:text-white/80">{profile.summary}</p>
                </div>
              )}

              {step === 0 && contentPillars.length > 0 && (
                <div className="flex flex-col gap-[10px] rounded-[14px] border border-black/10 bg-black/5 p-[16px] dark:border-white/10 dark:bg-white/5">
                  <span className="text-[12px] font-[900] uppercase tracking-[0.12em] text-black/50 dark:text-white/50">Pilares de conteúdo sugeridos</span>
                  <div className="flex flex-wrap gap-[8px]">
                    {contentPillars.map((pillar, index) => (
                      <span key={`${pillar}-${index}`} className="rounded-full border border-stone-500/20 bg-stone-500/10 px-[12px] py-[6px] text-[12px] font-medium text-stone-700 dark:text-stone-200">
                        {pillar}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-[28px] flex items-center justify-between gap-[12px] border-t border-black/5 pt-[20px] dark:border-white/5">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="flex items-center gap-[8px] rounded-[12px] px-[16px] py-[11px] text-[14px] font-[700] text-black/60 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-30 dark:text-white/60 dark:hover:text-white"
            >
              <ArrowLeft className="h-[16px] w-[16px]" />
              Voltar
            </button>

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} loading={saving}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4 inline-block" />
              </Button>
            ) : (
              <Button type="button" onClick={finish} loading={saving}>
                Concluir e ir ao Estúdio
                <ArrowRight className="ml-2 h-4 w-4 inline-block" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
