import {
  estimateCreativeCredits,
  normalizeAspectRatio,
} from './creative-engine.types';

describe('creative-engine.types', () => {
  it('normalizes unsupported aspect ratios to the vertical default', () => {
    expect(normalizeAspectRatio('16:9')).toBe('16:9');
    expect(normalizeAspectRatio('unsupported')).toBe('9:16');
  });

  it('scales video credits by duration', () => {
    expect(
      estimateCreativeCredits('video-generation', {
        prompt: 'test',
        durationSec: 11,
      }),
    ).toBe(1600);
  });

  it('scales talking actor credits in fifteen-second blocks', () => {
    expect(
      estimateCreativeCredits('talking-actor', {
        prompt: 'test',
        durationSec: 16,
      }),
    ).toBe(650);
  });
});
