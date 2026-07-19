import { UseGuards, Body, Controller, Get, Post, Req } from '@nestjs/common';
import { V1SurfaceGuard } from '@gitroom/backend/services/auth/v1-surface.guard';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { AffiliateService } from '@gitroom/nestjs-libraries/database/prisma/affiliates/affiliate.service';

@ApiTags('Affiliates')
@UseGuards(V1SurfaceGuard)
@Controller('/affiliates')
export class AffiliatesController {
  constructor(private readonly _affiliateService: AffiliateService) {}

  @Post('/register')
  async register(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { name: string; email: string },
  ) {
    return this._affiliateService.register(org.id, body);
  }

  @Get('/me')
  async getAffiliate(@GetOrgFromRequest() org: Organization) {
    return this._affiliateService.getAffiliate(org.id);
  }

  @Get('/stats')
  async getStats(@GetOrgFromRequest() org: Organization) {
    return this._affiliateService.getStats(org.id);
  }

  @Post('/track/:code')
  async trackClick(
    @Req() req: Request,
    @Body() body: { code: string },
  ) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this._affiliateService.trackClick(body.code, String(ip), userAgent);
  }
}
