import { PaymentProviderAdapter } from './types';
import { paystackAdapter } from './paystack.adapter';
import { flutterwaveAdapter } from './flutterwave.adapter';
import { stripeAdapter } from './stripe.adapter';
import { paypalAdapter } from './paypal.adapter';
import { AppError } from '../../../utils/AppError';

const registry: Record<string, PaymentProviderAdapter> = {
  PAYSTACK: paystackAdapter,
  FLUTTERWAVE: flutterwaveAdapter,
  STRIPE: stripeAdapter,
  PAYPAL: paypalAdapter,
};

export function getPaymentAdapter(provider: string): PaymentProviderAdapter {
  const adapter = registry[provider];
  if (!adapter) throw new AppError(400, `Unsupported payment provider: ${provider}`);
  return adapter;
}

export * from './types';
