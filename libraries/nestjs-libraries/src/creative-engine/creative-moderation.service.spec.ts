import { BadRequestException } from '@nestjs/common';
import { CreativeModerationService } from './creative-moderation.service';

describe('CreativeModerationService', () => {
  const service = new CreativeModerationService();

  it('allows ordinary commercial copy', () => {
    expect(service.inspect('Mostre o produto e o benefício principal')).toEqual({
      allowed: true,
      flags: [],
      requiresReview: false,
    });
  });

  it('blocks unsafe impersonation requests', () => {
    expect(() => service.assertAllowed('clone a real person without consent')).toThrow(
      BadRequestException,
    );
  });

  it('routes regulated claims to review', () => {
    expect(service.inspect('garantia de cura para a doença')).toMatchObject({
      allowed: true,
      requiresReview: true,
    });
  });

  it('does not generate regulated claims without an explicit review override', () => {
    const previous = process.env.CREATIVE_ALLOW_REGULATED_CLAIMS;
    delete process.env.CREATIVE_ALLOW_REGULATED_CLAIMS;
    expect(() => service.assertAllowed('garantia de cura para a doenÃ§a')).toThrow(BadRequestException);
    if (previous === undefined) delete process.env.CREATIVE_ALLOW_REGULATED_CLAIMS;
    else process.env.CREATIVE_ALLOW_REGULATED_CLAIMS = previous;
  });
});
