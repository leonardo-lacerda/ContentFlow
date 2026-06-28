import { describe, expect, it } from 'vitest';
import {
  buildDirectionRenderSpec,
  buildDirectionSpec,
  defaultDirectionSpec,
  normalizeDirectionSpec,
  resolveDirectionFragments,
  summarizeDirection,
} from './direction-compiler';

describe('direction-compiler', () => {
  describe('buildDirectionSpec', () => {
    it('é determinístico: mesmos inputs => mesmo spec', () => {
      const strategy = { templateId: 'educational', goal: 'gerar autoridade', platform: 'linkedin' };
      const a = buildDirectionSpec(strategy, { hasPalette: true });
      const b = buildDirectionSpec(strategy, { hasPalette: true });
      expect(a).toEqual(b);
    });

    it('deriva o exemplo do produto: educacional + autoridade + linkedin', () => {
      const spec = buildDirectionSpec(
        { templateId: 'educational', goal: 'gerar autoridade', platform: 'linkedin' },
        { hasPalette: true }
      );
      expect(spec.editorial).toBe('institucional');
      expect(spec.hierarchy).toBe('text-dominant');
      expect(spec.density).toBe('minimal');
      expect(spec.imagery).toBe('none');
      expect(spec.brandIntensity).toBe('balanced');
    });

    it('oferta puxa marca dominante e produto', () => {
      const spec = buildDirectionSpec(
        { templateId: 'offer', goal: 'vender uma oferta', platform: 'instagram' },
        { hasPalette: true }
      );
      expect(spec.brandIntensity).toBe('brand-dominant');
      expect(spec.imagery).toBe('product');
    });

    it('sem paleta de marca, a marca fica em segundo plano', () => {
      const spec = buildDirectionSpec(
        { templateId: 'educational', goal: 'educar e gerar engajamento', platform: 'instagram' },
        { hasPalette: false }
      );
      expect(spec.brandIntensity).toBe('content-dominant');
    });

    it('sem estratégia, cai nos defaults válidos', () => {
      expect(buildDirectionSpec()).toEqual(normalizeDirectionSpec(buildDirectionSpec()));
    });
  });

  describe('buildDirectionSpec — new templates (16 total)', () => {
    it('faq: clean editorial, text-dominant, icons', () => {
      const spec = buildDirectionSpec({ templateId: 'faq' });
      expect(spec.editorial).toBe('clean');
      expect(spec.hierarchy).toBe('text-dominant');
      expect(spec.density).toBe('medium');
      expect(spec.composition).toBe('modular');
      expect(spec.imagery).toBe('icons');
    });

    it('comparison: corporativo-moderno, grid layout', () => {
      const spec = buildDirectionSpec({ templateId: 'comparison' });
      expect(spec.editorial).toBe('corporativo-moderno');
      expect(spec.hierarchy).toBe('balanced');
      expect(spec.density).toBe('medium');
      expect(spec.composition).toBe('grid');
      expect(spec.imagery).toBe('icons');
    });

    it('testimonial: revista editorial, people imagery', () => {
      const spec = buildDirectionSpec({ templateId: 'testimonial' });
      expect(spec.editorial).toBe('revista');
      expect(spec.hierarchy).toBe('visual-dominant');
      expect(spec.density).toBe('minimal');
      expect(spec.composition).toBe('centered');
      expect(spec.imagery).toBe('people');
    });

    it('statistics: bold editorial, visual-dominant with icons', () => {
      const spec = buildDirectionSpec({ templateId: 'statistics' });
      expect(spec.editorial).toBe('bold');
      expect(spec.hierarchy).toBe('visual-dominant');
      expect(spec.density).toBe('medium');
      expect(spec.composition).toBe('centered');
      expect(spec.imagery).toBe('icons');
    });

    it('problem-solution: startup editorial, illustration imagery', () => {
      const spec = buildDirectionSpec({ templateId: 'problem-solution' });
      expect(spec.editorial).toBe('startup');
      expect(spec.hierarchy).toBe('balanced');
      expect(spec.density).toBe('medium');
      expect(spec.composition).toBe('asymmetric');
      expect(spec.imagery).toBe('illustration');
    });

    it('us-vs-them: bold editorial, asymmetric composition', () => {
      const spec = buildDirectionSpec({ templateId: 'us-vs-them' });
      expect(spec.editorial).toBe('bold');
      expect(spec.hierarchy).toBe('balanced');
      expect(spec.density).toBe('medium');
      expect(spec.composition).toBe('asymmetric');
      expect(spec.imagery).toBe('icons');
    });

    it('best-sellers: corporativo-moderno, product imagery, rich density', () => {
      const spec = buildDirectionSpec({ templateId: 'best-sellers' });
      expect(spec.editorial).toBe('corporativo-moderno');
      expect(spec.hierarchy).toBe('visual-dominant');
      expect(spec.density).toBe('rich');
      expect(spec.composition).toBe('grid');
      expect(spec.imagery).toBe('product');
    });

    it('negative-hook: bold editorial, visual-dominant, minimal density', () => {
      const spec = buildDirectionSpec({ templateId: 'negative-hook' });
      expect(spec.editorial).toBe('bold');
      expect(spec.hierarchy).toBe('visual-dominant');
      expect(spec.density).toBe('minimal');
      expect(spec.composition).toBe('centered');
      expect(spec.imagery).toBe('ai-free');
    });

    it('new templates are deterministic', () => {
      const templates = [
        'faq', 'comparison', 'testimonial', 'statistics',
        'problem-solution', 'us-vs-them', 'best-sellers', 'negative-hook',
      ];
      for (const t of templates) {
        const a = buildDirectionSpec({ templateId: t });
        const b = buildDirectionSpec({ templateId: t });
        expect(a).toEqual(b);
      }
    });

    it('new templates produce valid specs via normalizeDirectionSpec', () => {
      const templates = [
        'faq', 'comparison', 'testimonial', 'statistics',
        'problem-solution', 'us-vs-them', 'best-sellers', 'negative-hook',
      ];
      for (const t of templates) {
        const spec = buildDirectionSpec({ templateId: t });
        expect(spec).toEqual(normalizeDirectionSpec(spec));
      }
    });
  });

  describe('buildDirectionSpec — backward compatibility (legacy templates)', () => {
    it('storytelling: revista editorial, people imagery', () => {
      const spec = buildDirectionSpec({ templateId: 'storytelling' });
      expect(spec.editorial).toBe('revista');
      expect(spec.hierarchy).toBe('visual-dominant');
      expect(spec.imagery).toBe('people');
      expect(spec.composition).toBe('magazine');
    });

    it('case: corporativo-moderno editorial, magazine composition', () => {
      const spec = buildDirectionSpec({ templateId: 'case' });
      expect(spec.editorial).toBe('corporativo-moderno');
      expect(spec.composition).toBe('magazine');
    });

    it('offer: bold editorial, brand-dominant, product imagery', () => {
      const spec = buildDirectionSpec(
        { templateId: 'offer', goal: 'vender uma oferta' },
        { hasPalette: true }
      );
      expect(spec.editorial).toBe('bold');
      expect(spec.brandIntensity).toBe('brand-dominant');
      expect(spec.imagery).toBe('product');
    });

    it('list: clean editorial, text-dominant, grid composition', () => {
      const spec = buildDirectionSpec({ templateId: 'list' });
      expect(spec.editorial).toBe('clean');
      expect(spec.hierarchy).toBe('text-dominant');
      expect(spec.composition).toBe('grid');
      expect(spec.imagery).toBe('icons');
    });

    it('educational: text-dominant, icons imagery', () => {
      const spec = buildDirectionSpec({ templateId: 'educational' });
      expect(spec.hierarchy).toBe('text-dominant');
      expect(spec.imagery).toBe('icons');
    });

    it('before-after: bold editorial, asymmetric composition', () => {
      const spec = buildDirectionSpec({ templateId: 'before-after' });
      expect(spec.editorial).toBe('bold');
      expect(spec.composition).toBe('asymmetric');
    });
  });

  describe('normalizeDirectionSpec', () => {
    it('ids inválidos voltam para os defaults dos eixos', () => {
      const spec = normalizeDirectionSpec({ editorial: 'inexistente', imagery: 'xpto' } as any);
      expect(spec.editorial).toBe(defaultDirectionSpec.editorial);
      expect(spec.imagery).toBe(defaultDirectionSpec.imagery);
    });
  });

  describe('resolveDirectionFragments', () => {
    it('todo eixo resolve para um fragmento de prompt não-vazio', () => {
      const fragments = resolveDirectionFragments(defaultDirectionSpec);
      Object.values(fragments).forEach((fragment) => {
        expect(typeof fragment).toBe('string');
        expect(fragment.length).toBeGreaterThan(0);
      });
    });
  });

  describe('buildDirectionRenderSpec', () => {
    it('nunca ativa o caminho de inspirações', () => {
      const renderSpec = buildDirectionRenderSpec(defaultDirectionSpec, {
        brandColors: '#000, #FFF',
        brief: 'contexto da marca',
      });
      expect(renderSpec.hasInspirations).toBe(false);
      expect(renderSpec.inspirationsLeadVisual).toBe(false);
      expect(renderSpec.brandColors).toBe('#000, #FFF');
      expect(renderSpec.stylePrompt).toContain('editorial');
      expect(renderSpec.brief).toContain('contexto da marca');
    });
  });

  describe('summarizeDirection', () => {
    it('monta a frase legível com a plataforma capitalizada', () => {
      const summary = summarizeDirection(defaultDirectionSpec, 'linkedin');
      expect(summary.startsWith('Linkedin')).toBe(true);
      expect(summary).toContain('·');
    });
  });
});
