import { ChangeEvent } from 'react';

// ---- Shared types ----

export type VisualIdentityAsset = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  description: string;
};

export type BrandPalette = {
  id: string;
  name: string;
  colors: string[];
  usage: string;
};

export type BrandFontPreset = {
  id: string;
  name: string;
  headline: string;
  body: string;
  usage: string;
};

export type BrandLogoAsset = {
  id: string;
  name: string;
  dataUrl: string;
  usage: string;
  description: string;
};

export type StyleRule = {
  id: string;
  type: 'do' | 'dont';
  text: string;
};

export type CompanyInspiration = {
  id: string;
  name: string;
  src: string;
  source: string;
  category: string;
  favorite: boolean;
  approved: boolean;
  description: string;
};

export type CompanyProfile = {
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

// ---- Shared CSS class constants ----

export const inputClass =
  'h-[48px] w-full rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] px-[42px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20';
export const textAreaClass =
  'w-full resize-y rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-[16px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20';

// ---- Default profile ----

export const defaultProfile: CompanyProfile = {
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

// ---- ID generators ----

export const makeDraftAssetId = () =>
  `brand_asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const makeBrandKitId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ---- Option libraries ----

export const fontStylePresets = [
  'Editorial e sofisticada nos títulos, simples e legível no apoio',
  'Moderna, limpa e direta, com títulos fortes',
  'Amigável e humana, com aparência leve e acessível',
  'Premium e minimalista, com bastante espaço em branco',
];

export const industryOptions = [
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

export const audienceOptions = [
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

export const toneOptions = [
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

export const differentialOptions = [
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

export const ctaOptions = [
  'Salve para rever depois',
  'Comente sua opinião',
  'Compartilhe com quem precisa',
  'Acesse o link na bio',
  'Mande uma DM',
  'Agende uma demonstração',
  'Conheça nossos planos',
  'Baixe o material gratuito',
];

export const contentPreferenceOptions = [
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

export const styleDoLibrary = [
  'Usar composições limpas e texto legível',
  'Manter bastante respiro / espaço em branco',
  'Priorizar contraste alto entre texto e fundo',
  'Usar imagens reais e de boa qualidade',
  'Aplicar a paleta da marca de forma consistente',
];

export const styleDontLibrary = [
  'Evitar visual genérico e poluído',
  'Não usar mais de 2 fontes diferentes',
  'Evitar texto pequeno demais',
  'Não usar emojis em excesso',
  'Evitar clichês visuais de banco de imagem',
];

// ---- Utility helpers ----

export const listToArray = (value: string) =>
  (value || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const arrayToList = (items: string[]) => items.join(', ');

export const compressImageFile = (file: File) =>
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
