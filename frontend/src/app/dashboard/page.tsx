'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, BookOpen, Bell } from 'lucide-react';
import { api } from '@/lib/api';

interface Enrollment {
  id: string;
  progressPc: string;
  status: string;
  course: { title: string; slug: string; thumbnailUrl?: string };
}

interface Certificate {
  id: string;
  certificateNo: string;
  course: { title: string };
}

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
}

export default function DashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [enrRes, certRes, notifRes] = await Promise.all([
          api.get('/enrollments/me'),
          api.get('/certificates/me'),
          api.get('/notifications'),
        ]);
        setEnrollments(enrRes.data.data);
        setCertificates(certRes.data.data);
        setNotifications(notifRes.data.data);
      } catch (err: any) {
        if (err?.response?.status === 401) setAuthError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (authError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Please log in</h1>
        <p className="mt-3 text-gray-600">You need to be logged in to view your dashboard.</p>
        <Link href="/login" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">
          Log in
        </Link>
      </div>
    );
  }

  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((s, e) => s + Number(e.progressPc), 0) / enrollments.length)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
      <p className="mt-2 text-gray-600">Track your courses, progress, and certificates.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="My Courses" value={enrollments.length} />
        <Stat label="Certificates" value={certificates.length} />
        <Stat label="Avg. Progress" value={`${avgProgress}%`} />
        <Stat label="Notifications" value={notifications.filter((n) => !n.isRead).length} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <BookOpen size={18} /> My Courses
          </h2>
          {loading ? (
            <p className="mt-4 text-sm text-gray-400">Loading…</p>
          ) : enrollments.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              You haven&apos;t enrolled in any courses yet.{' '}
              <Link href="/courses" className="text-brand-600 hover:underline">Browse the catalog</Link>.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {enrollments.map((e) => (
                <Link
                  key={e.id}
                  href={`/courses/${e.course.slug}`}
                  className="block rounded-xl border border-gray-100 p-4 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{e.course.title}</p>
                    <span className="text-xs text-gray-500">{e.status}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-brand-600"
                      style={{ width: `${e.progressPc}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{Number(e.progressPc).toFixed(0)}% complete</p>
                </Link>
              ))}
            </div>
          )}

          <h2 className="mt-10 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Award size={18} /> Certificates
          </h2>
          {certificates.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Complete a course to earn your first certificate.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {certificates.map((c) => (
                <Link
                  key={c.id}
                  href={`/verify-certificate/${c.certificateNo}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm hover:shadow-sm"
                >
                  <span>{c.course.title}</span>
                  <span className="text-xs text-brand-600">{c.certificateNo}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Bell size={18} /> Notifications
          </h2>
          <div className="mt-4 space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500">You&apos;re all caught up.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`rounded-lg border p-3 text-sm ${n.isRead ? 'border-gray-100' : 'border-brand-200 bg-brand-50'}`}>
                  <p className="font-medium text-gray-900">{n.title}</p>
                  <p className="mt-1 text-xs text-gray-600">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
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
