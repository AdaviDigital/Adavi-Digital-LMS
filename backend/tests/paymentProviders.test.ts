import { getPaymentAdapter } from '../src/modules/payments/providers';

describe('getPaymentAdapter', () => {
  it('resolves the Paystack adapter', () => {
    expect(getPaymentAdapter('PAYSTACK').name).toBe('PAYSTACK');
  });

  it('resolves the Flutterwave adapter', () => {
    expect(getPaymentAdapter('FLUTTERWAVE').name).toBe('FLUTTERWAVE');
  });

  it('resolves the Stripe adapter', () => {
    expect(getPaymentAdapter('STRIPE').name).toBe('STRIPE');
  });

  it('resolves the PayPal adapter', () => {
    expect(getPaymentAdapter('PAYPAL').name).toBe('PAYPAL');
  });

  it('throws AppError for an unsupported provider', () => {
    expect(() => getPaymentAdapter('DOGECOIN')).toThrow(/Unsupported payment provider/);
  });
});
