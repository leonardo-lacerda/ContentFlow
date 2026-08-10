import { CreativeCapability } from './creative-engine.types';

export interface CreativePreset {
  id: string;
  name: string;
  description: string;
  capability: CreativeCapability;
  defaults: Record<string, unknown>;
  requiredInputs: string[];
}

export const CREATIVE_PRESETS: CreativePreset[] = [
  {
    id: 'ugc-performance-vertical',
    name: 'UGC de performance vertical',
    description: 'Hook, prova, beneficio e CTA em formato 9:16.',
    capability: 'talking-actor',
    defaults: { aspectRatio: '9:16', durationSec: 25, tone: 'direto e natural' },
    requiredInputs: ['project', 'script', 'approvedActor', 'approvedVoice'],
  },
  {
    id: 'product-b-roll',
    name: 'Product showcase com B-roll',
    description: 'Produto em foco com takes de demonstracao e close-up.',
    capability: 'b-roll',
    defaults: { aspectRatio: '9:16', durationSec: 8, shots: ['hero', 'close-up', 'use-case'] },
    requiredInputs: ['project', 'productAsset'],
  },
  {
    id: 'localized-variant',
    name: 'Variante localizada',
    description: 'Traduz o script e gera captions SRT para outro idioma.',
    capability: 'translation',
    defaults: { language: 'en-US', preserveCta: true },
    requiredInputs: ['project', 'script', 'targetLanguage'],
  },
  {
    id: 'unboxing-pov',
    name: 'Unboxing POV',
    description: 'Take em primeira pessoa para abertura, descoberta e demonstracao do produto.',
    capability: 'b-roll',
    defaults: { aspectRatio: '9:16', durationSec: 12, shots: ['package', 'hands', 'reveal', 'use-case'] },
    requiredInputs: ['project', 'productAsset'],
  },
  {
    id: 'show-your-app',
    name: 'Show your app',
    description: 'Apresentacao vertical de interface, fluxo principal e CTA de conversao.',
    capability: 'video-generation',
    defaults: { aspectRatio: '9:16', durationSec: 10, camera: 'screen-recording-to-device' },
    requiredInputs: ['project', 'productAsset'],
  },
  {
    id: 'camera-movement',
    name: 'Camera movement',
    description: 'Movimento de camera parametrizado para transformar um product shot em take de anuncio.',
    capability: 'video-generation',
    defaults: { aspectRatio: '9:16', durationSec: 8, movement: 'slow-dolly-in' },
    requiredInputs: ['project', 'productAsset'],
  },
  {
    id: 'fashion-try-on',
    name: 'Fashion try-on',
    description: 'Composicao de produto de moda em pessoa ou contexto lifestyle.',
    capability: 'image-generation',
    defaults: { aspectRatio: '4:5', durationSec: 1, style: 'lifestyle-editorial' },
    requiredInputs: ['project', 'productAsset'],
  },
  {
    id: 'gameplay-ad',
    name: 'Gameplay ad',
    description: 'Hook visual e ritmo de gameplay para criativos de aquisicao.',
    capability: 'video-generation',
    defaults: { aspectRatio: '9:16', durationSec: 15, pacing: 'fast-cut' },
    requiredInputs: ['project', 'prompt'],
  },
  {
    id: 'audio-driven',
    name: 'Audio-driven actor',
    description: 'Sincroniza um ator autorizado a partir de um audio fornecido.',
    capability: 'lip-sync',
    defaults: { aspectRatio: '9:16', durationSec: 15 },
    requiredInputs: ['project', 'approvedActor', 'audioUrl'],
  },
];
