export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 lg:py-32 bg-navy-950 noise-bg relative overflow-hidden"
    >
      {/* Decorative gradient orbs */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-8"
        style={{
          background:
            "radial-gradient(circle, rgba(96,165,250,0.4) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-400">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Live in 10 minutes.
            <br />
            No code required.
          </h2>
        </div>

        {/* Steps */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <div key={step.title} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-blue-500/30 to-transparent z-0" />
              )}

              {/* Step number */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm mb-6 transition-all group-hover:bg-blue-500/10 group-hover:border-blue-500/20">
                <span className="font-display text-xl font-extrabold text-blue-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white tracking-tight">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                {step.description}
              </p>

              {/* Visual hint */}
              <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <pre className="text-xs font-mono text-blue-300/60 leading-relaxed overflow-hidden">
                  {step.code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Connect WhatsApp",
    description:
      "Link your Twilio-powered WhatsApp number. We handle the setup — just paste your credentials.",
    code: `→ WhatsApp Business linked
→ Webhook configured
→ Messages flowing ✓`,
  },
  {
    title: "Train your bot",
    description:
      "Paste your tour descriptions, prices, and FAQs. The bot learns your catalog and answers accurately.",
    code: `→ 12 tours imported
→ 34 FAQs synced
→ Tone: friendly, professional
→ Languages: ES, EN ✓`,
  },
  {
    title: "Watch leads roll in",
    description:
      "Open the dashboard. See every conversation, qualified lead, and booking — in real time.",
    code: `→ 47 conversations today
→ 12 qualified leads
→ 3 bookings ($2,400)
→ After-hours: 28 handled ✓`,
  },
];
