import Link from 'next/link';
import { ArrowRight, BadgeCheck, BrainCircuit, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              Learn in-demand skills with AI-powered guidance
            </h1>
            <p className="mt-6 text-lg text-brand-50">
              Adavi Digital Institute delivers professional, certified courses built for learners
              across Nigeria and the world — with an AI tutor by your side every step of the way.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/courses"
                className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50"
              >
                Browse Courses <ArrowRight size={18} />
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
              >
                Start Learning Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Why learn with us</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <Feature
            icon={<BrainCircuit className="text-brand-600" size={28} />}
            title="AI Chat Tutor"
            desc="Get instant answers, lesson summaries, and personalized recommendations powered by AI."
          />
          <Feature
            icon={<BadgeCheck className="text-brand-600" size={28} />}
            title="Verified Certificates"
            desc="Earn QR-verifiable certificates recognized by employers across Nigeria and beyond."
          />
          <Feature
            icon={<ShieldCheck className="text-brand-600" size={28} />}
            title="Secure & Reliable"
            desc="Bank-grade security, multiple payment options, and 24/7 platform availability."
          />
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">Ready to start your journey?</h2>
          <p className="mt-4 text-gray-600">Join thousands of learners building their future today.</p>
          <Link
            href="/courses"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Explore Course Catalog <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-6 shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{desc}</p>
    </div>
  );
}
