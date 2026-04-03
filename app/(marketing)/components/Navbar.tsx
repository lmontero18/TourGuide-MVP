import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 animate-fade-in">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 transition-transform group-hover:scale-105">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-navy-900">
              TourGuide
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors"
            >
              How it works
            </a>
            <a
              href="#metrics"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors"
            >
              Results
            </a>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors hidden sm:block"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white transition-all hover:bg-navy-800 hover:shadow-lg hover:shadow-navy-900/20 active:scale-[0.98]"
            >
              Start free
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
