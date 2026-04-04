import Link from "next/link";

export default function ConfirmedPage() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-200">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <h1 className="mt-6 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-950">
        Email verified
      </h1>
      <p className="mt-3 text-sm text-slate-500 leading-relaxed">
        Your account has been confirmed successfully.<br />
        You can now log in and start setting up your agency.
      </p>

      <Link
        href="/login"
        className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl bg-navy-900 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
      >
        Log in to your account
      </Link>
    </div>
  );
}
