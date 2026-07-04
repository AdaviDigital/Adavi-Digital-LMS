export const metadata = { title: 'Blog' };

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
      <p className="mt-4 text-gray-600">
        Articles, learning tips, and updates from Adavi Digital Institute. Once connected to the
        backend `/api/v1/blog` endpoint (Phase 2), published posts render here automatically.
      </p>
    </div>
  );
}
