import crypto from 'crypto';

// Set env vars before importing the module under test, since env.ts reads them at import time.
process.env.PAYSTACK_SECRET_KEY = 'test_paystack_secret';
process.env.STRIPE_WEBHOOK_SECRET = 'test_stripe_webhook_secret';
process.env.FLUTTERWAVE_WEBHOOK_HASH = 'test_flutterwave_hash';

// eslint-disable-next-line import/first
import { verifyWebhookSignature } from '../src/modules/payments/webhookVerification';

describe('verifyWebhookSignature — Paystack', () => {
  const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref_123' } }));

  it('accepts a correctly signed payload', () => {
    const signature = crypto.createHmac('sha512', 'test_paystack_secret').update(body).digest('hex');
    const result = verifyWebhookSignature('PAYSTACK', body, { 'x-paystack-signature': signature });
    expect(result).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const signature = crypto.createHmac('sha512', 'test_paystack_secret').update(body).digest('hex');
    const tamperedBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref_999' } }));
    // reuse the signature computed for the original body against a different body
    const result = verifyWebhookSignature('PAYSTACK', tamperedBody, { 'x-paystack-signature': signature });
    expect(result).toBe(false);
  });

  it('rejects a missing signature header', () => {
    const result = verifyWebhookSignature('PAYSTACK', body, {});
    expect(result).toBe(false);
  });
});

describe('verifyWebhookSignature — Stripe', () => {
  const body = Buffer.from(JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed' }));

  function stripeHeader(timestamp: number, payload: Buffer) {
    const signedPayload = `${timestamp}.${payload.toString('utf8')}`;
    const v1 = crypto.createHmac('sha256', 'test_stripe_webhook_secret').update(signedPayload).digest('hex');
    return `t=${timestamp},v1=${v1}`;
  }

  it('accepts a correctly signed, recent payload', () => {
    const header = stripeHeader(Math.floor(Date.now() / 1000), body);
    const result = verifyWebhookSignature('STRIPE', body, { 'stripe-signature': header });
    expect(result).toBe(true);
  });

  it('rejects a payload signed outside the tolerance window (replay protection)', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour old
    const header = stripeHeader(oldTimestamp, body);
    const result = verifyWebhookSignature('STRIPE', body, { 'stripe-signature': header });
    expect(result).toBe(false);
  });

  it('rejects a malformed signature header', () => {
    const result = verifyWebhookSignature('STRIPE', body, { 'stripe-signature': 'not-a-valid-header' });
    expect(result).toBe(false);
  });
});

describe('verifyWebhookSignature — Flutterwave', () => {
  const body = Buffer.from(JSON.stringify({ event: 'charge.completed' }));

  it('accepts a matching verif-hash header', () => {
    const result = verifyWebhookSignature('FLUTTERWAVE', body, { 'verif-hash': 'test_flutterwave_hash' });
    expect(result).toBe(true);
  });

  it('rejects a non-matching verif-hash header', () => {
    const result = verifyWebhookSignature('FLUTTERWAVE', body, { 'verif-hash': 'wrong_hash' });
    expect(result).toBe(false);
  });
});

describe('verifyWebhookSignature — unknown provider / missing body', () => {
  it('rejects an unknown provider', () => {
    const result = verifyWebhookSignature('DOGECOIN', Buffer.from('{}'), {});
    expect(result).toBe(false);
  });

  it('rejects when no raw body was captured', () => {
    const result = verifyWebhookSignature('PAYSTACK', undefined, { 'x-paystack-signature': 'anything' });
    expect(result).toBe(false);
  });
});
