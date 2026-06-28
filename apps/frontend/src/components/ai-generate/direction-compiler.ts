// Compilador de Direção Criativa.
//
// Substitui a etapa de "escolher inspirações em uma biblioteca". As 6 escolhas
// de características visuais viram um DirectionSpec; o spec compila — de forma
// 100% determinística — em fragmentos de prompt e no SlideRenderSpec que o
// buildSlideImagePrompt já consome. Mesmos inputs => mesma direção.
//
// Duas portas de entrada:
//  - buildDirectionSpec(strategy, brandKit): deriva os defaults da estratégia
//    (template + objetivo + plataforma + Brand Kit). É o que pré-preenche os
//    dials quando o usuário chega na etapa.
//  - resolveDirectionFragments / buildDirectionRenderSpec: transformam o spec
//    (já ajustado ou não pelo usuário) em texto de prompt.

import {
  brandIntensityPresets,
  compositionPresets,
  densityPresets,
  directionAxes,
  editorialPresets,
  findDirectionOption,
  hierarchyPresets,
  imageryPresets,
} from './ai-generate-images.presets';
import type { DirectionAxisOption } from './ai-generate-images.presets';
import type { SlideRenderSpec } from './ai-generate-images.utils';

export type DirectionSpec = {
  editorial: string;
  hierarchy: string;
  density: string;
  composition: string;
  imagery: string;
  brandIntensity: string;
};

export type DirectionAxisKey = keyof DirectionSpec;

export const defaultDirectionSpec: DirectionSpec = {
  editorial: 'editorial-premium',
  hierarchy: 'balanced',
  density: 'medium',
  composition: 'centered',
  imagery: 'ai-free',
  brandIntensity: 'balanced',
};

export type DirectionStrategy = {
  templateId?: string;
  goal?: string;
  platform?: string;
};

export type DirectionBrandKit = {
  hasPalette?: boolean;
};

// Garante que qualquer DirectionSpec parcial/sujo vira um spec válido. Um id
// ausente OU inválido cai no default canônico do eixo (defaultDirectionSpec),
// não no primeiro item da lista. Útil ao reabrir projetos salvos.
const resolveAxisId = (
  options: DirectionAxisOption[],
  id: string | undefined,
  fallback: string
) => (options.some((option) => option.id === id) ? (id as string) : fallback);

export const normalizeDirectionSpec = (
  spec?: Partial<DirectionSpec> | null
): DirectionSpec => ({
  editorial: resolveAxisId(
    editorialPresets,
    spec?.editorial,
    defaultDirectionSpec.editorial
  ),
  hierarchy: resolveAxisId(
    hierarchyPresets,
    spec?.hierarchy,
    defaultDirectionSpec.hierarchy
  ),
  density: resolveAxisId(densityPresets, spec?.density, defaultDirectionSpec.density),
  composition: resolveAxisId(
    compositionPresets,
    spec?.composition,
    defaultDirectionSpec.composition
  ),
  imagery: resolveAxisId(imageryPresets, spec?.imagery, defaultDirectionSpec.imagery),
  brandIntensity: resolveAxisId(
    brandIntensityPresets,
    spec?.brandIntensity,
    defaultDirectionSpec.brandIntensity
  ),
});

