import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { WebhookService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhook.service';

@ApiTags('Webhooks')
@Controller('/webhooks')
export class WebhooksController {
  constructor(private readonly _webhookService: WebhookService) {}

  @Post('/')
  async create(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { url: string; events: string[] },
  ) {
    return this._webhookService.createWebhook(org.id, body);
  }

  @Get('/')
  async list(@GetOrgFromRequest() org: Organization) {
    return this._webhookService.listWebhooks(org.id);
  }

  @Get('/:id')
  async get(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this._webhookService.getWebhook(org.id, id);
  }

  @Patch('/:id')
  async update(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { url?: string; events?: string[]; status?: string },
  ) {
    return this._webhookService.updateWebhook(org.id, id, body);
  }

  @Delete('/:id')
  async delete(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this._webhookService.deleteWebhook(org.id, id);
  }
}
