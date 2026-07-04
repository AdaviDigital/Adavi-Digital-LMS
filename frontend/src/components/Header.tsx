'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('adavi_access_token'));
  }, []);

  function handleLogout() {
    localStorage.removeItem('adavi_access_token');
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            A
          </span>
          Adavi Digital Institute
        </Link>

        <nav aria-label="Main navigation" className="hidden gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-700 hover:text-brand-600"
            >
              {link.label}
            </Link>
          ))}
          {loggedIn && (
            <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-brand-600">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {loggedIn ? (
            <button onClick={handleLogout} className="text-sm font-medium text-gray-700 hover:text-brand-600">
              Log out
            </button>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-brand-600">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
