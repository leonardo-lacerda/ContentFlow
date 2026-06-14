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

// ---- Bibliotecas de opções (reduzem digitação: o usuário só clica) ----
const industryOptions = [
  'SaaS B2B',
  'E-commerce',
  'Educação',
  'Saúde e bem-estar',
  'Finanças',
  'Agência / Marketing',
  'Indústria',
  'Serviços locais',
  'Imobiliário',
  'Alimentação',
  'Moda e beleza',
  'Tecnologia',
];

const audienceOptions = [
  'Empreendedores',
  'Pequenas empresas',
  'Grandes empresas',
  'Profissionais de marketing',
  'Desenvolvedores',
  'Designers',
  'Criadores de conteúdo',
  'Estudantes',
  'Consumidor final (B2C)',
  'Gestores / C-level',
];

const toneOptions = [
  'Profissional',
  'Descontraído',
  'Inspirador',
  'Técnico',
  'Educacional',
  'Autoral',
  'Provocador',
  'Amigável',
  'Premium',
  'Divertido',
];

const differentialOptions = [
  'Preço competitivo',
  'Qualidade premium',
  'Atendimento próximo',
  'Especialização / Expertise',
  'Rapidez de entrega',
  'Personalização',
  'Tecnologia própria',
  'Resultados comprovados',
  'Comunidade engajada',
  'Sustentabilidade',
];

const ctaOptions = [
  'Salve para rever depois',
  'Comente sua opinião',
  'Compartilhe com quem precisa',
  'Acesse o link na bio',
  'Mande uma DM',
  'Agende uma demonstração',
  'Conheça nossos planos',
  'Baixe o material gratuito',
];

const contentPreferenceOptions = [
  'Educacional',
  'Storytelling',
  'Data-driven',
  'Bastidores',
  'Promocional',
  'Inspiracional',
  'Tutoriais',
  'Cases de clientes',
  'Tendências do setor',
  'Dicas rápidas',
];

const styleDoLibrary = [
  'Usar composições limpas e texto legível',
  'Manter bastante respiro / espaço em branco',
  'Priorizar contraste alto entre texto e fundo',
  'Usar imagens reais e de boa qualidade',
  'Aplicar a paleta da marca de forma consistente',
];

const styleDontLibrary = [
  'Evitar visual genérico e poluído',
  'Não usar mais de 2 fontes diferentes',
  'Evitar texto pequeno demais',
  'Não usar emojis em excesso',
  'Evitar clichês visuais de banco de imagem',
];

