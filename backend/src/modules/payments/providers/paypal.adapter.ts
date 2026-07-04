import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { InitPaymentInput, InitPaymentResult, PaymentProviderAdapter, VerifyPaymentResult } from './types';

const BASE_URL = 'https://api-m.paypal.com'; // use api-m.sandbox.paypal.com for testing

async function getAccessToken(): Promise<string> {
  const basicAuth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data: any = await res.json();
  if (!res.ok) throw new AppError(502, 'PayPal authentication failed');
  return data.access_token;
}

export const paypalAdapter: PaymentProviderAdapter = {
  name: 'PAYPAL',

  async initialize(input: InitPaymentInput): Promise<InitPaymentResult> {
    const accessToken = await getAccessToken();
    const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: input.reference,
            amount: { currency_code: input.currency, value: (input.amountKobo / 100).toFixed(2) },
          },
        ],
        application_context: {
          return_url: input.callbackUrl,
          cancel_url: input.callbackUrl,
        },
      }),
    });
    const data: any = await res.json();
    if (!res.ok) throw new AppError(502, `PayPal initialization failed: ${data.message || res.statusText}`);

    const approveLink = data.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href;
    return { authorizationUrl: approveLink, providerReference: data.id };
  },

  async verify(providerReference: string): Promise<VerifyPaymentResult> {
    const accessToken = await getAccessToken();
    const res = await fetch(`${BASE_URL}/v2/checkout/orders/${providerReference}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: any = await res.json();
    if (!res.ok) throw new AppError(502, `PayPal verification failed: ${res.statusText}`);

    const unit = data.purchase_units?.[0];
    return {
      success: data.status === 'COMPLETED',
      providerReference,
      amountKobo: Math.round(parseFloat(unit?.amount?.value ?? '0') * 100),
      currency: unit?.amount?.currency_code ?? 'USD',
      raw: data,
    };
  },
};
