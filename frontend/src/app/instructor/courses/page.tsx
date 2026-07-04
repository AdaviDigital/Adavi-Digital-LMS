'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Hammer, Eye } from 'lucide-react';
import { api } from '@/lib/api';

interface Course {
  id: string;
  title: string;
  status: string;
  slug: string;
  isFree: boolean;
  price: string;
  modules: { id: string; lessons: { id: string }[] }[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/courses/mine');
        setCourses(res.data.data);
      } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 403) setAuthError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (authError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Instructor access required</h1>
        <p className="mt-3 text-gray-600">Log in with an instructor account to manage courses.</p>
        <Link href="/login" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="mt-2 text-gray-600">Manage curriculum, or check approval status.</p>
        </div>
        <Link href="/instructor" className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">
          + New Course
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-gray-400">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          You haven&apos;t created any courses yet.{' '}
          <Link href="/instructor" className="text-brand-600 hover:underline">Create your first course</Link>.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {courses.map((c) => {
            const lessonCount = c.modules.reduce((sum, m) => sum + m.lessons.length, 0);
            return (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{c.title}</p>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {c.modules.length} module{c.modules.length !== 1 && 's'} · {lessonCount} lesson{lessonCount !== 1 && 's'} ·{' '}
                    {c.isFree ? 'Free' : `₦${Number(c.price).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex gap-3">
                  {c.status === 'PUBLISHED' && (
                    <Link
                      href={`/courses/${c.slug}`}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600"
                    >
                      <Eye size={14} /> View
                    </Link>
                  )}
                  <Link
                    href={`/instructor/courses/${c.id}/builder`}
                    className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
                  >
                    <Hammer size={14} /> Edit curriculum
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
