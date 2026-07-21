// ---- Block types ----

export interface EmailTextBlock {
  type: 'text';
  content: string;
  alignment: 'left' | 'center' | 'right';
  fontSize?: number | null;
  color?: string | null;
  marginTop?: number | null;
  marginBottom?: number | null;
}

export interface EmailHeadingBlock {
  type: 'heading';
  level: 'h1' | 'h2' | 'h3';
  content: string;
  text?: string | null;
  alignment: 'left' | 'center' | 'right';
  color?: string | null;
  marginTop?: number | null;
  marginBottom?: number | null;
}

export interface EmailImageBlock {
  type: 'image';
  src: string;
  url?: string | null;
  alt: string;
  width?: number | null;
  alignment: 'left' | 'center' | 'right';
  linkUrl?: string | null;
  marginTop?: number | null;
  marginBottom?: number | null;
}

export interface EmailDividerBlock {
  type: 'divider';
  color: string;
  marginTop?: number | null;
  marginBottom?: number | null;
}

export interface EmailCtaBlock {
  type: 'cta';
  text: string;
  url: string;
  color: string;
  textColor: string;
  alignment: 'left' | 'center' | 'right';
  borderRadius: number;
  marginTop?: number | null;
  marginBottom?: number | null;
}

export interface EmailCarouselCard {
  type: 'carousel_card';
  imageUrl: string;
  title: string;
  summary: string;
  linkUrl?: string | null;
}

export interface EmailCarouselBlock {
  type: 'carousel';
  cards: EmailCarouselCard[];
  layout: 'horizontal' | 'stacked';
  marginTop?: number | null;
  marginBottom?: number | null;
}

export interface EmailSpacerBlock {
  type: 'spacer';
  height: number;
}

export interface EmailSocialLinksBlock {
  type: 'social_links';
  networks: Array<{ name: string; url: string; icon?: string | null }>;
  alignment: 'left' | 'center' | 'right';
  marginTop?: number | null;
  marginBottom?: number | null;
}

export type EmailBlock =
  | EmailTextBlock
  | EmailHeadingBlock
  | EmailImageBlock
  | EmailDividerBlock
  | EmailCtaBlock
  | EmailCarouselBlock
  | EmailSpacerBlock
  | EmailSocialLinksBlock;

// ---- Campaign types ----

export type EmailCampaignType = 'NEWSLETTER' | 'WELCOME_SEQUENCE' | 'PROMOTIONAL';
export type EmailCampaignStatus = 'DRAFT' | 'GENERATING' | 'READY' | 'EXPORTED' | 'FAILED';

export interface EmailCampaign {
  id: string;
  organizationId?: string;
  brandProfileId?: string | null;
  contentIdeaId?: string | null;
  carouselProjectId?: string | null;
  name: string;
  type: EmailCampaignType;
  status: EmailCampaignStatus;
  subject: string;
  preheader?: string | null;
  bodyHtml: string;
  bodyJson?: { blocks: EmailBlock[] } | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  ctaColor?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  headerImageUrl?: string | null;
  logoUrl?: string | null;
  sequenceIndex?: number | null;
  sequenceTotal?: number | null;
  sequenceDelayDays?: number | null;
  exportCount: number;
  lastExportedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface EmailTemplate {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  category: string;
  exampleSubjects: string[];
}

// ---- Constants ----

export const EMAIL_TYPE_LABELS: Record<EmailCampaignType, string> = {
  NEWSLETTER: 'Newsletter',
  WELCOME_SEQUENCE: 'Boas-vindas',
  PROMOTIONAL: 'Promocional',
};

export const EMAIL_STATUS_LABELS: Record<EmailCampaignStatus, string> = {
  DRAFT: 'Rascunho',
  GENERATING: 'Gerando',
  READY: 'Pronta',
  EXPORTED: 'Exportada',
  FAILED: 'Falhou',
};

export const EMAIL_STATUS_COLORS: Record<EmailCampaignStatus, string> = {
  DRAFT: 'bg-newSettings text-textItemBlur border border-newTableBorder',
  GENERATING: 'bg-amber-500/15 text-amber-400',
  READY: 'bg-emerald-500/15 text-emerald-400',
  EXPORTED: 'bg-btnPrimary/20 text-newTextColor',
  FAILED: 'bg-red-500/15 text-red-400',
};

export const BLOCK_TYPE_OPTIONS = [
  { type: 'heading' as const, label: 'Título', icon: 'H' },
  { type: 'text' as const, label: 'Texto', icon: 'T' },
  { type: 'image' as const, label: 'Imagem', icon: '🖼' },
  { type: 'cta' as const, label: 'Botão CTA', icon: '🔗' },
  { type: 'carousel' as const, label: 'Carrossel', icon: '▦' },
  { type: 'divider' as const, label: 'Divisor', icon: '—' },
  { type: 'spacer' as const, label: 'Espaço', icon: '↕' },
  { type: 'social_links' as const, label: 'Social', icon: '♻' },
];

// ---- Block helpers ----

let _blockIdCounter = 0;

export function createBlockId(): string {
  return `block-${Date.now()}-${++_blockIdCounter}`;
}

export function makeDefaultBlock(type: EmailBlock['type']): EmailBlock {
  switch (type) {
    case 'heading':
      return { type: 'heading', level: 'h2', content: 'Título', alignment: 'center', color: null };
    case 'text':
      return { type: 'text', content: 'Texto do e-mail', alignment: 'left', fontSize: null, color: null };
    case 'image':
      return { type: 'image', src: '', alt: 'Imagem', alignment: 'center', width: null, linkUrl: null };
    case 'cta':
      return { type: 'cta', text: 'Clique aqui', url: '#', color: '#007bff', textColor: '#ffffff', alignment: 'center', borderRadius: 4 };
    case 'carousel':
      return {
        type: 'carousel',
        cards: [
          { type: 'carousel_card', imageUrl: '', title: 'Card 1', summary: 'Descrição' },
          { type: 'carousel_card', imageUrl: '', title: 'Card 2', summary: 'Descrição' },
        ],
        layout: 'horizontal',
      };
    case 'divider':
      return { type: 'divider', color: '#cccccc' };
    case 'spacer':
      return { type: 'spacer', height: 24 };
    case 'social_links':
      return {
        type: 'social_links',
        networks: [
          { name: 'instagram', url: 'https://instagram.com' },
          { name: 'linkedin', url: 'https://linkedin.com' },
        ],
        alignment: 'center',
      };
  }
}
