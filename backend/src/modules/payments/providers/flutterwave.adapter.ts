import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { InitPaymentInput, InitPaymentResult, PaymentProviderAdapter, VerifyPaymentResult } from './types';

const BASE_URL = 'https://api.flutterwave.com/v3';

export const flutterwaveAdapter: PaymentProviderAdapter = {
  name: 'FLUTTERWAVE',

  async initialize(input: InitPaymentInput): Promise<InitPaymentResult> {
    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amountKobo / 100,
        currency: input.currency,
        redirect_url: input.callbackUrl,
        customer: { email: input.email },
        meta: input.metadata,
      }),
    });
    const data: any = await res.json();
    if (!res.ok || data.status !== 'success') {
      throw new AppError(502, `Flutterwave initialization failed: ${data.message || res.statusText}`);
    }
    return { authorizationUrl: data.data.link, providerReference: input.reference };
  },

  async verify(providerReference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(
      `${BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerReference)}`,
      { headers: { Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}` } },
    );
    const data: any = await res.json();
    if (!res.ok) throw new AppError(502, `Flutterwave verification failed: ${res.statusText}`);

    return {
      success: data.data?.status === 'successful',
      providerReference,
      amountKobo: Math.round((data.data?.amount ?? 0) * 100),
      currency: data.data?.currency ?? 'NGN',
      raw: data,
    };
  },
};
