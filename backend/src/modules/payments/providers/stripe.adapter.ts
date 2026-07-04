import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { InitPaymentInput, InitPaymentResult, PaymentProviderAdapter, VerifyPaymentResult } from './types';

const BASE_URL = 'https://api.stripe.com/v1';

function formBody(params: Record<string, string>) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

export const stripeAdapter: PaymentProviderAdapter = {
  name: 'STRIPE',

  async initialize(input: InitPaymentInput): Promise<InitPaymentResult> {
    const res = await fetch(`${BASE_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody({
        mode: 'payment',
        success_url: `${input.callbackUrl}?reference=${input.reference}`,
        cancel_url: input.callbackUrl,
        customer_email: input.email,
        'line_items[0][price_data][currency]': input.currency.toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(input.amountKobo),
        'line_items[0][price_data][product_data][name]': 'Adavi Digital Institute course order',
        'line_items[0][quantity]': '1',
        'client_reference_id': input.reference,
      }),
    });
    const data: any = await res.json();
    if (!res.ok) throw new AppError(502, `Stripe initialization failed: ${data.error?.message || res.statusText}`);
    return { authorizationUrl: data.url, providerReference: data.id };
  },

  async verify(providerReference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(`${BASE_URL}/checkout/sessions/${providerReference}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    const data: any = await res.json();
    if (!res.ok) throw new AppError(502, `Stripe verification failed: ${res.statusText}`);

    return {
      success: data.payment_status === 'paid',
      providerReference,
      amountKobo: data.amount_total ?? 0,
      currency: (data.currency ?? 'usd').toUpperCase(),
      raw: data,
    };
  },
};
