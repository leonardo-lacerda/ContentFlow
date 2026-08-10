import {
  Controller,
  HttpException,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { CaktoService } from '@gitroom/nestjs-libraries/services/cakto.service';
import { BillingStripeService } from '@gitroom/nestjs-libraries/services/billing-stripe.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Stripe')
@Controller('/stripe')
export class StripeController {
  constructor(
    private readonly _stripeService: StripeService,
    private readonly _caktoService: CaktoService,
    private readonly _billingStripeService: BillingStripeService
  ) {}

  @Post('/')
  async stripe(@Req() req: RawBodyRequest<Request>) {
    const event = this._stripeService.validateRequest(
      req.rawBody,
      // @ts-ignore
      req.headers['stripe-signature'],
      process.env.STRIPE_SIGNING_KEY
    );

    if (await this._billingStripeService.isBillingV2Event(event)) {
      return this._billingStripeService.handleWebhook(event);
    }

    // Maybe it comes from another stripe webhook
    if (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      event?.data?.object?.metadata?.service !== 'gitroom' &&
      event.type !== 'invoice.payment_succeeded'
    ) {
      return { ok: true };
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          return this._stripeService.paymentSucceeded(event);
        case 'customer.subscription.created':
          return this._stripeService.createSubscription(event);
        case 'customer.subscription.updated':
          return this._stripeService.updateSubscription(event);
        case 'customer.subscription.deleted':
          return this._stripeService.deleteSubscription(event);
        default:
          return { ok: true };
      }
    } catch (e) {
      throw new HttpException({ msg: 'Webhook processing failed' }, 500);
    }
  }

  @Post('/cakto')
  cakto(@Req() req: RawBodyRequest<Request>) {
    const rawBody = Buffer.isBuffer(req.rawBody)
      ? req.rawBody.toString('utf8')
      : JSON.stringify(req.body || {});

    // @ts-ignore
    if (!this._caktoService.validateWebhook(rawBody, req.headers)) {
      throw new HttpException('Invalid Cakto webhook signature', 403);
    }

    const event = this._caktoService.parseWebhook(rawBody);
    if (!event) {
      return { ok: true, ignored: true };
    }

    return this._caktoService.processWebhook(event);
  }
}
