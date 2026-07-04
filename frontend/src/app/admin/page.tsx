'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface PlatformStats {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completionRate: number;
  totalRevenue: string | number;
}

interface PendingCourse {
  id: string;
  title: string;
  instructor: { profile?: { firstName: string; lastName: string } };
}

interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  profile?: { firstName: string; lastName: string };
}

export default function AdminPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [pending, setPending] = useState<PendingCourse[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [authError, setAuthError] = useState(false);

  async function loadAll() {
    try {
      const [statsRes, pendingRes, usersRes] = await Promise.all([
        api.get('/analytics/platform'),
        api.get('/admin/courses/pending'),
        api.get('/admin/users', { params: { limit: 10 } }),
      ]);
      setStats(statsRes.data.data);
      setPending(pendingRes.data.data);
      setUsers(usersRes.data.items);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) setAuthError(true);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function approve(courseId: string) {
    await api.post(`/admin/courses/${courseId}/approve`);
    loadAll();
  }

  async function reject(courseId: string) {
    await api.post(`/admin/courses/${courseId}/reject`, { reason: 'Does not meet quality guidelines' });
    loadAll();
  }

  async function toggleActive(userId: string, isActive: boolean) {
    await api.patch(`/admin/users/${userId}/status`, { isActive: !isActive });
    loadAll();
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Admin access required</h1>
        <p className="mt-3 text-gray-600">Log in with an admin account to view this panel.</p>
        <Link href="/login" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
      <p className="mt-2 text-gray-600">Platform-wide oversight and controls.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Users" value={stats?.totalUsers ?? '—'} />
        <Stat label="Published Courses" value={stats?.publishedCourses ?? '—'} />
        <Stat label="Total Enrollments" value={stats?.totalEnrollments ?? '—'} />
        <Stat label="Total Revenue" value={stats ? `₦${Number(stats.totalRevenue).toLocaleString()}` : '—'} />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-900">Pending Course Approvals</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No courses awaiting review.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {pending.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                <div>
                  <p className="font-medium text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-500">
                    by {c.instructor?.profile?.firstName} {c.instructor?.profile?.lastName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(c.id)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
                    Approve
                  </button>
                  <button onClick={() => reject(c.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-900">Users</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.profile?.firstName} {u.profile?.lastName}</td>
                  <td className="px-4 py-2 text-gray-500">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2">
                    <span className={u.isActive ? 'text-green-600' : 'text-red-600'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(u.id, u.isActive)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