// Deriva a direção a partir da estratégia. Regras explícitas e determinísticas:
// a mesma combinação template+objetivo+plataforma sempre gera o mesmo ponto de
// partida. O usuário só ajusta o que discordar.
export const buildDirectionSpec = (
  strategy: DirectionStrategy = {},
  brandKit: DirectionBrandKit = {}
): DirectionSpec => {
  const template = (strategy.templateId || '').toLowerCase();
  const goal = (strategy.goal || '').toLowerCase();
  const platform = (strategy.platform || '').toLowerCase();

  const isAuthority = goal.includes('autoridade');
  const isOffer = goal.includes('vender') || goal.includes('oferta');
  const isLeads = goal.includes('lead') || goal.includes('captur');
  const isLinkedin = platform === 'linkedin';
  const isTiktok = platform === 'tiktok';

  let editorial = defaultDirectionSpec.editorial;
  if (template === 'storytelling') editorial = 'revista';
  else if (template === 'case') editorial = 'corporativo-moderno';
  else if (template === 'offer' || template === 'before-after') editorial = 'bold';
  else if (template === 'list') editorial = 'clean';
  else if (isAuthority) editorial = 'editorial-premium';
  if (isLinkedin && !isOffer) editorial = 'institucional';
  if (isTiktok) editorial = 'bold';

  let hierarchy: DirectionSpec['hierarchy'] = 'balanced';
  if (template === 'list' || template === 'educational') hierarchy = 'text-dominant';
  else if (template === 'storytelling' || isOffer) hierarchy = 'visual-dominant';

  let density: DirectionSpec['density'] = 'medium';
  if (isAuthority || isLinkedin) density = 'minimal';
  else if (isTiktok || template === 'offer') density = 'rich';

  let composition: DirectionSpec['composition'] = 'centered';
  if (template === 'list') composition = 'grid';
  else if (template === 'storytelling' || template === 'case') composition = 'magazine';
  else if (isOffer || template === 'before-after') composition = 'asymmetric';

  let imagery: DirectionSpec['imagery'] = 'ai-free';
  if (isLinkedin && isAuthority) imagery = 'none';
  else if (template === 'storytelling') imagery = 'people';
  else if (isOffer) imagery = 'product';
  else if (template === 'educational' || template === 'list') imagery = 'icons';

  let brandIntensity: DirectionSpec['brandIntensity'] = brandKit.hasPalette
    ? 'balanced'
    : 'content-dominant';
  if (isOffer || isLeads) brandIntensity = 'brand-dominant';

  return normalizeDirectionSpec({
    editorial,
    hierarchy,
    density,
    composition,
    imagery,
    brandIntensity,
  });
};

export type DirectionFragments = {
  editorial: string;
  hierarchy: string;
  density: string;
  composition: string;
  imagery: string;
  brandIntensity: string;
};

export const resolveDirectionFragments = (
  spec: DirectionSpec
): DirectionFragments => ({
  editorial: findDirectionOption(editorialPresets, spec.editorial).prompt,
  hierarchy: findDirectionOption(hierarchyPresets, spec.hierarchy).prompt,
  density: findDirectionOption(densityPresets, spec.density).prompt,
  composition: findDirectionOption(compositionPresets, spec.composition).prompt,
  imagery: findDirectionOption(imageryPresets, spec.imagery).prompt,
  brandIntensity: findDirectionOption(brandIntensityPresets, spec.brandIntensity)
    .prompt,
});

// Frase legível para a UI: "LinkedIn · Editorial premium · Texto dominante · …".
export const summarizeDirection = (
  spec: DirectionSpec,
  platform?: string
): string => {
  const labels = [
    platform
      ? platform.charAt(0).toUpperCase() + platform.slice(1)
      : undefined,
    findDirectionOption(editorialPresets, spec.editorial).label,
    findDirectionOption(hierarchyPresets, spec.hierarchy).label,
    findDirectionOption(densityPresets, spec.density).label,
    findDirectionOption(imageryPresets, spec.imagery).label,
    findDirectionOption(brandIntensityPresets, spec.brandIntensity).label,
  ].filter(Boolean);
  return labels.join(' · ');
};

// Compila o spec no SlideRenderSpec que o buildSlideImagePrompt já consome.
// Sem inspirações: hasInspirations/inspirationsLeadVisual são sempre falsos,
// então o builder segue o caminho determinístico.
export const buildDirectionRenderSpec = (
  spec: DirectionSpec,
  context: { brandColors?: string; brief?: string } = {}
): SlideRenderSpec => {
  const fragments = resolveDirectionFragments(spec);

  return {
    structureLayout: [fragments.composition, fragments.hierarchy]
      .filter(Boolean)
      .join(' '),
    stylePrompt: [fragments.editorial, fragments.density, fragments.imagery]
      .filter(Boolean)
      .join(' '),
    colorPrompt: '',
    brandColors: context.brandColors,
    typographyPrompt: '',
    brief: [fragments.brandIntensity, context.brief]
      .filter(Boolean)
      .join('\n'),
    hasInspirations: false,
    inspirationsLeadVisual: false,
  };
};

export { directionAxes };
