import { UseGuards,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { V1SurfaceGuard } from '@gitroom/backend/services/auth/v1-surface.guard';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  OnlyURL, UpdateDto, WebhooksDto
} from '@gitroom/nestjs-libraries/dtos/webhooks/webhooks.dto';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';

@ApiTags('Webhooks')
@UseGuards(V1SurfaceGuard)
@Controller('/webhooks')
export class WebhookController {
  constructor(private _webhooksService: WebhooksService) {}

  @Get('/')
  async getStatistics(@GetOrgFromRequest() org: Organization) {
    return this._webhooksService.getWebhooks(org.id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.WEBHOOKS])
  async createAWebhook(
    @GetOrgFromRequest() org: Organization,
    @Body() body: WebhooksDto
  ) {
    return this._webhooksService.createWebhook(org.id, body);
  }

  @Put('/')
  async updateWebhook(
    @GetOrgFromRequest() org: Organization,
    @Body() body: UpdateDto
  ) {
    return this._webhooksService.createWebhook(org.id, body);
  }

  @Delete('/:id')
  async deleteWebhook(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._webhooksService.deleteWebhook(org.id, id);
  }

  @Post('/send')
  async sendWebhook(@Body() body: any, @Query() query: OnlyURL) {
    try {
      // `query.url` is already validated at the DTO layer (@IsSafeWebhookUrl,
      // webhook.url.validator.ts — fail-closed DNS check blocking RFC1918/
      // CGNAT/link-local ranges). That check runs once, before this handler;
      // the actual connection needs its own guard too, or a DNS record that
      // resolves differently between validation and connect time (DNS
      // rebinding) reopens the same SSRF window. ssrfSafeDispatcher pins and
      // re-validates the resolved address at the socket, matching the
      // pattern already used for /public/stream, local.storage.ts and the
      // OAuth-connect webhook delivery in no.auth.integrations.controller.ts.
      await fetch(query.url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        // @ts-expect-error undici dispatcher is supported by the runtime fetch implementation.
        dispatcher: ssrfSafeDispatcher,
      });
    } catch (err) {
      /** sent **/
    }

    return { send: true };
  }
}
