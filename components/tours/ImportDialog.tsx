"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { importFromFiles, importFromUrl, type ImportResult } from "@/lib/import/client";
import { planImport, type ImportPlan } from "@/lib/import/merge";
import type { BusinessSection, FAQ, PriceTier, Tour } from "@/types";

interface Knowledge {
  tours: Tour[];
  faqs: FAQ[];
  business: BusinessSection[];
}

interface ImportDialogProps {
  open: boolean;
  current: Knowledge;
  onClose: () => void;
  onApply: (next: Knowledge) => void;
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_FILES = 8;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function formatPrices(prices: PriceTier[] | undefined): string {
  if (!prices?.length) return "—";
  return prices.map((p) => `${p.label ? `${p.label} ` : ""}${p.amount} ${p.currency}`).join(" · ");
}

function Spinner() {
  return (
    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// Volver a leer la web o un tarifario despues del onboarding (CODE-188): se
// compara con lo que ya hay y la agencia elige que agregar. Nada se borra.
export default function ImportDialog({ open, current, onClose, onApply }: ImportDialogProps) {
  const t = useTranslations("dashboard.tours.reimport");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"url" | "files" | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const reset = () => {
    setPlan(null);
    setSkip(new Set());
    setUrl("");
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const review = (result: ImportResult) => {
    const total = result.tours.length + result.faqs.length + result.business.length;
    if (total === 0) {
      toast.message(result.thin ? t("thin") : t("empty"));
      return;
    }
    setSkip(new Set());
    setPlan(planImport(current, result));
  };

  const runUrl = async () => {
    if (!url.trim() || busy) return;
    setBusy("url");
    try {
      review(await importFromUrl(url));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(null);
    }
  };

  const runFiles = async (files: File[]) => {
    if (!files.length || busy) return;
    if (files.length > MAX_UPLOAD_FILES || files.some((f) => !ACCEPTED_TYPES.includes(f.type) || f.size > MAX_UPLOAD_BYTES)) {
      toast.error(t("tooLarge"));
      return;
    }
    setBusy("files");
    try {
      review(await importFromFiles(files));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggle = (key: string) =>
    setSkip((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectedCount = useMemo(() => {
    if (!plan) return 0;
    const keys = [
      ...plan.added.map((x) => `tour:${x.id}`),
      ...plan.priceChanges.map((x) => `price:${x.existing.id}`),
      ...plan.faqs.map((_, i) => `faq:${i}`),
      ...plan.business.map((x) => `section:${x.id}`),
    ];
    return keys.filter((k) => !skip.has(k)).length;
  }, [plan, skip]);

  const apply = () => {
    if (!plan) return;
    const prices = new Map(
      plan.priceChanges.filter((c) => !skip.has(`price:${c.existing.id}`)).map((c) => [c.existing.id, c.incoming.prices ?? []])
    );
    onApply({
      tours: [
        ...current.tours.map((tour) => (prices.has(tour.id) ? { ...tour, prices: prices.get(tour.id) } : tour)),
        ...plan.added.filter((tour) => !skip.has(`tour:${tour.id}`)),
      ],
      faqs: [...current.faqs, ...plan.faqs.filter((_, i) => !skip.has(`faq:${i}`))],
      business: [...current.business, ...plan.business.filter((s) => !skip.has(`section:${s.id}`))],
    });
    toast.success(t("applied", { count: selectedCount }));
    reset();
    onClose();
  };

  if (!open) return null;

  const nothingNew = plan && !plan.added.length && !plan.priceChanges.length && !plan.faqs.length && !plan.business.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/40" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reimport-title"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 id="reimport-title" className="text-base font-bold text-navy-900">{plan ? t("reviewTitle") : t("title")}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{plan ? t("reviewSub") : t("sub")}</p>
          </div>
          <button onClick={close} aria-label={t("close")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-navy-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!plan ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="reimport-url" className="mb-1.5 block text-xs font-medium text-navy-900">{t("urlLabel")}</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="reimport-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void runUrl()}
                    placeholder="https://"
                    className={INPUT_CLASS}
                  />
                  <button
                    onClick={() => void runUrl()}
                    disabled={!url.trim() || !!busy}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === "url" && <Spinner />}
                    {busy === "url" ? t("reading") : t("readUrl")}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                {t("or")}
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={(e) => void runFiles(Array.from(e.target.files ?? []))}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!busy}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-navy-900 px-5 text-sm font-bold text-navy-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "files" && <Spinner />}
                  {busy === "files" ? t("reading") : t("uploadFiles")}
                </button>
                <p className="mt-2 text-xs text-slate-400">{t("filesHint")}</p>
              </div>
              {busy && <p className="text-xs text-slate-500">{t("readingHint")}</p>}
            </div>
          ) : nothingNew ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-sm font-semibold text-navy-900">{t("upToDate")}</p>
              <p className="mt-1 text-xs text-slate-500">{t("upToDateSub", { count: plan.unchanged })}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {plan.added.length > 0 && (
                <Section title={t("newTours", { count: plan.added.length })}>
                  {plan.added.map((tour) => (
                    <Row key={tour.id} checked={!skip.has(`tour:${tour.id}`)} onToggle={() => toggle(`tour:${tour.id}`)}>
                      <span className="font-semibold text-navy-900">{tour.name}</span>
                      <span className="block text-xs text-slate-500">{formatPrices(tour.prices)}</span>
                    </Row>
                  ))}
                </Section>
              )}

              {plan.priceChanges.length > 0 && (
                <Section title={t("priceChanges", { count: plan.priceChanges.length })} hint={t("priceHint")}>
                  {plan.priceChanges.map((c) => (
                    <Row key={c.existing.id} checked={!skip.has(`price:${c.existing.id}`)} onToggle={() => toggle(`price:${c.existing.id}`)}>
                      <span className="font-semibold text-navy-900">{c.existing.name}</span>
                      <span className="block text-xs text-slate-500">
                        <span className="line-through">{formatPrices(c.existing.prices)}</span>
                        {" → "}
                        <span className="font-semibold text-navy-900">{formatPrices(c.incoming.prices)}</span>
                      </span>
                    </Row>
                  ))}
                </Section>
              )}

              {plan.business.length > 0 && (
                <Section title={t("newSections", { count: plan.business.length })}>
                  {plan.business.map((s) => (
                    <Row key={s.id} checked={!skip.has(`section:${s.id}`)} onToggle={() => toggle(`section:${s.id}`)}>
                      <span className="font-semibold text-navy-900">{s.title}</span>
                    </Row>
                  ))}
                </Section>
              )}

              {plan.faqs.length > 0 && (
                <Section title={t("newFaqs", { count: plan.faqs.length })}>
                  {plan.faqs.map((f, i) => (
                    <Row key={i} checked={!skip.has(`faq:${i}`)} onToggle={() => toggle(`faq:${i}`)}>
                      <span className="text-navy-900">{f.question}</span>
                    </Row>
                  ))}
                </Section>
              )}

              <p className="text-xs text-slate-500">{t("unchanged", { count: plan.unchanged })}</p>

              {plan.missing.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">{t("missingTitle", { count: plan.missing.length })}</p>
                  <p className="mt-0.5 text-xs text-amber-700">{plan.missing.map((tour) => tour.name).join(" · ")}</p>
                  <p className="mt-1 text-[11px] text-amber-700/80">{t("missingHint")}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {plan && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
            <button onClick={reset} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {t("back")}
            </button>
            {nothingNew ? (
              <button onClick={close} className="h-10 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white hover:bg-navy-800">
                {t("done")}
              </button>
            ) : (
              <button
                onClick={apply}
                disabled={selectedCount === 0}
                className="h-10 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("apply", { count: selectedCount })}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">{children}</div>
    </section>
  );
}

function Row({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-slate-50">
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-0.5 h-4 w-4 shrink-0 accent-navy-900" />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}
