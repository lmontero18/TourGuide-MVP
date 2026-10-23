"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useOrganization } from "@/hooks/useOrganization";
import { useLeadBookings } from "@/hooks/useBookings";
import type { LeadWithContact } from "@/hooks/useLeads";
import { prefillFromLead } from "@/lib/bookings/prefill";
import type { Tour } from "@/types";
import BookingForm from "./BookingForm";
import { formatBookingDate } from "./bookingFormat";

interface LeadBookingsProps {
  lead: LeadWithContact;
}

// Reservas del lead en su ficha (flag `bookings`). Al marcarlo Reservado sin
// reservas, el formulario aparece abierto y ya llenado con lo que se hablo en
// el chat; el equipo revisa y guarda.
export default function LeadBookings({ lead }: LeadBookingsProps) {
  const t = useTranslations("dashboard.bookings");
  const locale = useLocale();
  const { data: bookings } = useLeadBookings(lead.id, true);
  const { data: org } = useOrganization();
  const catalog = useMemo(() => (Array.isArray(org?.tours) ? org.tours : []) as Tour[], [org]);
  // "new" = reserva nueva, un id = editando esa, null = cerrado. Sin elegir
  // nada se abre solo cuando el lead esta Reservado y no tiene reservas.
  const [open, setOpen] = useState<string | null | undefined>(undefined);
  const [skipped, setSkipped] = useState(false);

  if (!bookings) return null;
  const won = lead.status === "converted";
  if (!won && bookings.length === 0) return null;

  const editing = open === undefined ? (won && bookings.length === 0 && !skipped ? "new" : null) : open;
  const close = () => setOpen(null);

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-navy-900">{t("leadTitle")}</p>
        {editing === null && (
          <button onClick={() => setOpen("new")} className="text-xs font-semibold text-navy-900 hover:underline">
            {t("add")}
          </button>
        )}
      </div>

      {bookings.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {bookings.map((b) =>
            editing === b.id ? (
              <li key={b.id} className="rounded-lg bg-slate-50 p-3">
                <BookingForm leadId={lead.id} bookingId={b.id} initial={b} onDone={close} onCancel={close} />
              </li>
            ) : (
              <li key={b.id}>
                <button
                  onClick={() => setOpen(b.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy-900">
                      {b.tour_name}
                      {b.departure && <span className="font-normal text-slate-500"> · {b.departure}</span>}
                    </span>
                    <span className="block truncate text-slate-500">
                      {[b.pax != null ? t("paxCount", { count: b.pax }) : null, b.place].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-semibold text-navy-900">{formatBookingDate(b.date, locale)}</span>
                    <span className="block text-slate-500">{b.pickup_time ? t("pickupAt", { time: b.pickup_time }) : t("pickupPending")}</span>
                  </span>
                </button>
              </li>
            )
          )}
        </ul>
      )}

      {editing === "new" && (
        <div className={`${bookings.length > 0 ? "mt-3 border-t border-slate-100 pt-3" : "mt-2"}`}>
          {bookings.length === 0 && <p className="mb-3 text-xs text-slate-500">{t("leadAsk")}</p>}
          <BookingForm
            key={org ? "ready" : "loading"}
            leadId={lead.id}
            initial={prefillFromLead(lead, catalog)}
            onDone={close}
            onCancel={() => {
              setSkipped(true);
              close();
            }}
          />
        </div>
      )}
    </div>
  );
}
