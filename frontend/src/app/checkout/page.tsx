'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const GATEWAYS = [
  { id: 'PAYSTACK', label: 'Paystack' },
  { id: 'FLUTTERWAVE', label: 'Flutterwave' },
  { id: 'STRIPE', label: 'Stripe' },
  { id: 'PAYPAL', label: 'PayPal' },
] as const;

function CheckoutForm() {
  const params = useSearchParams();
  const orderId = params.get('orderId') || '';
  const [provider, setProvider] = useState<(typeof GATEWAYS)[number]['id']>('PAYSTACK');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/payments/initiate', { orderId, provider, installments: 1 });
      window.location.href = res.data.data.authorizationUrl;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Complete your purchase</h1>
      <p className="mt-2 text-sm text-gray-600">Choose a payment method to finish enrolling.</p>

      <div className="mt-8 space-y-3">
        {GATEWAYS.map((g) => (
          <label
            key={g.id}
            className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 ${
              provider === g.id ? 'border-brand-600 bg-brand-50' : 'border-gray-200'
            }`}
          >
            <span className="font-medium text-gray-800">{g.label}</span>
            <input
              type="radio"
              name="provider"
              checked={provider === g.id}
              onChange={() => setProvider(g.id)}
            />
          </label>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={handlePay}
        disabled={loading || !orderId}
        className="mt-8 w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'Redirecting…' : 'Pay Now'}
      </button>

      {!orderId && (
        <p className="mt-3 text-center text-xs text-gray-400">
          No order reference found. Start checkout from a course page.
        </p>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}
