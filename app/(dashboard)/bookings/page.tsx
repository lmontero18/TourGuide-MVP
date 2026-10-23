"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import TopBar from "@/components/layout/TopBar";
import BookingForm from "@/components/bookings/BookingForm";
import { formatBookingDate } from "@/components/bookings/bookingFormat";
import BookingsSkeleton from "@/components/skeletons/BookingsSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { sortBookings, useBookingsRange, type BookingWithLead } from "@/hooks/useBookings";
import { addDays, isoDate } from "@/lib/bookings/prefill";
import { hasFeature } from "@/lib/features";

// Lunes de la semana del dia (la tira arranca en lunes).
function weekStart(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return addDays(day, -weekday);
}

// Reservas (flag `bookings`): la lista de un dia ordenada por hora de recogida,
// que es el orden de la ruta. Por defecto muestra mañana: es lo que el equipo
// arma cada tarde.
export default function BookingsPage() {
  const t = useTranslations("dashboard.bookings");
  const locale = useLocale();
  const { featureFlags } = useAuth();
  const enabled = hasFeature(featureFlags, "bookings");
  const today = isoDate(new Date());
  const [day, setDay] = useState(() => addDays(today, 1));
  const [selected, setSelected] = useState<BookingWithLead | null>(null);

  const from = weekStart(day);
  const to = addDays(from, 6);
  const { data, isError } = useBookingsRange(from, to, enabled);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(from, i)), [from]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of data ?? []) map.set(b.date, (map.get(b.date) ?? 0) + 1);
    return map;
  }, [data]);
  const list = useMemo(() => sortBookings((data ?? []).filter((b) => b.date === day)), [data, day]);
  const pax = list.reduce((sum, b) => sum + (b.pax ?? 0), 0);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const dayLabel =
    day === today ? t("today") : day === addDays(today, 1) ? t("tomorrow") : day === addDays(today, -1) ? t("yesterday") : null;
  const arrow = "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-navy-900";

  // Sin flags todavia (cargando la sesion) va el skeleton, no "no disponible".
  if (!enabled) {
    return (
      <div className="flex h-full flex-col">
        <TopBar title={t("title")} />
        <div className="flex-1 p-5">
          {featureFlags ? <p className="text-sm text-slate-500">{t("notEnabled")}</p> : <BookingsSkeleton />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")} />
      <div className="flex-1 overflow-y-auto p-5">
        {!data && !isError ? (
          <BookingsSkeleton />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setDay(addDays(day, -1))} aria-label={t("prevDay")} className={arrow}>‹</button>
              <h2 className="min-w-48 text-center font-display text-lg font-extrabold text-navy-900">
                {dayLabel && <span>{dayLabel}, </span>}
                {formatBookingDate(day, locale, { weekday: "short", day: "numeric", month: "short" })}
              </h2>
              <button onClick={() => setDay(addDays(day, 1))} aria-label={t("nextDay")} className={arrow}>›</button>
              {day !== today && (
                <button onClick={() => setDay(today)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300">
                  {t("today")}
                </button>
              )}
              <input
                type="date"
                value={day}
                onChange={(e) => e.target.value && setDay(e.target.value)}
                aria-label={t("pickDay")}
                className="ml-auto rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600"
              />
            </div>

            <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={t("week")}>
              {week.map((d) => {
                const count = counts.get(d) ?? 0;
                const active = d === day;
                return (
                  <button
                    key={d}
                    onClick={() => setDay(d)}
                    aria-pressed={active}
                    className={`flex flex-col items-center rounded-xl border py-2 text-xs transition-colors ${
                      active ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-semibold">{formatBookingDate(d, locale, { weekday: "short", day: "numeric" })}</span>
                    <span className={`mt-0.5 text-base font-extrabold tabular-nums ${active ? "text-white" : count ? "text-navy-900" : "text-slate-300"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {isError && <p className="text-sm text-red-600">{t("loadError")}</p>}

            {list.length > 0 && (
              <p className="text-xs text-slate-500">{t("daySummary", { count: list.length, pax })}</p>
            )}

            {list.length === 0 && !isError ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm font-semibold text-navy-900">{t("emptyTitle")}</p>
                <p className="mt-1 text-xs text-slate-500">{t("emptySub")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {list.map((b) => {
                  const name = b.lead?.contact?.name || b.lead?.contact?.phone || t("unknownContact");
                  return (
                    <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => setSelected(b)}
                        className="grid min-w-0 flex-1 grid-cols-[56px_minmax(0,1fr)] gap-x-3 text-left sm:grid-cols-[56px_minmax(0,1.2fr)_minmax(0,1.4fr)_64px_minmax(0,1fr)] sm:items-center"
                      >
                        <span className={`row-span-2 font-display text-base font-extrabold tabular-nums sm:row-span-1 ${b.pickup_time ? "text-navy-900" : "text-slate-300"}`}>
                          {b.pickup_time ?? "—"}
                        </span>
                        <span className="truncate text-sm font-semibold text-navy-900">
                          {b.place || <span className="font-normal text-slate-400">{t("pickupPending")}</span>}
                        </span>
                        <span className="truncate text-xs text-slate-600 sm:text-sm">
                          {b.tour_name}
                          {b.departure && <span className="text-slate-400"> · {b.departure}</span>}
                          <span className="sm:hidden">
                            {" · "}
                            {b.pax != null ? t("paxCount", { count: b.pax }) : ""} {name}
                          </span>
                        </span>
                        <span className="hidden text-sm tabular-nums text-slate-600 sm:block">
                          {b.pax != null ? t("paxCount", { count: b.pax }) : "—"}
                        </span>
                        <span className="hidden truncate text-sm text-slate-600 sm:block">{name}</span>
                      </button>
                      {b.lead?.conversation_id && (
                        <Link
                          href={`/conversations/${b.lead.conversation_id}`}
                          aria-label={t("openChat", { name })}
                          title={t("openChat", { name })}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-navy-900"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[11px] text-slate-400">{t("pageHint")}</p>
          </div>
        )}
      </div>

      {selected && (
        <>
          <div onClick={() => setSelected(null)} className="fixed inset-0 z-30 bg-navy-900/25" />
          <aside
            aria-label={t("editTitle")}
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("editTitle")}</p>
                <h2 className="truncate font-display text-xl font-extrabold text-navy-900">
                  {selected.lead?.contact?.name || selected.lead?.contact?.phone || t("unknownContact")}
                </h2>
                {selected.lead?.contact?.name && <p className="text-xs text-slate-400">{selected.lead.contact.phone}</p>}
              </div>
              <button onClick={() => setSelected(null)} aria-label={t("close")} className="px-2 text-2xl leading-none text-slate-400 hover:text-navy-900">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <BookingForm
                key={selected.id}
                leadId={selected.lead_id}
                bookingId={selected.id}
                initial={selected}
                onDone={() => setSelected(null)}
                onCancel={() => setSelected(null)}
              />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
