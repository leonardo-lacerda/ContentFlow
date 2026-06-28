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
