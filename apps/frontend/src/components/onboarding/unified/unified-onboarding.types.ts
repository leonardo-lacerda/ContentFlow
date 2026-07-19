import {
  Building2,
  Search,
  CheckCircle2,
  Share2,
  Lightbulb,
  PartyPopper,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { BrandDnaSnapshot } from '@gitroom/frontend/components/brand-dna/brand-dna.types';

export type OnboardingStepId =
  | 'welcome'
  | 'brand-identity'
  | 'brand-analyze'
  | 'brand-review'
  | 'connect-channels'
  | 'first-content'
  | 'feature-tour'
  | 'done';

export type OnboardingProgress = {
  currentStep?: OnboardingStepId | string;
  brandId?: string;
  skippedFeatureIds?: string[];
  openedFeatureIds?: string[];
  version?: string;
};

export type OnboardingStatus = {
  completedAt: string | null;
  progress: OnboardingProgress | null;
};

export type FeatureSectionId =
  | 'create'
  | 'library'
  | 'operate'
  | 'measure'
  | 'account';

export type FeatureCardDef = {
  id: string;
  section: FeatureSectionId;
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  whyKey: string;
  whyDefault: string;
  path: string;
  icon: LucideIcon;
};

export type StepMeta = {
  id: OnboardingStepId;
  labelKey: string;
  labelDefault: string;
  icon: LucideIcon;
};

export type GeneratedIdea = {
  title: string;
  hook: string;
  goal?: string;
  angle?: string;
  templateSuggestion?: string;
  platformSuggestion?: string;
  score?: number;
};

export const ONBOARDING_VERSION = '3';

// v1: conteúdo antes de OAuth; feature-tour removido
export const ONBOARDING_STEPS: StepMeta[] = [
  {
    id: 'welcome',
    labelKey: 'onboarding_step_welcome',
    labelDefault: 'Bem-vindo',
    icon: Sparkles,
  },
  {
    id: 'brand-identity',
    labelKey: 'onboarding_step_brand',
    labelDefault: 'Marca',
    icon: Building2,
  },
  {
    id: 'brand-analyze',
    labelKey: 'onboarding_step_analyze',
    labelDefault: 'Analisar',
    icon: Search,
  },
  {
    id: 'brand-review',
    labelKey: 'onboarding_step_review',
    labelDefault: 'Revisar DNA',
    icon: CheckCircle2,
  },
  {
    id: 'first-content',
    labelKey: 'onboarding_step_content',
    labelDefault: 'Conteúdo',
    icon: Lightbulb,
  },
  {
    id: 'connect-channels',
    labelKey: 'onboarding_step_channels',
    labelDefault: 'Canais',
    icon: Share2,
  },
  {
    id: 'done',
    labelKey: 'onboarding_step_done',
    labelDefault: 'Pronto',
    icon: PartyPopper,
  },
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

export type BrandFormState = {
  name: string;
  website: string;
  industry: string;
};

export type UnifiedOnboardingContext = {
  brandId: string;
  brandForm: BrandFormState;
  setBrandForm: (
    next: BrandFormState | ((prev: BrandFormState) => BrandFormState)
  ) => void;
  setBrandId: (id: string) => void;
  dna: BrandDnaSnapshot | null;
  setDna: (dna: BrandDnaSnapshot | null) => void;
  skippedFeatureIds: string[];
  openedFeatureIds: string[];
  markFeatureOpened: (id: string) => void;
  markFeatureSkipped: (id: string) => void;
  goToStep: (step: OnboardingStepId) => void;
  goNext: () => void;
  goBack: () => void;
  skipStep: () => void;
  completeOnboarding: () => Promise<void>;
  skipAll: () => Promise<void>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  persistProgress: (partial?: Partial<OnboardingProgress>) => Promise<void>;
};

export function stepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}

export function stepIdAt(index: number): OnboardingStepId {
  return ONBOARDING_STEPS[
    Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1))
  ].id;
}

/** Maps legacy/alias step ids to current ones (resume compatibility). */
const STEP_ALIASES: Record<string, OnboardingStepId> = {
  welcome: 'welcome',
  'brand-identity': 'brand-identity',
  create: 'brand-identity',
  brand: 'brand-identity',
  'brand-analyze': 'brand-analyze',
  analyze: 'brand-analyze',
  'brand-review': 'brand-review',
  dna: 'brand-review',
  review: 'brand-review',
  'connect-channels': 'connect-channels',
  channels: 'connect-channels',
  'first-content': 'first-content',
  ideas: 'first-content',
  carousel: 'first-content',
  content: 'first-content',
  // feature-tour removido no v1 — resume manda pro done
  'feature-tour': 'done',
  tour: 'done',
  features: 'done',
  done: 'done',
  complete: 'done',
};

export function parseStepId(raw?: string | null): OnboardingStepId | null {
  if (!raw) return null;
  return STEP_ALIASES[raw] || null;
}
