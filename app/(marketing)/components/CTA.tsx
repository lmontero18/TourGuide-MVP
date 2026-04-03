import Link from "next/link";

export function CTA() {
  return (
    <section className="py-24 lg:py-32 bg-slate-50 relative overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-navy-950 p-10 sm:p-14 lg:p-20 text-center relative overflow-hidden noise-bg">
          {/* Glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 60%)",
            }}
            aria-hidden
          />

          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Stop losing leads
              <br />
              to your voicemail
            </h2>
            <p className="mt-5 text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
              Your next customer is messaging you right now. Make sure someone
              — or some bot — answers.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-7 text-sm font-bold text-navy-950 shadow-lg shadow-black/20 transition-all hover:bg-slate-100 hover:-translate-y-0.5 active:translate-y-0"
              >
                Start free trial
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <span className="text-sm text-slate-500">
                14 days free · No credit card
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
