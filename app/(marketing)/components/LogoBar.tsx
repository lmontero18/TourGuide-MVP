"use client";

import { useI18n } from "./i18n";
import { FadeIn, StaggerContainer, StaggerItem } from "./Motion";

export function LogoBar() {
  const { t } = useI18n();

  return (
    <section className="border-y border-slate-100 bg-white py-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-8">
            {t("logos.title")}
          </p>
        </FadeIn>
        <StaggerContainer className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {agencies.map((name) => (
            <StaggerItem key={name}>
              <span className="text-base font-display font-bold text-slate-300 tracking-tight select-none">
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
