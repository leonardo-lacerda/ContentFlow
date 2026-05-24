'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import { Building2, Globe, Target, Lightbulb, Users, MessageSquare, ArrowRight, CheckCircle2, Trash2, UploadCloud, Image as ImageIcon, X, Palette, FileText } from 'lucide-react';
import { useVariables } from '@gitroom/react/helpers/variable.context';

type VisualIdentityAsset = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  description: string;
};

type BrandPalette = {
  id: string;
  name: string;
  colors: string[];
  usage: string;
};

type BrandFontPreset = {
  id: string;
  name: string;
  headline: string;
  body: string;
  usage: string;
};

type BrandLogoAsset = {
  id: string;
  name: string;
  dataUrl: string;
  usage: string;
  description: string;
};

type StyleRule = {
  id: string;
  type: 'do' | 'dont';
  text: string;
};

type CompanyInspiration = {
  id: string;
  name: string;
  src: string;
  source: string;
  category: string;
  favorite: boolean;
  approved: boolean;
  description: string;
};

type CompanyProfile = {
  id?: string;
  companyName: string;
  website: string;
  industry: string;
  targetAudience: string;
  productsOrServices: string;
  differentials: string;
  toneOfVoice: string;
  summary: string;
  visualIdentitySummary: string;
  brandColors: string;
  brandFonts: string;
  defaultCta: string;
  forbiddenTerms: string;
  contentPreferences: string;
  visualIdentityAssets: VisualIdentityAsset[];
  brandPalettes: BrandPalette[];
  brandFontPresets: BrandFontPreset[];
  brandLogos: BrandLogoAsset[];
  styleRules: StyleRule[];
  inspirationLibrary: CompanyInspiration[];
  updatedAt: string;
  hasProfile?: boolean;
};

const inputClass =
  'h-[48px] w-full rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] px-[42px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20';
const textAreaClass =
  'w-full resize-y rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-[16px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20';

const defaultProfile: CompanyProfile = {
  companyName: '',
  website: '',
  industry: '',
  targetAudience: '',
  productsOrServices: '',
  differentials: '',
  toneOfVoice: '',
  summary: '',
  visualIdentitySummary: '',
  brandColors: '',
  brandFonts: '',
  defaultCta: '',
  forbiddenTerms: '',
  contentPreferences: '',
  visualIdentityAssets: [],
  brandPalettes: [],
  brandFontPresets: [],
  brandLogos: [],
  styleRules: [],
  inspirationLibrary: [],
  updatedAt: '',
};

