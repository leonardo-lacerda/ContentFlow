import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CreativeKieController } from './creative-kie.controller';

// Regression test for the 2026-08-20 audit finding (same shape as the
// already-fixed Cakto webhook fail-open, cakto.service.ts): the signature
// check here used to be `if (expected && secret !== expected)`, which
// skipped verification ENTIRELY whenever CREATIVE_KIE_WEBHOOK_SECRET was
// unset — an unsigned request would be accepted. Now it must fail closed.
describe('CreativeKieController.callback', () => {
  const originalSecret = process.env.CREATIVE_KIE_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.CREATIVE_KIE_WEBHOOK_SECRET = originalSecret;
  });

  it('fails closed (503), not open, when no secret is configured at all', () => {
    delete process.env.CREATIVE_KIE_WEBHOOK_SECRET;
    const controller = new CreativeKieController();

    expect(() => controller.callback({ taskId: 't1' }, undefined)).toThrow(
      ServiceUnavailableException
    );
  });

  it('rejects a request with the wrong secret', () => {
    process.env.CREATIVE_KIE_WEBHOOK_SECRET = 'the-real-secret';
    const controller = new CreativeKieController();

    expect(() => controller.callback({ taskId: 't1' }, 'wrong')).toThrow(
      UnauthorizedException
    );
  });

  it('rejects a request with no secret header when one is configured', () => {
    process.env.CREATIVE_KIE_WEBHOOK_SECRET = 'the-real-secret';
    const controller = new CreativeKieController();

    expect(() => controller.callback({ taskId: 't1' }, undefined)).toThrow(
      UnauthorizedException
    );
  });

  it('accepts a request with the correct secret', () => {
    process.env.CREATIVE_KIE_WEBHOOK_SECRET = 'the-real-secret';
    const controller = new CreativeKieController();

    const result = controller.callback({ taskId: 't1' }, 'the-real-secret');
    expect(result).toEqual({ accepted: true, taskId: 't1' });
  });
});