const listToArray = (value: string) =>
  (value || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const arrayToList = (items: string[]) => items.join(', ');

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

// ---- UI helpers ----
const OptionChip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-[14px] py-[9px] text-[13px] font-[700] transition ${
      active
        ? 'border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900'
        : 'border-black/10 bg-white/70 text-black/65 hover:border-stone-500/50 hover:text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:text-stone-100'
    }`}
  >
    {children}
  </button>
);

const TagInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) => {
  const [draft, setDraft] = useState('');
  const tags = listToArray(value);

  const add = (raw: string) => {
    const item = raw.trim().replace(/,$/, '').trim();
    if (!item || tags.includes(item)) {
      setDraft('');
      return;
    }
    onChange(arrayToList([...tags, item]));
    setDraft('');
  };

  const remove = (tag: string) =>
    onChange(arrayToList(tags.filter((item) => item !== tag)));

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex min-h-[48px] flex-wrap items-center gap-[8px] rounded-[10px] border border-black/10 bg-white p-[8px] dark:border-white/10 dark:bg-[#171717]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-[6px] rounded-full bg-stone-900/10 px-[10px] py-[5px] text-[12px] font-[700] text-black/80 dark:bg-white/10 dark:text-white/80"
          >
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`Remover ${tag}`}>
              <X className="h-[12px] w-[12px]" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add(draft);
            } else if (event.key === 'Backspace' && !draft && tags.length) {
              remove(tags[tags.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          placeholder={tags.length ? '' : placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-[6px] text-[14px] text-black outline-none placeholder:text-black/35 dark:text-white dark:placeholder:text-white/35"
        />
      </div>
    </div>
  );
};

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

  // Alterna um valor dentro de um campo armazenado como lista separada por vírgula.
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
      setSuccess('Analisamos seu site. Revise as opções sugeridas abaixo.');
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
    // Salva silenciosamente o progresso ao avançar (o backend aceita perfil parcial).
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

  const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="flex flex-col gap-[4px]">
      <h3 className="text-[22px] font-[800] tracking-tight text-black dark:text-white">{title}</h3>
      <p className="text-[14px] leading-relaxed text-black/55 dark:text-white/55">{subtitle}</p>
    </div>
  );

  const FieldLabel = ({ children }: { children: ReactNode }) => (
    <span className="text-[14px] font-[700] text-black/90 dark:text-white/90">{children}</span>
  );

  return (
    <div className="relative min-h-[calc(100vh-100px)] w-full">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_0%,rgba(120,113,108,0.12),transparent_28%),linear-gradient(180deg,rgba(245,245,244,0.08),transparent_40%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(120,113,108,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[920px] flex-col gap-[20px] pb-[60px] pt-[20px]">
        {/* Header + switcher de empresa (fora do fluxo principal) */}
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

        {/* Conteúdo do passo */}
        <div className="rounded-[18px] border border-black/10 bg-white p-[28px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
          {/* PASSO 1 — IDENTIDADE */}
          {step === 0 && (
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
          )}

          {/* PASSO 2 — POSICIONAMENTO */}
          {step === 1 && (
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
          )}

          {/* PASSO 3 — VISUAL */}
          {step === 2 && (
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

              {/* Cores */}
              <div className="flex flex-col gap-[12px] rounded-[16px] border border-black/10 bg-white/60 p-[18px] dark:border-white/10 dark:bg-black/20">
                <div>
                  <FieldLabel>Cores da marca</FieldLabel>
                  <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">Escolha olhando, sem precisar saber código de cor.</p>
                </div>
                <div className="grid grid-cols-4 gap-[10px] max-w-[420px]">
                  {Array.from({ length: 4 }).map((_, index) => {
                    const colors = parseColorList(profile.brandColors);
                    const color = colors[index] || defaultBrandColors[index];
                    return (
                      <label
                        key={`brand-color-${index}`}
                        className="group flex cursor-pointer flex-col gap-[6px] rounded-[14px] border border-black/10 bg-black/5 p-[8px] transition hover:border-stone-500/50 dark:border-white/10 dark:bg-white/5"
                      >
                        <span className="h-[44px] rounded-[10px] border border-black/10 shadow-sm dark:border-white/10" style={{ backgroundColor: color }} />
                        <span className="text-center text-[11px] font-[800] text-black/55 dark:text-white/55">Cor {index + 1}</span>
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
                          <span key={`${preset.name}-${color}`} className="h-[13px] w-[13px] rounded-full border border-white/70" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                      {preset.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={saveCurrentPalette}
                    className="rounded-full border border-stone-500/20 bg-stone-500/10 px-[12px] py-[7px] text-[12px] font-[800] text-stone-800 transition hover:bg-stone-500/15 dark:text-stone-200"
                  >
                    Salvar paleta
                  </button>
                </div>
              </div>

              {/* Letras */}
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
          )}

          {/* PASSO 4 — VOZ E REGRAS */}
          {step === 3 && (
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
                            active
                              ? setProfile((current) => ({
                                  ...current,
                                  styleRules: (current.styleRules || []).filter((rule) => !(rule.type === 'do' && rule.text === text)),
                                }))
                              : addStyleRule('do', text)
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
                            active
                              ? setProfile((current) => ({
                                  ...current,
                                  styleRules: (current.styleRules || []).filter((rule) => !(rule.type === 'dont' && rule.text === text)),
                                }))
                              : addStyleRule('dont', text)
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

                {/* Regras personalizadas adicionadas (editáveis) */}
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
          )}

          {/* PASSO 5 — REVISÃO */}
          {step === 4 && (
            <div className="flex flex-col gap-[24px]">
              <SectionTitle
                title="Revisão final"
                subtitle="Confira o resumo gerado e ajuste se necessário. Depois é só concluir."
              />

              {!profile.summary && (
                <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 p-[14px] text-[13px] text-amber-700 dark:text-amber-200">
                  Você ainda não gerou o resumo da empresa. Volte ao passo 1 e clique em “Analisar meu site” para um resultado melhor (mas você já pode concluir mesmo assim).
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
          )}

          {/* Mensagens */}
          {error && (
            <div className="mt-[20px] flex items-center gap-[12px] rounded-[14px] border border-red-500/30 bg-red-500/10 p-[14px]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-red-400">!</div>
              <p className="text-[13px] font-medium text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-[20px] flex items-center gap-[12px] rounded-[14px] border border-green-500/30 bg-green-500/10 p-[14px]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-[13px] font-medium text-green-300">{success}</p>
            </div>
          )}

          {/* Navegação */}
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
