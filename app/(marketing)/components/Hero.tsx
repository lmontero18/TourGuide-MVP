export function Hero() {
  return (
    <section className="relative pt-28 pb-8 lg:pt-36 lg:pb-16 hero-gradient grid-pattern noise-bg overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Badge */}
        <div className="animate-float-up delay-100">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 text-sm shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-whatsapp animate-pulse" />
            <span className="font-medium text-navy-900">
              Backed by Y Combinator
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">W25</span>
          </div>
        </div>

        {/* Headline */}
        <div className="mt-8 max-w-3xl">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-navy-950 leading-[1.05] animate-float-up delay-200">
            Your tours sell
            <br />
            themselves at{" "}
            <span className="relative inline-block">
              <span className="relative z-10">2&nbsp;AM</span>
              <span
                className="absolute bottom-1 left-0 right-0 h-3 bg-blue-400/20 rounded-sm -z-0"
                aria-hidden
              />
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-slate-600 max-w-xl animate-float-up delay-300">
            WhatsApp bots that answer, qualify, and book — trained on your tours,
            your prices, your voice. No leads lost to sleep.
          </p>
        </div>

        {/* CTA row */}
        <div className="mt-8 flex flex-col sm:flex-row items-start gap-3 animate-float-up delay-400">
          <a
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-navy-900 px-6 text-sm font-bold text-white shadow-lg shadow-navy-900/25 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
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
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-navy-900 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          >
            See how it works
          </a>
        </div>

        <p className="mt-4 text-xs text-slate-400 animate-fade-in delay-500">
          Free 14-day trial · No credit card · Setup in 10 min
        </p>

        {/* Browser mockup — Screen Studio preview area */}
        <div className="mt-14 lg:mt-20 animate-slide-in-right delay-500">
          <div className="browser-frame overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="browser-dots flex gap-1.5">
                <span />
                <span />
                <span />
              </div>
              <div className="flex-1 mx-3">
                <div className="mx-auto max-w-md h-6 rounded-md bg-slate-100 flex items-center justify-center px-3">
                  <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                    app.tourguide.com/conversations
                  </span>
                </div>
              </div>
              <div className="w-[52px]" />
            </div>

            {/* Preview area — 16:9 aspect ratio container for Screen Studio */}
            <div className="relative aspect-video bg-gradient-to-br from-slate-50 to-slate-100">
              {/* Placeholder content — replace with Screen Studio recording */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                {/* Decorative dashboard skeleton */}
                <DashboardSkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Decorative skeleton that hints at the dashboard UI */
function DashboardSkeleton() {
  return (
    <div className="w-full h-full flex">
      {/* Sidebar skeleton */}
      <div className="hidden sm:flex w-56 flex-col gap-3 border-r border-slate-200/60 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-navy-900/10" />
          <div className="h-3 w-20 rounded bg-navy-900/10" />
        </div>
        {[72, 56, 64, 48, 60].map((w, i) => (
          <div
            key={i}
            className={`h-8 rounded-lg ${i === 0 ? "bg-blue-500/10 border border-blue-500/20" : "bg-transparent"} flex items-center gap-2 px-2.5`}
          >
            <div className="h-3.5 w-3.5 rounded bg-slate-200" />
            <div className={`h-2.5 rounded bg-slate-200`} style={{ width: w }} />
          </div>
        ))}
        <div className="mt-auto">
          <div className="h-8 rounded-lg flex items-center gap-2 px-2.5">
            <div className="h-6 w-6 rounded-full bg-slate-200" />
            <div className="h-2.5 w-16 rounded bg-slate-200" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="h-12 border-b border-slate-200/60 bg-white flex items-center justify-between px-5">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-100" />
            <div className="h-7 w-20 rounded-lg bg-navy-900/10" />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex">
          {/* Conversation list */}
          <div className="w-72 border-r border-slate-200/60 bg-white hidden md:block">
            <div className="p-3 border-b border-slate-200/60">
              <div className="h-8 rounded-lg bg-slate-100" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex items-start gap-3 px-3 py-3 border-b border-slate-100 ${i === 1 ? "bg-blue-50/50" : ""}`}
              >
                <div className="h-9 w-9 rounded-full bg-slate-200 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="h-2.5 w-24 rounded bg-slate-200" />
                    <div className="h-2 w-10 rounded bg-slate-200" />
                  </div>
                  <div className="h-2 w-full rounded bg-slate-100" />
                  <div className="h-2 w-3/4 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-slate-50/50">
            {/* Chat header */}
            <div className="h-14 border-b border-slate-200/60 bg-white flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div className="space-y-1">
                  <div className="h-2.5 w-28 rounded bg-slate-200" />
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <div className="h-2 w-16 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <StatusPill label="Bot active" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-hidden">
              <ChatBubble side="right" lines={[80]} color="bg-blue-500/10" />
              <ChatBubble side="left" lines={[100, 70]} color="bg-white" />
              <ChatBubble side="right" lines={[60]} color="bg-blue-500/10" />
              <ChatBubble side="left" lines={[120, 90, 50]} color="bg-white" />
              <ChatBubble side="right" lines={[90]} color="bg-blue-500/10" />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-200/60">
              <div className="h-10 rounded-xl bg-slate-100 flex items-center px-3 justify-between">
                <div className="h-2.5 w-32 rounded bg-slate-200" />
                <div className="h-6 w-6 rounded-lg bg-navy-900/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  side,
  lines,
  color,
}: {
  side: "left" | "right";
  lines: number[];
  color: string;
}) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`${color} rounded-2xl ${side === "left" ? "rounded-tl-md" : "rounded-tr-md"} p-3 space-y-1.5 max-w-[70%] border border-slate-200/40 shadow-sm`}
      >
        {lines.map((w, i) => (
          <div
            key={i}
            className="h-2 rounded bg-slate-200/80"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200/60 px-2.5 py-1">
      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
      <span className="text-[10px] font-semibold text-green-700 tracking-wide">
        {label}
      </span>
    </div>
  );
}
