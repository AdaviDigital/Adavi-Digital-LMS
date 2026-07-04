import { api } from '@/lib/api';

export const metadata = { title: 'FAQ' };

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

async function getFaqs(): Promise<FaqItem[]> {
  try {
    const res = await api.get('/faq');
    return res.data.data ?? [];
  } catch {
    return [];
  }
}

export default async function FaqPage() {
  const faqs = await getFaqs();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>

      {faqs.length === 0 ? (
        <p className="mt-8 text-gray-500">
          FAQ content will appear here once populated via the admin panel (<code>/api/v1/faq</code>).
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {faqs.map((faq) => (
            <details key={faq.id} className="rounded-lg border border-gray-200 p-4">
              <summary className="cursor-pointer font-semibold text-gray-900">{faq.question}</summary>
              <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
