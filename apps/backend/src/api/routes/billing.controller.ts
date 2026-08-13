import { Body, Controller, Get, HttpException, Logger, Param, Post, Req, UseGuards } from '@nestjs/common';
import { V1SurfaceGuard } from '@gitroom/backend/services/auth/v1-surface.guard';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { CaktoService } from '@gitroom/nestjs-libraries/services/cakto.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { Request } from 'express';
import { Nowpayments } from '@gitroom/nestjs-libraries/crypto/nowpayments';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { BillingAccountingService } from '@gitroom/nestjs-libraries/services/billing-accounting.service';
import { BillingStripeService } from '@gitroom/nestjs-libraries/services/billing-stripe.service';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';
import { BillingEntitlementsService } from '@gitroom/nestjs-libraries/services/billing-entitlements.service';

@ApiTags('Billing')
@Controller('/billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private _subscriptionService: SubscriptionService,
    private _stripeService: StripeService,
    private _caktoService: CaktoService,
    private _notificationService: NotificationService,
    private _nowpayments: Nowpayments,
    private readonly _billingAccounting: BillingAccountingService,
    private readonly _billingStripe: BillingStripeService,
    private readonly _pricingCatalog: PricingCatalogService,
    private readonly _entitlements: BillingEntitlementsService,
  ) {}

  @Get('/plans')
  async plans() {
    if (process.env.BILLING_CREDITS_V2 !== 'false') {
      return {
        provider: 'stripe',
        billingPeriod: 'MONTHLY',
        plans: await this._billingAccounting.listPlans(),
        topups: await this._billingAccounting.listTopups(),
      };
    }
    return {
      provider: this._caktoService.isConfigured() ? 'cakto' : 'stripe',
      plans: this._caktoService.commercialPlans,
    };
  }

  @Get('/v2/plans')
  async billingPlansV2() {
    return {
      provider: 'stripe',
      billingPeriod: 'MONTHLY',
      plans: await this._billingAccounting.listPlans(),
      topups: await this._billingAccounting.listTopups(),
    };
  }

  @Get('/v2/pricing')
  billingPricingV2() {
    return this._pricingCatalog.list();
  }

  @Post('/v2/quote')
  billingQuoteV2(@Body() body: {
    capability?: string;
    operation?: string;
    model?: string;
    durationSec?: number;
    resolution?: string;
    hasInput?: boolean;
    provider?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this._pricingCatalog.quote(body as any);
  }

  @Get('/v2/account')
  async billingAccountV2(@GetOrgFromRequest() org: Organization) {
    const credits = await this._billingAccounting.getBalance(org.id);
    return {
      subscription: await this._billingAccounting.getSubscription(org.id),
      credits: {
        ...credits,
        available: credits.balance,
      },
      access: await this._entitlements.resolveAccess(org.id),
    };
  }

  @Get('/v2/credits')
  async billingCreditsV2(@GetOrgFromRequest() org: Organization) {
    return {
      balance: await this._billingAccounting.getBalance(org.id),
      usage: await this._billingAccounting.getUsage(org.id, 30),
      ledger: await this._billingAccounting.getLedger(org.id, 100),
    };
  }

  @Get('/v2/invoices')
  async billingInvoicesV2(@GetOrgFromRequest() org: Organization) {
    return this._billingAccounting.getInvoices(org.id);
  }

  @Post('/v2/checkout')
  billingCheckoutV2(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: { planCode: string; successUrl?: string; cancelUrl?: string }
  ) {
    return this._billingStripe.createSubscriptionCheckout({
      organizationId: org.id,
      userId: user.id,
      email: user.email,
      organizationName: org.name,
      planCode: body.planCode,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  @Post('/v2/topups/checkout')
  billingTopupCheckoutV2(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: { priceCode: string; successUrl?: string; cancelUrl?: string }
  ) {
    return this._billingStripe.createTopupCheckout({
      organizationId: org.id,
      userId: user.id,
      email: user.email,
      organizationName: org.name,
      priceCode: body.priceCode,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  @Post('/v2/change-plan')
  billingChangePlanV2(@GetOrgFromRequest() org: Organization, @Body() body: { planCode: string }) {
    return this._billingStripe.changePlan(org.id, body.planCode);
  }

  @Post('/v2/cancel')
  billingCancelV2(@GetOrgFromRequest() org: Organization) {
    return this._billingStripe.cancel(org.id);
  }

  @Get('/v2/portal')
  billingPortalV2(@GetOrgFromRequest() org: Organization) {
    return this._billingStripe.createPortal(org.id);
  }

  @Get('/check/:id')
  async checkId(
    @GetOrgFromRequest() org: Organization,
    @Param('id') body: string
  ) {
    return {
      status: await this._stripeService.checkSubscription(org.id, body),
    };
  }

  @Get('/check-discount')
  async checkDiscount(@GetOrgFromRequest() org: Organization) {
    return {
      offerCoupon: !(await this._stripeService.checkDiscount(org.paymentId))
        ? false
        : AuthService.signJWT({ discount: true }),
    };
  }

  @Post('/apply-discount')
  async applyDiscount(@GetOrgFromRequest() org: Organization) {
    await this._stripeService.applyDiscount(org.paymentId);
  }

  @Post('/finish-trial')
  async finishTrial(@GetOrgFromRequest() org: Organization) {
    try {
      await this._stripeService.finishTrial(org.paymentId);
    } catch (err) {
      this.logger.warn('Failed to finish trial', err);
    }
    return {
      finish: true,
    };
  }

  @Get('/is-trial-finished')
  async isTrialFinished(@GetOrgFromRequest() org: Organization) {
    return {
      finished: !org.isTrailing,
    };
  }

  @Post('/embedded')
  embedded(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BillingSubscribeDto,
    @Req() req: Request
  ) {
    const uniqueId = req?.cookies?.track;
    return this._stripeService.embedded(
      uniqueId,
      org.id,
      user.id,
      body,
      org.allowTrial
    );
  }

  @Post('/subscribe')
  subscribe(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BillingSubscribeDto,
    @Req() req: Request
  ) {
    const uniqueId = req?.cookies?.track;
    if (this._caktoService.isConfigured()) {
      return this._caktoService.subscribe(uniqueId, org, user, body);
    }
    return this._stripeService.subscribe(
      uniqueId,
      org.id,
      user.id,
      body,
      org.allowTrial
    );
  }

  @Get('/portal')
  async modifyPayment(@GetOrgFromRequest() org: Organization) {
    if (this._caktoService.isConfigured()) {
      return {
        portal: process.env.CAKTO_CUSTOMER_PORTAL_URL || '/billing',
      };
    }
    const customer = await this._stripeService.getCustomerByOrganizationId(
      org.id
    );
    const { url } = await this._stripeService.createBillingPortalLink(customer);
    return {
      portal: url,
    };
  }

  @Get('/')
  getCurrentBilling(@GetOrgFromRequest() org: Organization) {
    return this._subscriptionService.getSubscriptionByOrganizationId(org.id);
  }

  @Post('/cancel')
  async cancel(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: { feedback: string }
  ) {
    await this._notificationService.sendEmail(
      process.env.EMAIL_FROM_ADDRESS,
      'Subscription Cancelled',
      `Organization ${org.name} has cancelled their subscription because: ${body.feedback}`,
      user.email
    );

    if (this._caktoService.isConfigured()) {
      return this._caktoService.cancel(org);
    }

    return this._stripeService.setToCancel(org.id);
  }

  @Post('/prorate')
  prorate(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BillingSubscribeDto
  ) {
    return this._stripeService.prorate(org.id, body);
  }

  // ContentFlow v1: lifetime deal fora do ICP
  @UseGuards(V1SurfaceGuard)
  @Post('/lifetime')
  async lifetime(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { code: string }
  ) {
    return this._stripeService.lifetimeDeal(org.id, body.code);
  }

  // ContentFlow v1: crypto checkout fora do ICP
  @UseGuards(V1SurfaceGuard)
  @Get('/crypto')
  async crypto(@GetOrgFromRequest() org: Organization) {
    return this._nowpayments.createPaymentPage(org.id);
  }
}
