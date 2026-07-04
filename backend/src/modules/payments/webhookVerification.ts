import crypto from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * Every gateway signs its webhook payload differently. Verification MUST run against the raw
 * request bytes (not the parsed-then-reserialized JSON object) or the signature will not match —
 * this is why app.ts stashes `req.rawBody` in the express.json() `verify` callback.
 *
 * Returns false (never throws) so callers can uniformly reject with 401 regardless of which
 * gateway or failure mode was involved.
 */

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyPaystackSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  return timingSafeEqualStrings(expected, signatureHeader);
}

function verifyFlutterwaveSignature(signatureHeader: string | undefined): boolean {
  // Flutterwave's webhook scheme is a static shared secret hash comparison (`verif-hash` header),
  // not an HMAC of the body — set FLUTTERWAVE_WEBHOOK_HASH to the same value configured in the
  // Flutterwave dashboard's webhook settings.
  if (!signatureHeader || !env.FLUTTERWAVE_WEBHOOK_HASH) return false;
  return timingSafeEqualStrings(env.FLUTTERWAVE_WEBHOOK_HASH, signatureHeader);
}

function verifyStripeSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !env.STRIPE_WEBHOOK_SECRET) return false;

  // Header format: "t=<timestamp>,v1=<signature>[,v0=<signature>]"
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  // Reject replays of old webhook deliveries beyond a 5-minute tolerance window.
  const toleranceSeconds = 300;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    logger.warn('Stripe webhook rejected — timestamp outside tolerance window', { age });
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(signedPayload).digest('hex');
  return timingSafeEqualStrings(expected, v1);
}

export function verifyWebhookSignature(
  provider: string,
  rawBody: Buffer | undefined,
  headers: Record<string, string | string[] | undefined>,
): boolean {
  if (!rawBody) {
    logger.error('Webhook verification failed — no raw body captured', { provider });
    return false;
  }

  const header = (name: string) => {
    const value = headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  switch (provider.toUpperCase()) {
    case 'PAYSTACK':
      return verifyPaystackSignature(rawBody, header('x-paystack-signature'));
    case 'FLUTTERWAVE':
      return verifyFlutterwaveSignature(header('verif-hash'));
    case 'STRIPE':
      return verifyStripeSignature(rawBody, header('stripe-signature'));
    case 'PAYPAL':
      // PayPal's verification requires an API round-trip (POST to
      // /v1/notifications/verify-webhook-signature with the transmission headers and your
      // configured PAYPAL_WEBHOOK_ID) rather than a local HMAC check. Not yet implemented —
      // tracked as a known gap; see docs/DEPLOYMENT-RENDER.md "Known follow-ups".
      logger.warn('PayPal webhook signature verification is not implemented — payload trusted as-is', {
        provider,
      });
      return env.PAYPAL_WEBHOOK_ID.length > 0; // require at least explicit opt-in configuration
    default:
      logger.error('Webhook verification failed — unknown provider', { provider });
      return false;
  }
}
