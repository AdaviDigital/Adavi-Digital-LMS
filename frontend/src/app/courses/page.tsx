import Link from 'next/link';
import { Star, Users } from 'lucide-react';
import { api, CourseSummary } from '@/lib/api';

async function getCourses(): Promise<CourseSummary[]> {
  try {
    const res = await api.get('/courses', { params: { limit: 12 } });
    return res.data.items ?? [];
  } catch {
    // Backend not reachable at build/preview time — render an empty state gracefully.
    return [];
  }
}

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Course Catalog</h1>
      <p className="mt-2 text-gray-600">Search and filter from our full library of courses.</p>

      {courses.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          No courses to display yet. Once the backend API and database are running with seed data,
          published courses will appear here automatically.
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group overflow-hidden rounded-xl border border-gray-100 shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-video bg-gray-100" />
              <div className="p-4">
                <p className="text-xs font-semibold uppercase text-brand-600">
                  {course.category?.name}
                </p>
                <h3 className="mt-1 font-semibold text-gray-900 group-hover:text-brand-700">
                  {course.title}
                </h3>
                <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star size={14} className="fill-accent-500 text-accent-500" /> {course.avgRating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} /> {course.totalStudents}
                  </span>
                </div>
                <p className="mt-2 font-bold text-brand-700">
                  {course.isFree ? 'Free' : `₦${course.price}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
