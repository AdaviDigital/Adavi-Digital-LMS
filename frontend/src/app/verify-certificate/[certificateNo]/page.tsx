import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export const metadata = { title: 'Verify Certificate' };

async function verify(certificateNo: string) {
  try {
    const res = await api.get(`/certificates/verify/${certificateNo}`);
    return res.data.data;
  } catch {
    return null;
  }
}

export default async function VerifyCertificatePage({ params }: { params: { certificateNo: string } }) {
  const result = await verify(params.certificateNo);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      {result?.valid ? (
        <>
          <CheckCircle2 className="mx-auto text-green-600" size={56} />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Certificate Verified</h1>
          <p className="mt-2 text-gray-600">
            {result.certificate.student?.profile?.firstName} {result.certificate.student?.profile?.lastName}{' '}
            successfully completed <strong>{result.certificate.course?.title}</strong>.
          </p>
          <p className="mt-4 text-sm text-gray-400">Certificate ID: {params.certificateNo}</p>
        </>
      ) : (
        <>
          <XCircle className="mx-auto text-red-600" size={56} />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Certificate Not Found</h1>
          <p className="mt-2 text-gray-600">
            We couldn&apos;t verify certificate <code>{params.certificateNo}</code>. Please check the ID and
            try again.
          </p>
        </>
      )}
    </div>
  );
}
