"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PriceTier, Tour } from "@/types";
import SaveStatus, { type SaveState } from "./SaveStatus";

interface TourDrawerProps {
  tour: Tour | null;
  saveState: SaveState;
  onChange: (tour: Tour) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const CURRENCIES = ["USD", "NIO", "CRC", "MXN", "PEN", "COP", "GTQ", "EUR"];
const PRESETS = ["Adulto", "Niño", "Grupo (4+)", "Privado", "Local", "Extranjero"];

// Misma forma que renderTour en lib/bot/compilePrompt.ts: asi le llega al bot.
function botLine(tour: Tour) {
  const prices = (tour.prices ?? [])
    .filter((p) => Number.isFinite(p.amount) && p.currency)
    .map((p) => `${p.label ? `${p.label} ` : ""}${p.amount} ${p.currency}`)
    .join(" · ");
  const name = tour.name.trim();
  const category = tour.category?.trim();
  const head = category ? `${name} (${category})` : name;
  const detail = [prices, tour.info.trim()].filter(Boolean).join(" · ");
  return detail ? `- ${head}: ${detail}` : `- ${head}`;
}

// Monto con estado de texto propio: un input controlado por numero no deja
// escribir "12." ni borrar del todo.
function AmountInput({ value, onChange, className, label }: { value: number; onChange: (n: number) => void; className: string; label: string }) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : "");
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        setText(raw);
        onChange(raw.trim() === "" ? NaN : Number(raw));
      }}
      className={className}
    />
  );
}

// Panel lateral de edicion de un tour. Los cambios se guardan solos (la
// pagina hace el guardado con debounce) y el estado se muestra abajo.
export default function TourDrawer({ tour, saveState, onChange, onDelete, onClose }: TourDrawerProps) {
  const t = useTranslations("dashboard.tours");
  const open = !!tour;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const prices = tour?.prices ?? [];
  const setPrices = (next: PriceTier[]) => tour && onChange({ ...tour, prices: next });
  const input =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-navy-900/25 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        aria-label={t("editTour")}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-[520px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {tour && (
          <>
            <div className="flex items-start gap-2 border-b border-slate-100 px-5 pb-3 pt-5">
              <textarea
                value={tour.name}
                onChange={(e) => onChange({ ...tour, name: e.target.value })}
                rows={2}
                aria-label={t("tourName")}
                placeholder={t("tourNamePlaceholder")}
                className="min-w-0 flex-1 resize-none rounded-lg border border-transparent bg-transparent px-1.5 py-1 font-display text-xl font-extrabold leading-tight text-navy-900 outline-none hover:border-slate-200 focus:border-slate-200"
              />
              <button onClick={onClose} aria-label={t("close")} className="px-2 text-2xl leading-none text-slate-400 hover:text-navy-900">×</button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <label htmlFor="tour-category" className="mb-1.5 block text-xs font-bold text-navy-900">{t("type")}</label>
                <input
                  id="tour-category"
                  list="tour-category-options"
                  value={tour.category ?? ""}
                  onChange={(e) => onChange({ ...tour, category: e.target.value })}
                  placeholder="Day tour"
                  className={input}
                />
                <datalist id="tour-category-options">
                  {["Day tour", "Trek", "Adventure", "Multi-day", "Transfer"].map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-bold text-navy-900">{t("prices")}</span>
                <div className="space-y-2">
                  {prices.map((p, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_88px_28px] items-center gap-2">
                      <input
                        aria-label={t("priceFor")}
                        value={p.label ?? ""}
                        placeholder={t("priceForPlaceholder")}
                        onChange={(e) => setPrices(prices.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                        className={input}
                      />
                      <AmountInput
                        key={`${tour.id}-${i}-${prices.length}`}
                        label={t("amount")}
                        value={p.amount}
                        onChange={(amount) => setPrices(prices.map((x, j) => (j === i ? { ...x, amount } : x)))}
                        className={`${input} text-right tabular-nums`}
                      />
                      <select
                        aria-label={t("currency")}
                        value={p.currency}
                        onChange={(e) => setPrices(prices.map((x, j) => (j === i ? { ...x, currency: e.target.value } : x)))}
                        className={input}
                      >
                        {[...new Set([p.currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <button onClick={() => setPrices(prices.filter((_, j) => j !== i))} aria-label={t("removePrice")} className="text-lg text-slate-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESETS.map((label) => (
                    <button
                      key={label}
                      onClick={() => setPrices([...prices, { label, amount: NaN, currency: prices[0]?.currency ?? "USD" }])}
                      className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-slate-400"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{t("pricesHint")}</p>
              </div>

              <div>
                <label htmlFor="tour-info" className="mb-1.5 block text-xs font-bold text-navy-900">{t("details")}</label>
                <textarea
                  id="tour-info"
                  value={tour.info}
                  onChange={(e) => onChange({ ...tour, info: e.target.value })}
                  className={`${input} min-h-32 resize-y`}
                />
                <p className="mt-1.5 text-xs text-slate-400">{t("detailsHint")}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold text-navy-900">{t("botView")}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{botLine(tour)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <button onClick={() => onDelete(tour.id)} className="text-sm font-semibold text-red-600 hover:text-red-700">{t("deleteTour")}</button>
              <SaveStatus state={saveState} />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
