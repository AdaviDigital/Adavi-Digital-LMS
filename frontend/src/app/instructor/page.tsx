'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Course {
  id: string;
  title: string;
  status: string;
  totalStudents: number;
  price: string;
  isFree: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Analytics {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: string | number;
  avgRating: number;
}

export default function InstructorDashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', categoryId: '', price: '0', isFree: true });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, catRes] = await Promise.all([
          api.get('/analytics/instructor/me'),
          api.get('/categories'),
        ]);
        setAnalytics(analyticsRes.data.data);
        setCategories(catRes.data.data);
      } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 403) setAuthError(true);
      }
    }
    load();
  }, []);

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const res = await api.post('/courses', {
        title: form.title,
        description: form.description,
        categoryId: form.categoryId,
        price: form.isFree ? 0 : parseFloat(form.price),
        isFree: form.isFree,
      });
      router.push(`/instructor/courses/${res.data.data.id}/builder`);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Could not create course.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Instructor access required</h1>
        <p className="mt-3 text-gray-600">Log in with an instructor account to view this dashboard.</p>
        <Link href="/login" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your courses, students, and earnings.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/instructor/courses"
            className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            My Courses
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : '+ New Course'}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="My Courses" value={analytics?.totalCourses ?? '—'} />
        <Stat label="Total Students" value={analytics?.totalStudents ?? '—'} />
        <Stat label="Total Revenue" value={analytics ? `₦${Number(analytics.totalRevenue).toLocaleString()}` : '—'} />
        <Stat label="Avg. Rating" value={analytics?.avgRating?.toFixed(1) ?? '—'} />
      </div>

      {showForm && (
        <form onSubmit={handleCreateCourse} className="mt-8 space-y-4 rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Create a new course</h2>
          <div>
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFree"
              checked={form.isFree}
              onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
            />
            <label htmlFor="isFree" className="text-sm text-gray-700">This course is free</label>
          </div>
          {!form.isFree && (
            <div>
              <label className="text-sm font-medium text-gray-700">Price (₦)</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create Course'}
          </button>
        </form>
      )}

      {message && <p className="mt-4 text-sm text-brand-700">{message}</p>}

      <div className="mt-10 rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
        Once a course is created, add modules, lessons, quizzes, and assignments via the API
        (<code>/api/v1/modules</code>, <code>/api/v1/lessons</code>, <code>/api/v1/quizzes</code>,{' '}
        <code>/api/v1/assignments</code>) — a full drag-and-drop course builder UI is the next
        iteration of this dashboard.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand-700">{value}</p>
    </div>
  );
}
