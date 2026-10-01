"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { FaqDraft } from "./TourCards";

interface FaqAccordionProps {
  faqs: FaqDraft[];
  onChange: (faqs: FaqDraft[]) => void;
}

// Preguntas frecuentes en acordeon: se abre una y se edita ahi mismo.
export default function FaqAccordion({ faqs, onChange }: FaqAccordionProps) {
  const t = useTranslations("dashboard.tours");
  const [openId, setOpenId] = useState<string | null>(null);
  const update = (id: string, patch: Partial<FaqDraft>) => onChange(faqs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const add = () => {
    const id = crypto.randomUUID();
    onChange([...faqs, { id, question: "", answer: "" }]);
    setOpenId(id);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {faqs.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">{t("emptyFaqs")}</p>}
        {faqs.map((faq) => {
          const open = openId === faq.id;
          const incomplete = !faq.question.trim() || !faq.answer.trim();
          return (
            <div key={faq.id} className="border-t border-slate-100 first:border-t-0">
              <button
                onClick={() => setOpenId(open ? null : faq.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-navy-900">{faq.question || t("untitledFaq")}</span>
                  {!open && faq.answer && <span className="mt-0.5 block truncate text-[12.5px] text-slate-500">{faq.answer}</span>}
                </span>
                {incomplete && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">{t("incomplete")}</span>
                )}
                <span className={`text-slate-300 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true">›</span>
              </button>
              {open && (
                <div className="space-y-2 px-4 pb-4">
                  <input
                    value={faq.question}
                    onChange={(e) => update(faq.id, { question: e.target.value })}
                    placeholder={t("faqQuestionPlaceholder")}
                    aria-label={t("faqQuestion")}
                    autoFocus={!faq.question}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <textarea
                    value={faq.answer}
                    onChange={(e) => update(faq.id, { answer: e.target.value })}
                    placeholder={t("faqAnswerPlaceholder")}
                    aria-label={t("faqAnswer")}
                    rows={3}
                    className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={() => onChange(faqs.filter((f) => f.id !== faq.id))}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    {t("deleteFaq")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={add} className="inline-flex h-10 items-center rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-500 hover:border-slate-400 hover:text-navy-900">
        + {t("addFaq")}
      </button>
      <p className="text-xs text-slate-400">{t("faqHint")}</p>
    </div>
  );
}
