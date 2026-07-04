import { env } from '../../../config/env';
import { AppError } from '../../../utils/AppError';
import { InitPaymentInput, InitPaymentResult, PaymentProviderAdapter, VerifyPaymentResult } from './types';

const BASE_URL = 'https://api.paystack.co';

export const paystackAdapter: PaymentProviderAdapter = {
  name: 'PAYSTACK',

  async initialize(input: InitPaymentInput): Promise<InitPaymentResult> {
    const res = await fetch(`${BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });
    const data: any = await res.json();
    if (!res.ok || !data.status) {
      throw new AppError(502, `Paystack initialization failed: ${data.message || res.statusText}`);
    }
    return { authorizationUrl: data.data.authorization_url, providerReference: data.data.reference };
  },

  async verify(providerReference: string): Promise<VerifyPaymentResult> {
    const res = await fetch(`${BASE_URL}/transaction/verify/${providerReference}`, {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    });
    const data: any = await res.json();
    if (!res.ok) throw new AppError(502, `Paystack verification failed: ${res.statusText}`);

    return {
      success: data.data?.status === 'success',
      providerReference,
      amountKobo: data.data?.amount ?? 0,
      currency: data.data?.currency ?? 'NGN',
      raw: data,
    };
  },
};
