import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';

// NOWPayments signs IPN callbacks with HMAC-SHA512 over the payload's own
// keys sorted alphabetically (not the raw transmitted bytes) — this must
// match their algorithm exactly or every legitimate callback fails
// verification. See https://documenter.getpostman.com/view/7907941/2s93JusNJt
// ("IPN" section).
function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {} as Record<string, unknown>);
  }
  return value;
}

function safeEqualsHex(receivedHex: string, expected: Buffer): boolean {
  if (!receivedHex || !/^[a-f0-9]+$/i.test(receivedHex)) {
    return false;
  }
  const receivedBuffer = Buffer.from(receivedHex, 'hex');
  return (
    receivedBuffer.length === expected.length &&
    timingSafeEqual(receivedBuffer, expected)
  );
}

export interface ProcessPayment {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount: number;
  outcome_currency: string;
}

@Injectable()
export class Nowpayments {
  private readonly logger = new Logger(Nowpayments.name);

  constructor(private _subscriptionService: SubscriptionService) {}

  /**
   * The path-embedded JWT proves the callback URL was one we issued for
   * this specific order, but it does not prove NOWPayments sent the
   * request or that payment_status/amount/currency weren't tampered with
   * in transit — that URL can leak through browser history, proxy logs, or
   * a monitoring tool. Verify the provider's own HMAC signature too; fail
   * closed (reject) if the secret isn't configured or the signature is
   * missing/invalid, rather than silently trusting an unsigned callback.
   */
  private verifyIpnSignature(body: ProcessPayment, signature?: string): boolean {
    const secret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!secret) {
      this.logger.error(
        'NOWPAYMENTS_IPN_SECRET is not configured — rejecting IPN callback'
      );
      return false;
    }
    if (!signature) {
      return false;
    }
    const canonical = JSON.stringify(sortObjectKeys(body));
    const expected = createHmac('sha512', secret).update(canonical, 'utf8').digest();
    return safeEqualsHex(signature, expected);
  }

  async processPayment(
    path: string,
    body: ProcessPayment,
    signature?: string
  ) {
    const decrypt = AuthService.verifyJWT(path, 'payment') as any;
    if (!decrypt || !decrypt.order_id) {
      return;
    }

    if (!this.verifyIpnSignature(body, signature)) {
      this.logger.warn(
        `Rejected NOWPayments IPN callback with invalid/missing signature for order ${decrypt.order_id}`
      );
      return;
    }

    if (
      body.payment_status !== 'confirmed' &&
      body.payment_status !== 'finished'
    ) {
      return;
    }

    if (body.order_id !== decrypt.order_id) {
      return;
    }

    const [org, make] = body.order_id.split('_');
    await this._subscriptionService.lifeTime(org, make, 'PRO');
    return body;
  }

  async createPaymentPage(orgId: string) {
    const onlyId = makeId(5);
    const make = orgId + '_' + onlyId;
    const signRequest = AuthService.signJWT(
      { order_id: make },
      { type: 'payment', expiresIn: '2h' }
    );

    const { id, invoice_url } = await (
      await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
        },
        body: JSON.stringify({
          price_amount: process.env.NOWPAYMENTS_AMOUNT,
          price_currency: 'USD',
          order_id: make,
          pay_currency: 'SOL',
          order_description: 'Lifetime deal account for ContentFlow',
          ipn_callback_url:
            process.env.NEXT_PUBLIC_BACKEND_URL +
            `/public/crypto/${signRequest}`,
          success_url: process.env.FRONTEND_URL + `/launches?check=${onlyId}`,
          cancel_url: process.env.FRONTEND_URL,
        }),
      })
    ).json();

    return {
      id,
      invoice_url,
    };
  }
}
