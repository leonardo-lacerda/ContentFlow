import { Body, Controller, Headers, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Controller('/creative/providers/kie')
export class CreativeKieController {
  @Post('/callback')
  callback(@Body() body: Record<string, unknown>, @Headers('x-kie-webhook-secret') secret?: string) {
    const expected = process.env.CREATIVE_KIE_WEBHOOK_SECRET;
    // Fail closed rather than fail open: the previous `if (expected && ...)`
    // skipped the check entirely whenever the secret was unset — the exact
    // fail-open shape a prior audit already flagged and fixed for the Cakto
    // webhook (cakto.service.ts). This callback is currently a no-op (see
    // comment below), so today an unsigned request can't grant anything;
    // this closes the gap before any real side effect gets wired to it.
    if (!expected) {
      throw new ServiceUnavailableException('Kie webhook is not configured');
    }
    const provided = Buffer.from(secret || '', 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const valid =
      provided.length === expectedBuf.length &&
      timingSafeEqual(provided, expectedBuf);
    if (!valid) throw new UnauthorizedException('Invalid Kie webhook secret');
    const data = body?.data && typeof body.data === 'object'
      ? body.data as Record<string, unknown>
      : undefined;

    // Generation still uses polling as the source of truth. The callback is acknowledged
    // so Kie can stop retrying, while task completion remains idempotent in the engine.
    return {
      accepted: true,
      taskId: body?.taskId || body?.task_id || data?.taskId || data?.task_id || null,
    };
  }
}
