export const metadata = { title: 'Contact Us' };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">Contact Adavi Digital Institute</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <ul className="space-y-3 text-gray-700">
            <li><strong>Address:</strong> Ikorodu, Lagos, Nigeria</li>
            <li><strong>WhatsApp / Phone:</strong> +234 806 217 7435</li>
            <li><strong>Email:</strong> info@adavidigitalinstitute.com</li>
            <li><strong>Alt. Email:</strong> adavidigitalmediaconcepts@gmail.com</li>
            <li><strong>Office Hours:</strong> Mon–Fri, 9:00 AM – 6:00 PM (WAT)</li>
          </ul>

          <a
            href="https://wa.me/2348062177435"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
          >
            Chat with us on WhatsApp
          </a>

          <div className="mt-8 aspect-video overflow-hidden rounded-xl border border-gray-200">
            <iframe
              title="Adavi Digital Institute location"
              className="h-full w-full"
              loading="lazy"
              src="https://www.google.com/maps?q=Ikorodu,Lagos,Nigeria&output=embed"
            />
          </div>
        </div>

        <form className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Full name</label>
            <input className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Message</label>
            <textarea rows={5} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none" />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
