import Link from 'next/link';
import { PlayCircle, Star, Users, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import EnrollButton from './EnrollButton';

async function getCourse(slug: string) {
  try {
    const res = await api.get(`/courses/${slug}`);
    return res.data.data;
  } catch {
    return null;
  }
}

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const course = await getCourse(params.slug);

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900">Course not found</h1>
        <p className="mt-4 text-gray-600">
          This course may be unpublished, or the backend/database isn&apos;t running yet. Slug requested:{' '}
          <code className="rounded bg-gray-100 px-2 py-1">{params.slug}</code>
        </p>
        <Link href="/courses" className="mt-6 inline-block text-brand-600 hover:underline">
          ← Back to catalog
        </Link>
      </div>
    );
  }

  const totalLessons = course.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length ?? 0), 0) ?? 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
      <div className="lg:col-span-2">
        <p className="text-sm font-semibold uppercase text-brand-600">{course.category?.name}</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">{course.title}</h1>
        <p className="mt-4 text-gray-600">{course.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Star size={14} className="fill-accent-500 text-accent-500" /> {course.avgRating} rating
          </span>
          <span className="flex items-center gap-1"><Users size={14} /> {course.totalStudents} students</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {totalLessons} lessons</span>
          <span>{course.level.replace('_', ' ')}</span>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          Instructor: <span className="font-medium text-gray-900">
            {course.instructor?.profile?.firstName} {course.instructor?.profile?.lastName}
          </span>
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">Course Content</h2>
        <div className="mt-4 space-y-3">
          {course.modules?.map((mod: any) => (
            <div key={mod.id} className="rounded-xl border border-gray-100">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 font-semibold text-gray-900">
                {mod.title}
              </div>
              <ul className="divide-y divide-gray-100">
                {mod.lessons?.map((lesson: any) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/courses/${params.slug}/learn/${lesson.id}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <PlayCircle size={16} className="text-brand-600" />
                      {lesson.title}
                      {lesson.isPreview && (
                        <span className="ml-auto rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700">Preview</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {course.reviews?.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900">Student Reviews</h2>
            <div className="mt-4 space-y-4">
              {course.reviews.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {r.student?.profile?.firstName} {r.student?.profile?.lastName} · {r.rating}★
                  </p>
                  {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="aspect-video rounded-lg bg-gray-100" />
        <p className="mt-4 text-2xl font-bold text-brand-700">
          {course.isFree ? 'Free' : `₦${Number(course.price).toLocaleString()}`}
        </p>
        <EnrollButton courseId={course.id} courseSlug={params.slug} isFree={course.isFree} />
        {course.certificateOn && (
          <p className="mt-4 text-center text-xs text-gray-500">Includes a verified certificate on completion</p>
        )}
      </aside>
    </div>
  );
}
