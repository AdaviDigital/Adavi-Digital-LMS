'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function EnrollButton({
  courseId,
  courseSlug,
  isFree,
}: {
  courseId: string;
  courseSlug: string;
  isFree: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      if (isFree) {
        await api.post('/enrollments', { courseId });
        router.push(`/courses/${courseSlug}`);
      } else {
        const orderRes = await api.post('/orders', { courseIds: [courseId] });
        router.push(`/checkout?orderId=${orderRes.data.data.id}`);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;
      if (err?.response?.status === 401) {
        router.push('/login');
        return;
      }
      setError(message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'Please wait…' : isFree ? 'Enroll for Free' : 'Buy Now'}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
