"use client";

import { useI18n } from "./i18n";
import { FadeUp, StaggerContainer, StaggerItem } from "./Motion";

export function HowItWorks() {
  const { t } = useI18n();

  return (
    <section
      id="how-it-works"
      className="py-24 lg:py-32 bg-navy-950 relative overflow-hidden"
    >
      {/* Soft glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 60%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <FadeUp>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-400">
              {t("how.label")}
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {t("how.title")}
            </h2>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed">
              {t("how.sub")}
            </p>
          </div>
        </FadeUp>

        <StaggerContainer
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6"
          staggerDelay={0.15}
        >
          {[0, 1, 2].map((i) => (
            <StaggerItem key={i}>
              <div className="relative text-center group">
                {/* Connector arrow (between cards) */}
                {i < 2 && (
                  <div className="hidden md:flex absolute top-12 -right-3 lg:-right-1 z-10 items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-slate-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                )}

                {/* Icon circle */}
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white/[0.06] border border-white/[0.08] transition-all group-hover:bg-blue-500/10 group-hover:border-blue-500/20">
                  <div
                    className="h-10 w-10 text-blue-400"
                    dangerouslySetInnerHTML={{ __html: icons[i] }}
                  />
                </div>

                {/* Step number */}
                <div className="mt-5 inline-flex h-6 items-center rounded-full bg-white/[0.06] px-3">
                  <span className="text-xs font-bold text-slate-500 tracking-wider">
                    {t(`how.${i}.step`)}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-xl font-bold text-white tracking-tight">
                  {t(`how.${i}.title`)}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-400 max-w-xs mx-auto">
                  {t(`how.${i}.desc`)}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bottom reassurance */}
        <FadeUp delay={0.3}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-slate-400">
                  {t(`how.check${i}`)}
                </span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

const icons = [
  // Chat bubble with WhatsApp feel
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>`,
  // Sparkle / magic wand
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>`,
  // Chart trending up
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>`,
];
