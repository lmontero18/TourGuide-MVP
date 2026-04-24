"use client";

import { useTranslations } from "next-intl";
import { FadeIn, StaggerContainer, StaggerItem } from "./Motion";

export function LogoBar() {
  const t = useTranslations("logos");

  return (
    <section className="border-y border-slate-100 bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-6 sm:mb-8">
            {t("title")}
          </p>
        </FadeIn>
        <StaggerContainer className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-12 gap-y-4 sm:gap-y-6">
          {agencies.map((name) => (
            <StaggerItem key={name}>
              <span className="text-sm sm:text-base font-display font-bold text-slate-300 tracking-tight select-none">
                {name}
              </span>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

const agencies = [
  "Aventura Maya",
  "Cusco Expeditions",
  "Patagonia Trek",
  "Caribe Tours",
  "Andes Explorer",
  "Riviera Guides",
  "Galápagos Way",
  "Sacred Valley Co.",
];
