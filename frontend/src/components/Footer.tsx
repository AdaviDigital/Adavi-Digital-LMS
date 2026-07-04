import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="text-lg font-bold text-brand-700">Adavi Digital Institute</p>
          <p className="mt-2 text-sm text-gray-600">
            AI-powered learning for Nigeria and the world.
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-900">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li><Link href="/courses" className="hover:text-brand-600">Courses</Link></li>
            <li><Link href="/about" className="hover:text-brand-600">About Us</Link></li>
            <li><Link href="/blog" className="hover:text-brand-600">Blog</Link></li>
            <li><Link href="/faq" className="hover:text-brand-600">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-gray-900">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>Ikorodu, Lagos, Nigeria</li>
            <li>
              <a href="tel:+2348062177435" className="hover:text-brand-600">+234 806 217 7435</a>
            </li>
            <li>
              <a href="mailto:info@adavidigitalinstitute.com" className="hover:text-brand-600">
                info@adavidigitalinstitute.com
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-gray-900">Chat with us</p>
          <a
            href="https://wa.me/2348062177435"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            WhatsApp Us
          </a>
        </div>
      </div>

      <div className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Adavi Digital Institute. All rights reserved.
      </div>
    </footer>
  );
}
