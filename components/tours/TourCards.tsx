"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { BusinessSection, PriceTier, Tour } from "@/types";

// Las FAQs se persisten como {question, answer}; el `id` es solo para keys de edición.
export interface FaqDraft {
  id: string;
  question: string;
  answer: string;
}

// Monedas comunes en LATAM (+ USD/EUR). La detectada por la IA se agrega si no está.
const CURRENCIES = ["USD", "CRC", "PEN", "MXN", "COP", "ARS", "CLP", "BRL", "GTQ", "BOB", "UYU", "DOP", "PAB", "EUR"];

const INPUT =
  "w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const TEXTAREA = `${INPUT} h-auto py-3 leading-relaxed resize-none`;
const FIELD_LABEL = "block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5";

const PlusIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const cardAnim = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginTop: 0 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

function ReviewBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      {label}
    </span>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {children}
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
      aria-label="remove"
    >
      <TrashIcon />
    </button>
  );
}

function SectionHeader({ title, addLabel, onAdd }: { title?: string; addLabel: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      {title ? <h3 className="text-base font-bold text-navy-900">{title}</h3> : <span />}
      <button
        onClick={onAdd}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-navy-800 active:scale-[0.98] cursor-pointer"
      >
        <PlusIcon />
        {addLabel}
      </button>
    </div>
  );
}

function EmptyState({ text, addLabel, onAdd }: { text: string; addLabel: string; onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 px-6 text-center">
      <p className="text-sm text-slate-500">{text}</p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-navy-900 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <PlusIcon /> {addLabel}
      </button>
    </div>
  );
}

