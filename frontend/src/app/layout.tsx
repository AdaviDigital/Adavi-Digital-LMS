import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: {
    default: 'Adavi Digital Institute | Online Learning, Reimagined',
    template: '%s | Adavi Digital Institute',
  },
  description:
    'AI-powered Learning Management System offering professional courses, certification, and mentorship for learners in Nigeria and worldwide.',
  metadataBase: new URL('https://adavidigitalinstitute.com'),
  openGraph: {
    title: 'Adavi Digital Institute',
    description: 'AI-powered online learning platform.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
