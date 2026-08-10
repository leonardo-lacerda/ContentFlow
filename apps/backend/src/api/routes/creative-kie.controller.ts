import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';

@Controller('/creative/providers/kie')
export class CreativeKieController {
  @Post('/callback')
  callback(@Body() body: Record<string, unknown>, @Headers('x-kie-webhook-secret') secret?: string) {
    const expected = process.env.CREATIVE_KIE_WEBHOOK_SECRET;
    if (expected && secret !== expected) throw new UnauthorizedException('Invalid Kie webhook secret');
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
