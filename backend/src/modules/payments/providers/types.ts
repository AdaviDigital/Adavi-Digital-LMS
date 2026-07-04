/**
 * Every payment gateway (Paystack, Flutterwave, Stripe, PayPal, Google Pay) implements this
 * interface. Swapping or adding a gateway never touches the orders/payments business logic —
 * only a new adapter file + one line in the registry (./index.ts).
 */
export interface InitPaymentInput {
  reference: string;
  amountKobo: number; // amount in the smallest currency unit (kobo/cents)
  currency: string;
  email: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitPaymentResult {
  authorizationUrl: string; // URL to redirect the user to complete payment
  providerReference: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  providerReference: string;
  amountKobo: number;
  currency: string;
  raw: unknown;
}

export interface PaymentProviderAdapter {
  name: 'PAYSTACK' | 'FLUTTERWAVE' | 'STRIPE' | 'PAYPAL' | 'GOOGLE_PAY';
  initialize(input: InitPaymentInput): Promise<InitPaymentResult>;
  verify(providerReference: string): Promise<VerifyPaymentResult>;
}
