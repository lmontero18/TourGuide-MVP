"use client";

import { useTranslations } from "next-intl";
import { FadeIn, StaggerContainer, StaggerItem } from "./Motion";

export function LogoBar() {
  const t = useTranslations("logos");

  return (
    <section className="border-y border-slate-100 bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-6 sm:mb-8">
            {t("title")}
          </p>
        </FadeIn>
        <StaggerContainer className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-4">
          {badges.map((b, i) => (
            <StaggerItem key={i}>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-navy-700">
                  <span className="h-4 w-4" aria-hidden dangerouslySetInnerHTML={{ __html: b.svg }} />
                </span>
                <span className="text-xs sm:text-sm font-semibold tracking-tight">
                  {t(`b${i}`)}
                </span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

const badges = [
  // WhatsApp Business API oficial
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>` },
  // Proveedor de tecnología de Meta
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>` },
  // Datos cifrados
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` },
  // Soporte en español
  { svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` },
];
