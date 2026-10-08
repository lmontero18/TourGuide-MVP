"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Tour } from "@/types";
import { reviewReasons } from "@/lib/tours/review";

interface ToursTableProps {
  tours: Tour[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

function PriceCell({ tour }: { tour: Tour }) {
  const t = useTranslations("dashboard.tours");
  const prices = (tour.prices ?? []).filter((p) => Number.isFinite(p.amount));
  if (!prices.length) return <span className="text-xs font-semibold text-amber-700">{t("noPrice")}</span>;
  const first = prices[0];
  return (
    <span className="block font-bold tabular-nums text-navy-900">
      {first.amount} {first.currency}
      <span className="block text-[11px] font-medium text-slate-400">
        {prices.length > 1 ? t("morePrices", { count: prices.length - 1 }) : first.label || " "}
      </span>
    </span>
  );
}

export default function ToursTable({ tours, selectedId, onSelect, onAdd }: ToursTableProps) {
  const t = useTranslations("dashboard.tours");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);

  const categories = useMemo(
    () => [...new Set(tours.map((tour) => tour.category?.trim()).filter((c): c is string => !!c))],
    [tours]
  );

  // Lo pendiente de revisar va arriba; al completarlo baja con los demas.
  const reasons = useMemo(() => new Map(tours.map((tour) => [tour.id, reviewReasons(tour)])), [tours]);
  const pending = useMemo(() => tours.filter((tour) => tour.name.trim() && reasons.get(tour.id)?.length), [tours, reasons]);
  const counts = useMemo(() => {
    const c = { lowConfidence: 0, noPrice: 0, noDetails: 0 };
    for (const tour of pending) for (const r of reasons.get(tour.id) ?? []) c[r]++;
    return c;
  }, [pending, reasons]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = tours.filter(
      (tour) =>
        (!category || tour.category === category) &&
        (!onlyPending || (reasons.get(tour.id)?.length ?? 0) > 0) &&
        (!q || tour.name.toLowerCase().includes(q) || tour.info.toLowerCase().includes(q))
    );
    const isPending = (tour: Tour) => ((reasons.get(tour.id)?.length ?? 0) > 0 ? 0 : 1);
    return filtered.map((tour, i) => ({ tour, i })).sort((a, b) => isPending(a.tour) - isPending(b.tour) || a.i - b.i).map((x) => x.tour);
  }, [tours, query, category, onlyPending, reasons]);

  const grid = "grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_20px] gap-4";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="min-w-0 flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-slate-400"
          />
        </label>
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "all"}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category === c ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                {c ?? t("all")}
              </button>
            ))}
          </div>
        )}
        <button onClick={onAdd} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-4 text-sm font-bold text-white hover:bg-navy-800">
          + {t("addTour")}
        </button>
      </div>

      {pending.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900">{t("pendingTitle", { count: pending.length })}</p>
            <p className="mt-0.5 text-xs text-amber-800">
              {[
                counts.noPrice && t("pendingNoPrice", { count: counts.noPrice }),
                counts.lowConfidence && t("pendingLowConfidence", { count: counts.lowConfidence }),
                counts.noDetails && t("pendingNoDetails", { count: counts.noDetails }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            onClick={() => setOnlyPending((v) => !v)}
            aria-pressed={onlyPending}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              onlyPending ? "border-amber-900 bg-amber-900 text-white" : "border-amber-300 bg-white text-amber-900 hover:border-amber-400"
            }`}
          >
            {onlyPending ? t("showAll") : t("showPending")}
          </button>
        </div>
      ) : (
        tours.some((tour) => tour.name.trim()) && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 13l4 4L19 7" />
            </svg>
            {t("allReviewed")}
          </p>
        )
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className={`${grid} border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400`}>
          <span>{t("colTour")}</span>
          <span className="hidden md:block">{t("colType")}</span>
          <span>{t("colPrice")}</span>
          <span className="hidden md:block" />
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">{tours.length === 0 ? t("emptyTours") : t("noMatch")}</p>
        ) : (
          rows.map((tour) => (
            <button
              key={tour.id}
              onClick={() => onSelect(tour.id)}
              className={`${grid} w-full items-center border-t border-slate-100 px-4 py-3.5 text-left first:border-t-0 transition-colors ${
                selectedId === tour.id ? "bg-blue-50/70" : "hover:bg-slate-50"
              }`}
            >
              <span className="min-w-0">
                <span className="font-bold text-navy-900">{tour.name || t("untitled")}</span>
                {reasons.get(tour.id)?.includes("lowConfidence") && (
                  <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 align-middle text-[11px] font-bold text-amber-700">
                    {t("review")}
                  </span>
                )}
                {reasons.get(tour.id)?.includes("noDetails") && (
                  <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 align-middle text-[11px] font-bold text-amber-700">
                    {t("noDetailsBadge")}
                  </span>
                )}
                {tour.info && <span className="mt-0.5 block truncate text-[12.5px] text-slate-500">{tour.info}</span>}
              </span>
              <span className="hidden md:block">
                {tour.category && (
                  <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">{tour.category}</span>
                )}
              </span>
              <PriceCell tour={tour} />
              <span className="hidden text-slate-300 md:block" aria-hidden="true">›</span>
            </button>
          ))
        )}
      </div>
      <p className="text-xs text-slate-400">{t("listHint")}</p>
    </div>
  );
}
