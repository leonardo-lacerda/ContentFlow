import { NotFoundException } from '@nestjs/common';
import { CreativeFeatureFlagGuard } from './creative-feature-flag.guard';

describe('CreativeFeatureFlagGuard', () => {
  const previous = process.env.CREATIVE_ENGINE_ENABLED;

  afterEach(() => {
    if (previous === undefined) delete process.env.CREATIVE_ENGINE_ENABLED;
    else process.env.CREATIVE_ENGINE_ENABLED = previous;
  });

  it('allows the engine by default', () => {
    delete process.env.CREATIVE_ENGINE_ENABLED;
    expect(new CreativeFeatureFlagGuard().canActivate()).toBe(true);
  });

  it('hides the engine when explicitly disabled', () => {
    process.env.CREATIVE_ENGINE_ENABLED = 'false';
    expect(() => new CreativeFeatureFlagGuard().canActivate()).toThrow(NotFoundException);
  });
});