const makeDraftAssetId = () =>
  `brand_asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const makeBrandKitId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const parseColorList = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((color) => color.trim())
    .filter(Boolean)
    .slice(0, 12);

const defaultBrandColors = ['#111827', '#FFFFFF', '#2563EB', '#F59E0B'];

const colorPresets = [
  { name: 'Moderna', colors: ['#111827', '#F8FAFC', '#2563EB', '#22C55E'] },
  { name: 'Premium', colors: ['#111111', '#F5EFE6', '#C8A45D', '#6B4E2E'] },
  { name: 'Criativa', colors: ['#151515', '#FFF7ED', '#F97316', '#EC4899'] },
  { name: 'Minimalista', colors: ['#0F172A', '#FFFFFF', '#CBD5E1', '#64748B'] },
];

const fontStylePresets = [
  'Editorial e sofisticada nos títulos, simples e legível no apoio',
  'Moderna, limpa e direta, com títulos fortes',
  'Amigável e humana, com aparência leve e acessível',
  'Premium e minimalista, com bastante espaço em branco',
];

const compressImageFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Formato de imagem inválido.'));
      image.onload = () => {
        const maxSize = 1200;
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });

export const CompanyOnboardingComponent = () => {
  const { backendUrl } = useVariables();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [profile, setProfile] = useState<CompanyProfile>(defaultProfile);
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

  const saveProfile = async () => {
    if (!profile.summary.trim()) {
      setError('O resumo da empresa é obrigatório. Gere pelo site ou preencha manualmente antes de salvar.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

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
        return;
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
      setSuccess('Perfil da empresa salvo com sucesso.');
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  };

  const generateSummary = async () => {
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
      setSuccess('Resumo e ideias gerados com sucesso.');
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
      setSuccess('Referências visuais adicionadas. Agora gere a descrição da identidade visual.');
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

  const setBrandColorsFromArray = (colors: string[]) => {
    setProfile((current) => ({
      ...current,
      brandColors: colors.filter(Boolean).slice(0, 12).join(', '),
    }));
  };

  const updateBrandColor = (index: number, color: string) => {
    const colors = [...parseColorList(profile.brandColors)];
    while (colors.length <= index) {
      colors.push(defaultBrandColors[colors.length] || '#FFFFFF');
    }
    colors[index] = color;
    setBrandColorsFromArray(colors);
  };

  const saveCurrentPalette = () => {
    const colors = parseColorList(profile.brandColors).length
      ? parseColorList(profile.brandColors)
      : defaultBrandColors;
    if (!colors.length) {
      setError('Adicione cores da marca antes de salvar uma paleta.');
      return;
    }

    setProfile((current) => ({
      ...current,
      brandPalettes: [
        ...(current.brandPalettes || []),
        {
          id: makeBrandKitId('palette'),
          name: `Paleta ${(current.brandPalettes || []).length + 1}`,
          colors,
          usage: 'Usar como paleta principal dos carrosséis.',
        },
      ].slice(0, 12),
    }));
    setSuccess('Paleta salva no Brand Kit.');
  };

  const saveCurrentFontPreset = () => {
    if (!profile.brandFonts.trim()) {
      setError('Preencha a tipografia da marca antes de salvar um preset.');
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

  const addStyleRule = (type: 'do' | 'dont') => {
    setProfile((current) => ({
      ...current,
      styleRules: [
        ...(current.styleRules || []),
        {
          id: makeBrandKitId('rule'),
          type,
          text: type === 'do' ? 'Usar composições limpas e texto legível.' : 'Evitar visual genérico e excesso de elementos.',
        },
      ].slice(0, 40),
    }));
  };

  const updateStyleRule = (id: string, text: string) => {
    setProfile((current) => ({
      ...current,
      styleRules: (current.styleRules || []).map((rule) =>
        rule.id === id ? { ...rule, text } : rule
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
      setSuccess(`Identidade visual analisada${data?.model ? ` (${data.model})` : ''}. Revise e salve se quiser ajustar.`);
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
    setError('');
    setSuccess('');
  };

  const selectCompany = (id: string) => {
    setSelectedCompanyId(id);
    setProfile(companies.find((company) => company.id === id) || defaultProfile);
    setContentPillars([]);
    setPostIdeas([]);
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
      setSuccess('Empresa excluída com sucesso.');
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-[600px] w-full">
        <div className="mx-auto mt-[40px] flex h-[400px] w-full max-w-[1080px] items-center justify-center rounded-[18px] border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#101010]">
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

      <div className="relative z-10 mx-auto flex w-full max-w-[1080px] flex-col gap-[24px] pb-[60px] pt-[20px]">
      
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[18px] border border-black/10 bg-[#f7f2ea] p-[32px] shadow-sm dark:border-white/10 dark:bg-[#141312]">
        <div className="relative z-10 flex flex-col gap-[12px]">
          <div className="inline-flex w-fit items-center gap-[8px] rounded-full border border-black/10 bg-white/70 px-[12px] py-[6px] dark:border-white/10 dark:bg-white/5">
            <Building2 className="h-[14px] w-[14px] text-stone-700 dark:text-stone-200" />
            <span className="text-[12px] font-[800] uppercase tracking-[0.14em] text-stone-700 dark:text-stone-200">Configuração da marca</span>
          </div>
          <h2 className="text-[36px] font-[800] tracking-tight text-black dark:text-white leading-tight">
            Identidade da Empresa
          </h2>
          <p className="text-[16px] text-black/60 dark:text-white/60 max-w-[600px] leading-relaxed">
            Cadastre o contexto que mantém os carrosséis consistentes: voz, oferta, visual, referências e limites da marca.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[24px] lg:grid-cols-12">
        {/* Form Section */}
        <div className="lg:col-span-8 flex flex-col gap-[24px]">
          <div className="rounded-[18px] border border-black/10 bg-white p-[32px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
            <div className="mb-[24px] grid grid-cols-1 gap-[12px] md:grid-cols-[1fr_auto_auto]">
              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[600] text-black/90 dark:text-white/90">Empresa cadastrada</span>
                <select
                  value={selectedCompanyId}
                  onChange={(event) => selectCompany(event.target.value)}
                  className="h-[48px] rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#1f2230] px-[14px] text-[15px] text-black dark:text-white outline-none [color-scheme:dark]"
                >
                  <option className="bg-white text-black dark:bg-[#1f2230] dark:text-white" value="">Selecione uma empresa</option>
                  {companies.map((company) => (
                    <option className="bg-white text-black dark:bg-[#1f2230] dark:text-white" key={company.id} value={company.id}>
                      {company.companyName || 'Empresa sem nome'}
                      {company.summary ? ' - resumo ok' : ' - sem resumo'}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <Button type="button" onClick={createNewCompany}>
                  Nova empresa
                </Button>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={deleteCompany}
                  disabled={!selectedCompanyId || saving}
                  className="flex h-[48px] items-center gap-[8px] rounded-[12px] border border-red-500/30 bg-red-500/10 px-[16px] text-[14px] font-[700] text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-[16px] w-[16px]" />
                  Excluir
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2">
              <label className="group flex flex-col gap-[10px]">
                <span className="text-[14px] font-[600] text-black/90 dark:text-white/90 ml-[4px] transition-colors group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100">Nome da Empresa</span>
                <div className="relative">
                  <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100 transition-colors">
                    <Building2 className="h-[18px] w-[18px]" />
                  </div>
                  <input
                    value={profile.companyName}
                    onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))}
                    className={inputClass}
                    placeholder="Ex: TechFlow Inc."
                    maxLength={120}
                  />
                </div>
              </label>

              <label className="group flex flex-col gap-[10px]">
                <span className="text-[14px] font-[600] text-black/90 dark:text-white/90 ml-[4px] transition-colors group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100">Website Oficial</span>
                <div className="relative">
                  <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100 transition-colors">
                    <Globe className="h-[18px] w-[18px]" />
                  </div>
                  <input
                    value={profile.website}
                    onChange={(event) => setProfile((current) => ({ ...current, website: event.target.value }))}
                    placeholder="https://seusite.com"
                    className={inputClass}
                    maxLength={300}
                  />
                </div>
              </label>

              <label className="group flex flex-col gap-[10px]">
                <span className="text-[14px] font-[600] text-black/90 dark:text-white/90 ml-[4px] transition-colors group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100">Setor / Nicho</span>
                <div className="relative">
                  <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100 transition-colors">
                    <Target className="h-[18px] w-[18px]" />
                  </div>
                  <input
                    value={profile.industry}
                    onChange={(event) => setProfile((current) => ({ ...current, industry: event.target.value }))}
                    placeholder="Ex: SaaS B2B, E-commerce, Educação..."
                    className={inputClass}
                    maxLength={160}
                  />
                </div>
              </label>

              <label className="group flex flex-col gap-[10px]">
                <span className="text-[14px] font-[600] text-black/90 dark:text-white/90 ml-[4px] transition-colors group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100">Público-alvo</span>
                <div className="relative">
                  <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100 transition-colors">
                    <Users className="h-[18px] w-[18px]" />
                  </div>
                  <input
                    value={profile.targetAudience}
                    onChange={(event) => setProfile((current) => ({ ...current, targetAudience: event.target.value }))}
                    placeholder="Ex: Empreendedores, Desenvolvedores..."
                    className={inputClass}
                    maxLength={240}
                  />
                </div>
              </label>

              <label className="group flex flex-col gap-[10px] md:col-span-2">
                <span className="text-[14px] font-[600] text-black/90 dark:text-white/90 ml-[4px] transition-colors group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100">Tom de Voz da Marca</span>
                <div className="relative">
                  <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100 transition-colors">
                    <MessageSquare className="h-[18px] w-[18px]" />
                  </div>
                  <input
                    value={profile.toneOfVoice}
                    onChange={(event) => setProfile((current) => ({ ...current, toneOfVoice: event.target.value }))}
                    placeholder="Ex: Profissional, Descontraído, Inspirador, Técnico..."
                    className={inputClass}
                    maxLength={180}
                  />
                </div>
              </label>

              <label className="group flex flex-col gap-[10px] md:col-span-2">
                <span className="text-[14px] font-[600] text-black/90 dark:text-white/90 ml-[4px] transition-colors group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100">Produtos ou Serviços</span>
                <textarea
                  value={profile.productsOrServices}
                  onChange={(event) => setProfile((current) => ({ ...current, productsOrServices: event.target.value }))}
                  placeholder="Descreva brevemente o que sua empresa oferece."
                  className={`${textAreaClass} min-h-[110px]`}
                  maxLength={500}
                />
              </label>

              <label className="group flex flex-col gap-[10px] md:col-span-2">
                <span className="text-[14px] font-[600] text-black/90 dark:text-white/90 ml-[4px] transition-colors group-focus-within:text-stone-900 dark:group-focus-within:text-stone-100">Diferenciais Competitivos</span>
                <textarea
                  value={profile.differentials}
                  onChange={(event) => setProfile((current) => ({ ...current, differentials: event.target.value }))}
                  placeholder="O que torna sua empresa única no mercado?"
                  className={`${textAreaClass} min-h-[110px]`}
                  maxLength={500}
                />
              </label>

              <div className="md:col-span-2 rounded-[20px] border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 p-[20px]">
                <div className="mb-[16px] flex items-center gap-[8px]">
                  <Palette className="h-[18px] w-[18px] text-stone-600 dark:text-stone-200" />
                  <div>
                    <h3 className="text-[18px] font-[800] text-black dark:text-white">Brand Kit e preferências</h3>
                    <p className="text-[13px] text-black/60 dark:text-white/60">
                      Usaremos isso para manter os posts com a cara da marca.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2">
                  <div className="flex flex-col gap-[10px]">
                    <div>
                      <span className="text-[14px] font-[700] text-black/90 dark:text-white/90">Cores da marca</span>
                      <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">
                        Escolha olhando, sem precisar saber código de cor.
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-[10px]">
                      {Array.from({ length: 4 }).map((_, index) => {
                        const colors = parseColorList(profile.brandColors);
                        const color = colors[index] || defaultBrandColors[index];
                        return (
                          <label
                            key={`brand-color-${index}`}
                            className="group flex cursor-pointer flex-col gap-[6px] rounded-[14px] border border-black/10 bg-black/5 p-[8px] transition hover:border-stone-500/50 dark:border-white/10 dark:bg-white/5"
                          >
                            <span
                              className="h-[44px] rounded-[10px] border border-black/10 shadow-sm dark:border-white/10"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-center text-[11px] font-[800] text-black/55 dark:text-white/55">
                              Cor {index + 1}
                            </span>
                            <input
                              type="color"
                              value={color}
                              onChange={(event) => updateBrandColor(index, event.target.value)}
                              className="sr-only"
                              aria-label={`Escolher cor ${index + 1} da marca`}
                            />
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-[8px]">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setBrandColorsFromArray(preset.colors)}
                          className="flex items-center gap-[6px] rounded-full border border-black/10 bg-white/70 px-[10px] py-[7px] text-[12px] font-[800] text-black/70 transition hover:border-stone-500/50 hover:text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:text-stone-100"
                        >
                          <span className="flex -space-x-[4px]">
                            {preset.colors.slice(0, 3).map((color) => (
                              <span
                                key={`${preset.name}-${color}`}
                                className="h-[13px] w-[13px] rounded-full border border-white/70"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </span>
                          {preset.name}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={saveCurrentPalette}
                      className="w-fit rounded-[10px] border border-stone-500/20 bg-stone-500/10 px-[12px] py-[8px] text-[12px] font-[800] text-stone-800 transition hover:bg-stone-500/15 dark:text-stone-200"
                    >
                      Salvar esta paleta
                    </button>
                  </div>

                  <div className="flex flex-col gap-[10px]">
                    <div>
                      <span className="text-[14px] font-[700] text-black/90 dark:text-white/90">Estilo das letras</span>
                      <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">
                        Descreva como os textos dentro das imagens devem parecer.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-[8px]">
                      {fontStylePresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setProfile((current) => ({ ...current, brandFonts: preset }))}
                          className={`rounded-[12px] border px-[12px] py-[9px] text-left text-[12px] font-[750] transition ${
                            profile.brandFonts === preset
                              ? 'border-stone-500/40 bg-stone-500/10 text-stone-900 dark:text-stone-100'
                              : 'border-black/10 bg-black/5 text-black/65 hover:border-stone-500/40 dark:border-white/10 dark:bg-white/5 dark:text-white/65'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={profile.brandFonts}
                      onChange={(event) => setProfile((current) => ({ ...current, brandFonts: event.target.value }))}
                      placeholder="Ex: títulos grandes e elegantes, texto curto, bastante respiro e aparência premium."
                      className={`${textAreaClass} min-h-[86px]`}
                      maxLength={240}
                    />

                    <button
                      type="button"
                      onClick={saveCurrentFontPreset}
                      className="w-fit rounded-[10px] border border-stone-500/20 bg-stone-500/10 px-[12px] py-[8px] text-[12px] font-[800] text-stone-800 transition hover:bg-stone-500/15 dark:text-stone-200"
                    >
                      Salvar estilo de letras
                    </button>
                  </div>

                  <label className="flex flex-col gap-[8px]">
                    <span className="text-[14px] font-[700] text-black/90 dark:text-white/90">CTA padrão</span>
                    <input
                      value={profile.defaultCta}
                      onChange={(event) => setProfile((current) => ({ ...current, defaultCta: event.target.value }))}
                      placeholder="Ex: Salve para rever depois"
                      className={inputClass}
                      maxLength={240}
                    />
                  </label>

                  <label className="flex flex-col gap-[8px]">
                    <span className="text-[14px] font-[700] text-black/90 dark:text-white/90">Termos proibidos</span>
                    <input
                      value={profile.forbiddenTerms}
                      onChange={(event) => setProfile((current) => ({ ...current, forbiddenTerms: event.target.value }))}
                      placeholder="Ex: garantido, milagre, sem esforço"
                      className={inputClass}
                      maxLength={500}
                    />
                  </label>

                  <label className="flex flex-col gap-[8px] md:col-span-2">
                    <span className="text-[14px] font-[700] text-black/90 dark:text-white/90">Preferências de conteúdo</span>
                    <textarea
                      value={profile.contentPreferences}
                      onChange={(event) => setProfile((current) => ({ ...current, contentPreferences: event.target.value }))}
                      placeholder="Ex: preferir posts educacionais, usar exemplos práticos, evitar tom sensacionalista..."
                      className={`${textAreaClass} min-h-[100px]`}
                      maxLength={1000}
                    />
	                  </label>

	                  <div className="md:col-span-2 grid grid-cols-1 gap-[14px] md:grid-cols-2">
	                    <div className="rounded-[16px] border border-black/10 bg-white/70 p-[14px] dark:border-white/10 dark:bg-black/20">
	                      <div className="mb-[10px] text-[13px] font-[900] text-black dark:text-white">
	                        Paletas salvas
	                      </div>
	                      {(profile.brandPalettes || []).length ? (
	                        <div className="flex flex-col gap-[10px]">
	                          {(profile.brandPalettes || []).map((palette) => (
	                            <div key={palette.id} className="rounded-[12px] border border-black/10 p-[10px] dark:border-white/10">
	                              <div className="mb-[8px] flex items-center justify-between gap-[8px]">
	                                <input
	                                  value={palette.name}
	                                  onChange={(event) =>
	                                    setProfile((current) => ({
	                                      ...current,
	                                      brandPalettes: (current.brandPalettes || []).map((item) =>
	                                        item.id === palette.id ? { ...item, name: event.target.value } : item
	                                      ),
	                                    }))
	                                  }
	                                  className="w-full bg-transparent text-[12px] font-[800] text-black outline-none dark:text-white"
	                                />
	                                <button type="button" onClick={() => removeBrandKitItem('brandPalettes', palette.id)} className="text-[11px] font-[800] text-red-400">
	                                  remover
	                                </button>
	                              </div>
	                              <div className="mb-[8px] flex flex-wrap gap-[6px]">
	                                {palette.colors.map((color) => (
	                                  <span key={`${palette.id}-${color}`} className="h-[22px] w-[34px] rounded-[8px] border border-black/10 dark:border-white/20" style={{ background: color }} title={color} />
	                                ))}
	                              </div>
	                              <input
	                                value={palette.usage}
	                                onChange={(event) =>
	                                  setProfile((current) => ({
	                                    ...current,
	                                    brandPalettes: (current.brandPalettes || []).map((item) =>
	                                      item.id === palette.id ? { ...item, usage: event.target.value } : item
	                                    ),
	                                  }))
	                                }
	                                placeholder="Uso da paleta"
	                                className="w-full rounded-[10px] border border-black/10 bg-black/5 px-[10px] py-[8px] text-[12px] text-black outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
	                              />
	                            </div>
	                          ))}
	                        </div>
	                      ) : (
	                        <p className="text-[12px] text-black/50 dark:text-white/50">Nenhuma paleta salva ainda.</p>
	                      )}
	                    </div>

	                    <div className="rounded-[16px] border border-black/10 bg-white/70 p-[14px] dark:border-white/10 dark:bg-black/20">
	                      <div className="mb-[10px] text-[13px] font-[900] text-black dark:text-white">
	                        Fontes oficiais
	                      </div>
	                      {(profile.brandFontPresets || []).length ? (
	                        <div className="flex flex-col gap-[10px]">
	                          {(profile.brandFontPresets || []).map((font) => (
	                            <div key={font.id} className="rounded-[12px] border border-black/10 p-[10px] dark:border-white/10">
	                              <div className="mb-[8px] flex items-center justify-between gap-[8px]">
	                                <input
	                                  value={font.name}
	                                  onChange={(event) =>
	                                    setProfile((current) => ({
	                                      ...current,
	                                      brandFontPresets: (current.brandFontPresets || []).map((item) =>
	                                        item.id === font.id ? { ...item, name: event.target.value } : item
	                                      ),
	                                    }))
	                                  }
	                                  className="w-full bg-transparent text-[12px] font-[800] text-black outline-none dark:text-white"
	                                />
	                                <button type="button" onClick={() => removeBrandKitItem('brandFontPresets', font.id)} className="text-[11px] font-[800] text-red-400">
	                                  remover
	                                </button>
	                              </div>
	                              <input
	                                value={font.headline}
	                                onChange={(event) =>
	                                  setProfile((current) => ({
	                                    ...current,
	                                    brandFontPresets: (current.brandFontPresets || []).map((item) =>
	                                      item.id === font.id ? { ...item, headline: event.target.value } : item
	                                    ),
	                                  }))
	                                }
	                                placeholder="Fonte de headline"
	                                className="mb-[6px] w-full rounded-[10px] border border-black/10 bg-black/5 px-[10px] py-[8px] text-[12px] text-black outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
	                              />
	                              <input
	                                value={font.body}
	                                onChange={(event) =>
	                                  setProfile((current) => ({
	                                    ...current,
	                                    brandFontPresets: (current.brandFontPresets || []).map((item) =>
	                                      item.id === font.id ? { ...item, body: event.target.value } : item
	                                    ),
	                                  }))
	                                }
	                                placeholder="Fonte de apoio"
	                                className="w-full rounded-[10px] border border-black/10 bg-black/5 px-[10px] py-[8px] text-[12px] text-black outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
	                              />
	                            </div>
	                          ))}
	                        </div>
	                      ) : (
	                        <p className="text-[12px] text-black/50 dark:text-white/50">Nenhum preset salvo ainda.</p>
	                      )}
	                    </div>
	                  </div>

	                  <div className="md:col-span-2 rounded-[16px] border border-black/10 bg-white/70 p-[14px] dark:border-white/10 dark:bg-black/20">
	                    <div className="mb-[10px] flex flex-wrap items-center justify-between gap-[10px]">
	                      <div>
	                        <div className="text-[13px] font-[900] text-black dark:text-white">Regras de estilo</div>
	                        <p className="text-[12px] text-black/50 dark:text-white/50">Regras que o estúdio deve respeitar sempre.</p>
	                      </div>
	                      <div className="flex gap-[8px]">
	                        <button type="button" onClick={() => addStyleRule('do')} className="rounded-[10px] bg-emerald-500/15 px-[10px] py-[7px] text-[12px] font-[800] text-emerald-700 dark:text-emerald-200">Adicionar usar</button>
	                        <button type="button" onClick={() => addStyleRule('dont')} className="rounded-[10px] bg-red-500/15 px-[10px] py-[7px] text-[12px] font-[800] text-red-700 dark:text-red-200">Adicionar evitar</button>
	                      </div>
	                    </div>
	                    <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2">
	                      {(profile.styleRules || []).map((rule) => (
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
	                            className="min-h-[70px] w-full resize-y rounded-[10px] border border-black/10 bg-white/60 p-[10px] text-[12px] text-black outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
	                            maxLength={500}
	                          />
	                        </div>
	                      ))}
	                    </div>
	                  </div>
	                </div>
	              </div>

              <div className="md:col-span-2 rounded-[20px] border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] p-[20px]">
                <div className="mb-[16px] flex flex-col gap-[6px]">
                  <div className="flex items-center gap-[8px]">
                    <Palette className="h-[18px] w-[18px] text-stone-500 dark:text-stone-300" />
                    <h3 className="text-[18px] font-[800] text-black dark:text-white">Identidade visual</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-black/60 dark:text-white/60">
                    Envie posts, logos, banners ou prints que mostrem a identidade visual da marca.
                  </p>
                </div>

                <label className="flex cursor-pointer flex-col items-center justify-center gap-[10px] rounded-[18px] border border-dashed border-black/20 bg-white/70 p-[24px] text-center transition hover:border-stone-500/50 hover:bg-stone-50 dark:border-white/20 dark:bg-black/20 dark:hover:bg-white/5">
                  <UploadCloud className="h-[28px] w-[28px] text-stone-500 dark:text-stone-300" />
                  <div>
                    <p className="text-[14px] font-[800] text-black dark:text-white">Enviar referências visuais</p>
                    <p className="mt-[2px] text-[12px] text-black/55 dark:text-white/55">
                      Até 8 imagens. Elas serão comprimidas para caber no perfil da empresa.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={uploadVisualAssets}
                  />
                </label>

                {!!(profile.visualIdentityAssets || []).length && (
                  <div className="mt-[18px] grid grid-cols-1 gap-[14px] md:grid-cols-2">
                    {(profile.visualIdentityAssets || []).map((asset) => (
                      <div
                        key={asset.id}
                        className="overflow-hidden rounded-[16px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#151824]"
                      >
                        <div className="relative aspect-[4/3] bg-black/5 dark:bg-white/5">
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="h-full w-full object-cover"
                          />
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
                            onChange={(event) =>
                              updateVisualAssetDescription(asset.id, event.target.value)
                            }
                            placeholder="Descrição editável desta referência. O sistema preenche depois da análise."
                            className={`${textAreaClass} min-h-[92px] p-[12px] text-[12px]`}
                            maxLength={1600}
                          />
                        </div>
                      </div>
                    ))}
	                  </div>
	                )}

	                {!!(profile.brandLogos || []).length && (
	                  <div className="mt-[18px] rounded-[16px] border border-stone-500/20 bg-stone-500/10 p-[14px]">
	                    <div className="mb-[10px] text-[13px] font-[900] text-stone-800 dark:text-stone-100">
	                      Logos oficiais selecionados
	                    </div>
	                    <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2">
	                      {(profile.brandLogos || []).map((logo) => (
	                        <div key={logo.id} className="flex gap-[10px] rounded-[12px] border border-stone-500/20 bg-white/70 p-[10px] dark:bg-black/20">
	                          <img src={logo.dataUrl} alt={logo.name} className="h-[58px] w-[58px] rounded-[10px] object-cover" />
	                          <div className="min-w-0 flex-1">
	                            <div className="truncate text-[12px] font-[900] text-black dark:text-white">{logo.name}</div>
	                            <input
	                              value={logo.usage}
	                              onChange={(event) =>
	                                setProfile((current) => ({
	                                  ...current,
	                                  brandLogos: (current.brandLogos || []).map((item) =>
	                                    item.id === logo.id ? { ...item, usage: event.target.value } : item
	                                  ),
	                                }))
	                              }
	                              className="mt-[6px] w-full rounded-[9px] border border-black/10 bg-black/5 px-[9px] py-[7px] text-[11px] text-black outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
	                            />
	                            <button type="button" onClick={() => removeBrandKitItem('brandLogos', logo.id)} className="mt-[6px] text-[11px] font-[800] text-red-400">
	                              remover logo
	                            </button>
	                          </div>
	                        </div>
	                      ))}
	                    </div>
	                  </div>
	                )}

                <div className="mt-[18px] flex flex-col gap-[10px]">
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
                    <span className="text-[12px] text-black/50 dark:text-white/50">
                      Esse resumo será usado no Estúdio de Carrosséis.
                    </span>
                  </div>

                  <label className="flex flex-col gap-[8px]">
                    <span className="text-[14px] font-[700] text-black/90 dark:text-white/90">
                      Resumo visual da marca
                    </span>
                    <textarea
                      value={profile.visualIdentitySummary}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          visualIdentitySummary: event.target.value,
                        }))
                      }
                      placeholder="Ex: Marca com visual editorial, fundos claros, tipografia serifada forte, fotos com bastante respiro..."
                      className={`${textAreaClass} min-h-[150px]`}
                      maxLength={4000}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-[32px] flex flex-wrap gap-[16px] items-center">
              <Button 
                type="button" 
                onClick={saveProfile} 
                loading={saving}
              >
                Salvar Configurações
              </Button>
              
              <Button 
                type="button" 
                onClick={generateSummary} 
                loading={generating}
                className="!bg-stone-950 hover:!bg-stone-800 border-none !text-white shadow-none dark:!bg-stone-100 dark:!text-stone-950 dark:hover:!bg-white"
              >
                <FileText className="mr-2 h-4 w-4 inline-block" />
                Criar resumo da empresa
              </Button>
            </div>

            {error && (
              <div className="mt-[24px] animate-in slide-in-from-bottom-2 flex items-center gap-[12px] rounded-[16px] border border-red-500/30 bg-red-500/10 p-[16px]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">!</div>
                <p className="text-[14px] font-medium text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-[24px] animate-in slide-in-from-bottom-2 flex items-center gap-[12px] rounded-[16px] border border-green-500/30 bg-green-500/10 p-[16px]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-[14px] font-medium text-green-300">{success}</p>
              </div>
            )}
          </div>
        </div>

        {/* Results Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-[24px]">
          {/* Action Card */}
          <div className="relative overflow-hidden rounded-[18px] border border-black/10 bg-white p-[24px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
            <div className="relative z-10 flex flex-col gap-[16px] items-start">
              <div className="h-12 w-12 rounded-[12px] bg-stone-100 dark:bg-white/5 flex items-center justify-center border border-black/10 dark:border-white/10">
                <ImageIcon className="h-6 w-6 text-stone-600 dark:text-stone-200" />
              </div>
              <div>
                <h3 className="text-[20px] font-[700] text-black dark:text-white">Estúdio de Carrosséis</h3>
                <p className="text-[14px] text-black/60 dark:text-white/60 mt-[4px] mb-[16px] leading-relaxed">
                  Crie carrosséis de alto engajamento usando a identidade da sua marca.
                </p>
              </div>
              <Button 
                type="button" 
                onClick={() => router.push('/ai-generate-images')}
                className="w-full justify-center group/btn"
              >
                Acessar Estúdio
                <ArrowRight className="ml-2 h-4 w-4 inline-block transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          </div>

          {(profile.summary || profile.visualIdentitySummary || contentPillars.length > 0 || postIdeas.length > 0) && (
            <div className="rounded-[18px] border border-black/10 bg-white p-[24px] shadow-sm dark:border-white/10 dark:bg-[#101010] animate-in slide-in-from-right-4 fade-in duration-500 flex flex-col gap-[24px]">
              
              {profile.summary && (
                <div className="flex flex-col gap-[12px]">
                  <h3 className="text-[16px] font-[700] text-black dark:text-white flex items-center gap-[8px]">
                    <Building2 className="h-[16px] w-[16px] text-stone-500 dark:text-stone-300" />
                    Resumo de Contexto
                  </h3>
                  <textarea
                    value={profile.summary}
                    onChange={(event) => setProfile((current) => ({ ...current, summary: event.target.value }))}
                    className={`${textAreaClass} min-h-[160px] text-[13px] leading-relaxed p-[14px] bg-black/5 dark:bg-black/20`}
                    maxLength={4000}
                  />
                </div>
              )}

              {profile.visualIdentitySummary && (
                <div className="flex flex-col gap-[12px]">
                  <h3 className="text-[16px] font-[700] text-black dark:text-white flex items-center gap-[8px]">
                    <Palette className="h-[16px] w-[16px] text-stone-500 dark:text-stone-300" />
                    Resumo Visual
                  </h3>
                  <textarea
                    value={profile.visualIdentitySummary}
                    onChange={(event) => setProfile((current) => ({ ...current, visualIdentitySummary: event.target.value }))}
                    className={`${textAreaClass} min-h-[150px] text-[13px] leading-relaxed p-[14px] bg-black/5 dark:bg-black/20`}
                    maxLength={4000}
                  />
                </div>
              )}

              {contentPillars.length > 0 && (
                <div className="flex flex-col gap-[12px]">
                  <h3 className="text-[16px] font-[700] text-black dark:text-white flex items-center gap-[8px]">
                    <Target className="h-[16px] w-[16px] text-stone-500 dark:text-stone-300" />
                    Pilares de Conteúdo
                  </h3>
                  <div className="flex flex-wrap gap-[8px]">
                    {contentPillars.map((pillar, index) => (
                      <span
                        key={`${pillar}-${index}`}
                        className="rounded-full border border-stone-500/20 bg-stone-500/10 px-[12px] py-[6px] text-[12px] font-medium text-stone-700 transition-colors hover:bg-stone-500/15 dark:text-stone-200"
                      >
                        {pillar}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {postIdeas.length > 0 && (
                <div className="flex flex-col gap-[12px]">
                  <h3 className="text-[16px] font-[700] text-black dark:text-white flex items-center gap-[8px]">
                    <Lightbulb className="h-[16px] w-[16px] text-stone-500 dark:text-stone-300" />
                    Ideias Iniciais
                  </h3>
                  <div className="flex flex-col gap-[10px]">
                    {postIdeas.map((idea, index) => (
                      <div
                        key={`${idea}-${index}`}
                        className="rounded-[12px] border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 p-[14px] text-[13px] leading-relaxed text-black/80 dark:text-white/80 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        {idea}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};