/* ─── Tours ─── */
export function ToursEditor({
  tours,
  onChange,
  title,
}: {
  tours: Tour[];
  onChange: (tours: Tour[]) => void;
  title?: string;
}) {
  const t = useTranslations("onboarding.steps.tours");

  const add = () => onChange([...tours, { id: crypto.randomUUID(), name: "", prices: [], info: "", source: "manual" }]);
  const remove = (id: string) => onChange(tours.filter((x) => x.id !== id));
  const patch = (id: string, p: Partial<Tour>) =>
    onChange(tours.map((x) => (x.id === id ? { ...x, ...p, confidence: undefined } : x)));

  const setPrices = (tour: Tour, prices: PriceTier[]) => patch(tour.id, { prices });
  const addPrice = (tour: Tour) => setPrices(tour, [...(tour.prices ?? []), { amount: 0, currency: "USD" }]);
  const updatePrice = (tour: Tour, idx: number, p: Partial<PriceTier>) =>
    setPrices(tour, (tour.prices ?? []).map((pr, i) => (i === idx ? { ...pr, ...p } : pr)));
  const removePrice = (tour: Tour, idx: number) =>
    setPrices(tour, (tour.prices ?? []).filter((_, i) => i !== idx));

  return (
    <div>
      <SectionHeader title={title} addLabel={t("addTour")} onAdd={add} />
      {tours.length === 0 ? (
        <EmptyState text={t("toursEmpty")} addLabel={t("addTour")} onAdd={add} />
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {tours.map((tour) => {
              const needsReview = tour.confidence != null && tour.confidence < 0.6;
              const prices = tour.prices ?? [];
              return (
                <motion.div key={tour.id} layout {...cardAnim}>
                  <CardShell>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {needsReview ? <ReviewBadge label={t("reviewFlag")} /> : <span />}
                      <DeleteButton onClick={() => remove(tour.id)} />
                    </div>

                    <div>
                      <label className={FIELD_LABEL}>{t("tourNameLabel")}</label>
                      <input
                        type="text"
                        value={tour.name}
                        onChange={(e) => patch(tour.id, { name: e.target.value })}
                        placeholder={t("tourNamePlaceholder")}
                        className={`${INPUT} h-12 text-base font-medium`}
                      />
                    </div>

                    {/* Precios dinámicos */}
                    <div className="mt-4">
                      <label className={FIELD_LABEL}>{t("pricesLabel")}</label>
                      <div className="space-y-2">
                        {prices.map((p, pi) => (
                          <div key={pi} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={p.label ?? ""}
                              onChange={(e) => updatePrice(tour, pi, { label: e.target.value || undefined })}
                              placeholder={t("priceLabelPlaceholder")}
                              className={`${INPUT} h-10 flex-1 min-w-0`}
                            />
                            <input
                              type="number"
                              value={Number.isFinite(p.amount) ? p.amount : ""}
                              onChange={(e) => updatePrice(tour, pi, { amount: e.target.value === "" ? 0 : Number(e.target.value) })}
                              placeholder="0"
                              className={`${INPUT} h-10 w-28 text-right`}
                            />
                            <select
                              value={p.currency}
                              onChange={(e) => updatePrice(tour, pi, { currency: e.target.value })}
                              className="h-10 w-[5.5rem] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium text-navy-900 outline-none focus:border-blue-500 cursor-pointer"
                            >
                              {(CURRENCIES.includes(p.currency) ? CURRENCIES : [p.currency, ...CURRENCIES]).map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removePrice(tour, pi)}
                              className="shrink-0 grid h-10 w-8 place-items-center rounded-lg text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                              aria-label="remove price"
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addPrice(tour)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3.5 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <PlusIcon /> {t("addPrice")}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className={FIELD_LABEL}>{t("notesLabel")}</label>
                      <textarea
                        value={tour.info}
                        onChange={(e) => patch(tour.id, { info: e.target.value })}
                        placeholder={t("tourInfoPlaceholder")}
                        rows={2}
                        className={TEXTAREA}
                      />
                    </div>
                  </CardShell>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ─── Business info ─── */
export function BusinessEditor({
  business,
  onChange,
  title,
}: {
  business: BusinessSection[];
  onChange: (business: BusinessSection[]) => void;
  title?: string;
}) {
  const t = useTranslations("onboarding.steps.tours");

  const add = () => onChange([...business, { id: crypto.randomUUID(), title: "", content: "", source: "manual" }]);
  const remove = (id: string) => onChange(business.filter((x) => x.id !== id));
  const patch = (id: string, p: Partial<BusinessSection>) =>
    onChange(business.map((x) => (x.id === id ? { ...x, ...p, confidence: undefined } : x)));

  return (
    <div>
      <SectionHeader title={title} addLabel={t("addBusiness")} onAdd={add} />
      {business.length === 0 ? (
        <EmptyState text={t("businessEmpty")} addLabel={t("addBusiness")} onAdd={add} />
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {business.map((section) => {
              const needsReview = section.confidence != null && section.confidence < 0.6;
              return (
                <motion.div key={section.id} layout {...cardAnim}>
                  <CardShell>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {needsReview ? <ReviewBadge label={t("reviewFlag")} /> : <span />}
                      <DeleteButton onClick={() => remove(section.id)} />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>{t("businessTitleLabel")}</label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => patch(section.id, { title: e.target.value })}
                        placeholder={t("businessTitlePlaceholder")}
                        className={`${INPUT} h-12 text-base font-semibold`}
                      />
                    </div>
                    <div className="mt-4">
                      <label className={FIELD_LABEL}>{t("businessContentLabel")}</label>
                      <textarea
                        value={section.content}
                        onChange={(e) => patch(section.id, { content: e.target.value })}
                        placeholder={t("businessContentPlaceholder")}
                        rows={4}
                        className={TEXTAREA}
                      />
                    </div>
                  </CardShell>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ─── FAQs ─── */
export function FaqsEditor({
  faqs,
  onChange,
  title,
}: {
  faqs: FaqDraft[];
  onChange: (faqs: FaqDraft[]) => void;
  title?: string;
}) {
  const t = useTranslations("onboarding.steps.tours");

  const add = () => onChange([...faqs, { id: crypto.randomUUID(), question: "", answer: "" }]);
  const remove = (id: string) => onChange(faqs.filter((x) => x.id !== id));
  const patch = (id: string, p: Partial<FaqDraft>) =>
    onChange(faqs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div>
      <SectionHeader title={title} addLabel={t("addFaq")} onAdd={add} />
      {faqs.length === 0 ? (
        <EmptyState text={t("faqsEmpty")} addLabel={t("addFaq")} onAdd={add} />
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {faqs.map((faq) => (
              <motion.div key={faq.id} layout {...cardAnim}>
                <CardShell>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <label className={`${FIELD_LABEL} mb-0 pt-1.5`}>{t("faqQuestionLabel")}</label>
                    <DeleteButton onClick={() => remove(faq.id)} />
                  </div>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => patch(faq.id, { question: e.target.value })}
                    placeholder={t("faqQuestionPlaceholder")}
                    className={`${INPUT} font-medium`}
                  />
                  <div className="mt-4">
                    <label className={FIELD_LABEL}>{t("faqAnswerLabel")}</label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => patch(faq.id, { answer: e.target.value })}
                      placeholder={t("faqAnswerPlaceholder")}
                      rows={3}
                      className={TEXTAREA}
                    />
                  </div>
                </CardShell>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ─── Stacked (onboarding) ─── */
interface TourCardsProps {
  tours: Tour[];
  faqs: FaqDraft[];
  onToursChange: (tours: Tour[]) => void;
  onFaqsChange: (faqs: FaqDraft[]) => void;
  business?: BusinessSection[];
  onBusinessChange?: (business: BusinessSection[]) => void;
}

/**
 * Apila los tres editores con sus títulos. Lo usa la revisión del onboarding.
 * El dashboard usa los editores por separado en pestañas.
 */
export default function TourCards({
  tours,
  faqs,
  onToursChange,
  onFaqsChange,
  business,
  onBusinessChange,
}: TourCardsProps) {
  const t = useTranslations("onboarding.steps.tours");
  return (
    <div className="space-y-10">
      <ToursEditor tours={tours} onChange={onToursChange} title={t("toursTitle")} />
      {business && onBusinessChange && (
        <BusinessEditor business={business} onChange={onBusinessChange} title={t("businessTitle")} />
      )}
      <FaqsEditor faqs={faqs} onChange={onFaqsChange} title={t("faqsTitle")} />
    </div>
  );
}
