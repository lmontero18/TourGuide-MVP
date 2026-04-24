"use client";

import { useTranslations } from "next-intl";
import { FadeUp, StaggerContainer, StaggerItem } from "./Motion";

export function Features() {
  const t = useTranslations("features");

  return (
    <section id="features" className="py-16 sm:py-24 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="max-w-2xl">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-blue-500">
              {t("label")}
            </p>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-navy-950">
              {t("title")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-500 leading-relaxed">
              {t("sub")}
            </p>
          </div>
        </FadeUp>

        <StaggerContainer
          className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          staggerDelay={0.1}
        >
          {featureKeys.map((_, i) => (
            <StaggerItem
              key={i}
              className={
                i === 0 ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""
              }
            >
              <div
                className={`group relative rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 h-full ${
                  i === 0 ? "lg:p-10" : ""
                }`}
              >
                <div
                  className={`mb-3 sm:mb-4 inline-flex items-center justify-center rounded-xl ${featureIcons[i].bg} p-2 sm:p-2.5`}
                >
                  <div
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${featureIcons[i].color}`}
                    dangerouslySetInnerHTML={{ __html: featureIcons[i].svg }}
                  />
                </div>
                <h3
                  className={`font-display font-bold tracking-tight text-navy-950 ${
                    i === 0 ? "text-lg sm:text-xl lg:text-2xl" : "text-base sm:text-lg"
                  }`}
                >
                  {t(`items.${i}.title`)}
                </h3>
                <p
                  className={`mt-1.5 sm:mt-2 text-slate-500 leading-relaxed ${
                    i === 0 ? "text-sm sm:text-base lg:text-lg max-w-lg" : "text-xs sm:text-sm"
                  }`}
                >
                  {t(`items.${i}.desc`)}
                </p>
                {i === 0 && (
                  <div className="mt-5 sm:mt-8 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-5">
                    <WhatsAppPreview />
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function WhatsAppPreview() {
  const messages = [
    { from: "user", text: "Hola! Cuánto cuesta el tour a Machu Picchu para 4 personas?" },
    { from: "bot", text: "¡Hola! 🏔️ El tour a Machu Picchu para 4 personas es $320 USD por persona. Incluye transporte, guía bilingüe y almuerzo. ¿Te gustaría reservar una fecha?" },
    { from: "user", text: "Si, el próximo sábado tienen disponible?" },
  ];

  return (
    <div className="space-y-2">
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`rounded-2xl px-3 py-1.5 sm:px-3.5 sm:py-2 max-w-[85%] sm:max-w-[80%] text-xs sm:text-sm leading-relaxed ${
              m.from === "user"
                ? "bg-blue-500 text-white rounded-tr-md"
                : "bg-white border border-slate-200 text-navy-900 rounded-tl-md shadow-sm"
            }`}
          >
            {m.from === "bot" && (
              <span className="block text-[9px] sm:text-[10px] font-semibold text-blue-500 mb-0.5">
                TourGuide Bot
              </span>
            )}
            {m.text}
          </div>
        </div>
      ))}
      <div className="flex justify-start">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-3 sm:px-4 py-2 shadow-sm flex items-center gap-1">
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

const featureKeys = [0, 1, 2, 3, 4];

const featureIcons = [
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, bg: "bg-blue-50", color: "text-blue-500" },
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, bg: "bg-navy-900/5", color: "text-navy-700" },
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`, bg: "bg-blue-50", color: "text-blue-500" },
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`, bg: "bg-navy-900/5", color: "text-navy-700" },
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`, bg: "bg-blue-50", color: "text-blue-500" },
];
