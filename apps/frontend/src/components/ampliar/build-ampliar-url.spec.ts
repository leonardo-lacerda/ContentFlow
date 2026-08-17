import { buildAmpliarUrl } from './build-ampliar-url';
import { buildAdsAiPaths, buildEmailAiPaths, buildVideoAiPaths } from './ampliar-ai-presets';
import type { AmpliarPrefill } from './ampliar.types';

describe('buildAmpliarUrl', () => {
  it('builds ads path with idea handoff', () => {
    const url = buildAmpliarUrl('ads', {
      from: 'swipe',
      brandId: 'b1',
      ideaId: 'i1',
      topic: 'Hook teste',
      goal: 'educar',
    });
    expect(url.startsWith('/ads?')).toBe(true);
    expect(url).toContain('ideaId=i1');
    expect(url).toContain('brandId=b1');
    expect(url).toContain('from=swipe');
    // Parse the query semantically rather than string-matching: URLSearchParams
    // encodes spaces as '+' (form-urlencoding), which decodeURIComponent does not
    // turn back into a space — only .get() does. Assert on the decoded value.
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('topic')).toBe('Hook teste');
  });

  it('builds email and video canonical paths', () => {
    expect(buildAmpliarUrl('email', {})).toBe('/email');
    expect(buildAmpliarUrl('video', { projectId: 'p1' })).toContain(
      '/video?projectId=p1'
    );
  });
});

describe('ampliar AI presets', () => {
  const prefill: AmpliarPrefill = {
    hasSource: true,
    topic: 'Sucesso do cliente',
    hook: 'Clientes felizes geram receita',
    goal: 'educar',
    ideaId: 'idea-1',
    brandId: 'brand-1',
  };

  it('recommends an ads path', () => {
    const paths = buildAdsAiPaths(prefill, { website: 'https://ex.com' });
    expect(paths.length).toBeGreaterThanOrEqual(3);
    expect(paths.some((p) => p.recommended)).toBe(true);
    expect(paths[0].payload).toHaveProperty('platforms');
  });

  it('recommends welcome or promo for email', () => {
    const paths = buildEmailAiPaths(prefill);
    expect(paths.some((p) => p.id === 'email-welcome')).toBe(true);
    expect(paths.some((p) => p.id === 'email-promo' && p.recommended)).toBe(
      true
    );
  });

  it('recommends reels 30s for video', () => {
    const paths = buildVideoAiPaths(prefill);
    const reels = paths.find((p) => p.id === 'video-reels-30');
    expect(reels?.recommended).toBe(true);
    expect(reels?.payload.maxDuration).toBe(30);
  });
});
