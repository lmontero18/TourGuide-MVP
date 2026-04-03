export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-500">
            Features
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-950">
            Everything your agency needs to never miss a lead
          </h2>
          <p className="mt-4 text-lg text-slate-500 leading-relaxed">
            A WhatsApp bot that knows your tours inside out, a live dashboard for
            your team, and the metrics that prove ROI.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative rounded-2xl border border-slate-200/80 bg-white p-7 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 ${
                i === 0
                  ? "md:col-span-2 lg:col-span-2 lg:row-span-2 lg:p-10"
                  : ""
              }`}
            >
              <div
                className={`mb-4 inline-flex items-center justify-center rounded-xl ${f.iconBg} p-2.5`}
              >
                <div
                  className={`h-5 w-5 ${f.iconColor}`}
                  dangerouslySetInnerHTML={{ __html: f.icon }}
                />
              </div>
              <h3
                className={`font-display font-bold tracking-tight text-navy-950 ${
                  i === 0 ? "text-xl lg:text-2xl" : "text-lg"
                }`}
              >
                {f.title}
              </h3>
              <p
                className={`mt-2 text-slate-500 leading-relaxed ${
                  i === 0 ? "text-base lg:text-lg max-w-lg" : "text-sm"
                }`}
              >
                {f.description}
              </p>
              {i === 0 && (
                <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-5">
                  <WhatsAppPreview />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatsAppPreview() {
  const messages = [
    { from: "user", text: "Hola! Cuánto cuesta el tour a Machu Picchu para 4 personas?" },
    {
      from: "bot",
      text: "¡Hola! 🏔️ El tour a Machu Picchu para 4 personas es $320 USD por persona. Incluye transporte, guía bilingüe y almuerzo. ¿Te gustaría reservar una fecha?",
    },
    { from: "user", text: "Si, el próximo sábado tienen disponible?" },
  ];

  return (
    <div className="space-y-2.5">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`rounded-2xl px-3.5 py-2 max-w-[80%] text-sm leading-relaxed ${
              m.from === "user"
                ? "bg-blue-500 text-white rounded-tr-md"
                : "bg-white border border-slate-200 text-navy-900 rounded-tl-md shadow-sm"
            }`}
          >
            {m.from === "bot" && (
              <span className="block text-[10px] font-semibold text-blue-500 mb-0.5">
                TourGuide Bot
              </span>
            )}
            {m.text}
          </div>
        </div>
      ))}
      {/* Typing indicator */}
      <div className="flex justify-start">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm flex items-center gap-1">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="block h-1.5 w-1.5 rounded-full bg-slate-300"
              style={{ animation: `pulse-dot 1.4s ${d * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "AI that speaks your brand",
    description:
      "Train the bot on your specific tours, prices, FAQs, and tone of voice. It answers like your best agent — in Spanish, Portuguese, or English — 24 hours a day.",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    title: "Live agent takeover",
    description:
      "One click to jump into any conversation. The bot pauses, you talk, then hand it back when you're done.",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    iconBg: "bg-navy-900/5",
    iconColor: "text-navy-700",
  },
  {
    title: "After-hours capture",
    description:
      "60% of WhatsApp inquiries come outside business hours. The bot handles them all — no lead left behind.",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    title: "Lead qualification",
    description:
      "Automatically extract tour interest, group size, dates, and budget from conversations. See your pipeline at a glance.",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    iconBg: "bg-navy-900/5",
    iconColor: "text-navy-700",
  },
  {
    title: "ROI dashboard",
    description:
      "Track leads captured, bookings attributed, and revenue generated — proof your investment is paying off.",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
];
