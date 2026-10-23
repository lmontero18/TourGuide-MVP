"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { usePickups } from "@/hooks/usePickups";
import { useBookingMutations, type BookingInput } from "@/hooks/useBookings";
import { departuresOf, pickupTimeFor } from "@/lib/bookings/prefill";
import { normalizeTime } from "@/lib/pickups/grid";
import type { Tour } from "@/types";

interface BookingFormProps {
  leadId: string;
  initial: BookingInput;
  bookingId?: string;
  onDone: () => void;
  onCancel?: () => void;
}

// Una reserva: tour, dia, salida, personas, hotel y hora de recogida. La hora
// se calcula con Tours › Recogidas (la misma busqueda que usa el bot) mientras
// el equipo no la escriba a mano.
export default function BookingForm({ leadId, initial, bookingId, onDone, onCancel }: BookingFormProps) {
  const t = useTranslations("dashboard.bookings");
  const { data: org } = useOrganization();
  const { data: pickups } = usePickups(true);
  const { create, update, remove } = useBookingMutations();
  const catalog = useMemo(() => (Array.isArray(org?.tours) ? org.tours : []) as Tour[], [org]);

  const [tourName, setTourName] = useState(initial.tour_name);
  const [date, setDate] = useState(initial.date);
  const [departure, setDeparture] = useState(initial.departure ?? "");
  const [pax, setPax] = useState(initial.pax != null ? String(initial.pax) : "");
  const [place, setPlace] = useState(initial.place ?? "");
  // null = usar la hora calculada. Al editar una reserva se respeta la guardada.
  const [manualTime, setManualTime] = useState<string | null>(bookingId ? initial.pickup_time ?? "" : null);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [saving, setSaving] = useState(false);

  const tour = catalog.find((x) => x.name.trim().toLowerCase() === tourName.trim().toLowerCase()) ?? null;
  const departures = departuresOf(pickups, tour?.id ?? null);
  const suggested = pickupTimeFor(pickups, catalog, tourName, place, departure || null);
  const time = manualTime ?? suggested ?? "";
  const places = useMemo(() => [...new Set((pickups?.places ?? []).map((p) => p.name))].sort(), [pickups]);

  const save = async () => {
    if (!tourName.trim()) return toast.error(t("tourRequired"));
    if (!date) return toast.error(t("dateRequired"));
    const paxNumber = pax.trim() ? Number(pax) : null;
    if (paxNumber !== null && (!Number.isInteger(paxNumber) || paxNumber < 1 || paxNumber > 500)) return toast.error(t("paxInvalid"));
    const pickupTime = time.trim() ? normalizeTime(time) : null;
    if (time.trim() && !pickupTime) return toast.error(t("timeInvalid"));

    const input: BookingInput = {
      tour_id: tour?.id ?? null,
      tour_name: tour?.name ?? tourName.trim(),
      date,
      departure: departure.trim() || null,
      pax: paxNumber,
      place: place.trim() || null,
      pickup_time: pickupTime,
      notes: notes.trim() || null,
    };
    setSaving(true);
    const res = bookingId ? await update(bookingId, input) : await create(leadId, input);
    setSaving(false);
    if (!res.ok) return toast.error(res.error || t("saveError"));
    toast.success(t("saved"));
    onDone();
  };

  const destroy = async () => {
    if (!bookingId || !window.confirm(t("deleteConfirm"))) return;
    const res = await remove(bookingId);
    if (!res.ok) return toast.error(res.error || t("saveError"));
    onDone();
  };

  const label = "text-xs font-semibold text-slate-500";
  const input =
    "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-slate-400";

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="booking-tour" className={label}>{t("tour")}</label>
        <input
          id="booking-tour"
          list="booking-tours"
          value={tourName}
          onChange={(e) => setTourName(e.target.value)}
          placeholder={t("tourPlaceholder")}
          className={input}
        />
        <datalist id="booking-tours">
          {catalog.map((x) => <option key={x.id} value={x.name} />)}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="booking-date" className={label}>{t("date")}</label>
          <input id="booking-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="booking-departure" className={label}>{t("departure")}</label>
          {departures.length > 0 ? (
            <select id="booking-departure" value={departure} onChange={(e) => setDeparture(e.target.value)} className={input}>
              <option value="">{t("departureChoose")}</option>
              {[...new Set([...(departure && !departures.includes(departure) ? [departure] : []), ...departures])].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <input id="booking-departure" value={departure} onChange={(e) => setDeparture(e.target.value)} placeholder="7:30" className={input} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
        <div>
          <label htmlFor="booking-pax" className={label}>{t("pax")}</label>
          <input id="booking-pax" inputMode="numeric" value={pax} onChange={(e) => setPax(e.target.value)} placeholder="2" className={`${input} tabular-nums`} />
        </div>
        <div>
          <label htmlFor="booking-place" className={label}>{t("place")}</label>
          <input id="booking-place" list="booking-places" value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("placePlaceholder")} className={input} />
          <datalist id="booking-places">
            {places.map((p) => <option key={p} value={p} />)}
          </datalist>
        </div>
      </div>

      <div>
        <label htmlFor="booking-time" className={label}>{t("pickupTime")}</label>
        <input
          id="booking-time"
          value={time}
          onChange={(e) => setManualTime(e.target.value)}
          placeholder={t("pickupTimePending")}
          className={`${input} w-32 tabular-nums`}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          {manualTime === null && suggested
            ? t("pickupTimeFromTable")
            : manualTime !== null && suggested && manualTime !== suggested
              ? (
                <button type="button" onClick={() => setManualTime(null)} className="font-semibold text-slate-500 underline">
                  {t("pickupTimeUseTable", { time: suggested })}
                </button>
              )
              : !time.trim() && t("pickupTimeHint")}
        </p>
      </div>

      <div>
        <label htmlFor="booking-notes" className={label}>{t("notes")}</label>
        <textarea id="booking-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} className={`${input} resize-none`} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {saving ? t("saving") : bookingId ? t("saveChanges") : t("create")}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-2 text-xs font-semibold text-slate-500 hover:text-navy-900">
            {t("cancel")}
          </button>
        )}
        {bookingId && (
          <button onClick={destroy} className="ml-auto px-2 text-xs font-semibold text-red-600 hover:text-red-700">
            {t("delete")}
          </button>
        )}
      </div>
    </div>
  );
}
