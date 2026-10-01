"use client";

import { useTranslations } from "next-intl";
import type { BusinessSection } from "@/types";

interface BusinessGridProps {
  sections: BusinessSection[];
  onChange: (sections: BusinessSection[]) => void;
}

// Secciones de la agencia (politicas, pagos, horarios...) editables en el lugar.
export default function BusinessGrid({ sections, onChange }: BusinessGridProps) {
  const t = useTranslations("dashboard.tours");
  const update = (id: string, patch: Partial<BusinessSection>) =>
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch, confidence: undefined } : s)));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.id} className="group rounded-2xl border border-slate-200 bg-white p-4 focus-within:border-slate-300">
            <div className="flex items-start gap-2">
              <input
                value={section.title}
                onChange={(e) => update(section.id, { title: e.target.value })}
                placeholder={t("sectionTitlePlaceholder")}
                aria-label={t("sectionTitle")}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold text-navy-900 outline-none hover:border-slate-200 focus:border-slate-200"
              />
              <button
                onClick={() => onChange(sections.filter((s) => s.id !== section.id))}
                aria-label={t("deleteSection")}
                className="text-lg leading-none text-slate-300 opacity-0 transition-opacity hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
            <textarea
              value={section.content}
              onChange={(e) => update(section.id, { content: e.target.value })}
              placeholder={t("sectionContentPlaceholder")}
              aria-label={t("sectionContent")}
              rows={4}
              className="mt-1 w-full resize-y rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[13px] leading-relaxed text-slate-600 outline-none hover:border-slate-200 focus:border-slate-200"
            />
          </article>
        ))}
        <button
          onClick={() => onChange([...sections, { id: crypto.randomUUID(), title: "", content: "", source: "manual" }])}
          className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-slate-400 hover:text-navy-900"
        >
          + {t("addSection")}
        </button>
      </div>
      <p className="text-xs text-slate-400">{t("businessHint")}</p>
    </div>
  );
}
