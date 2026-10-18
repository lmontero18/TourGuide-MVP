"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { PickupData, Tour } from "@/types";
import type { PickupDraft, SlotKind } from "@/lib/pickups/parseSheet";
import { draftToPickups, suggestMatches, type MatchQuality } from "@/lib/pickups/fromDraft";

interface PickupsImportProps {
  draft: PickupDraft;
  fileName: string;
  tours: Tour[];
  replacing: boolean;
  onSave: (data: PickupData) => Promise<boolean>;
  onCancel: () => void;
}

// Revision del Excel importado: a que tour corresponde cada columna y el
// nombre de cada zona. Nada se guarda hasta "Guardar".
export default function PickupsImport({ draft, fileName, tours, replacing, onSave, onCancel }: PickupsImportProps) {
  const t = useTranslations("dashboard.tours.pickups");
  const ti = useTranslations("dashboard.tours.pickups.import");
  const suggested = useMemo(() => suggestMatches(draft.columns, tours), [draft.columns, tours]);
  const [mapping, setMapping] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(Object.entries(suggested).map(([key, m]) => [key, m.tourId]))
  );
  const [zoneNames, setZoneNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(draft.zones.map((z) => [z.key, z.hotels.length > 1 ? ti("zoneDefault", { hotel: z.hotels[0].name }) : z.hotels[0].name]))
  );
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const named = useMemo(() => tours.filter((tour) => tour.name.trim()), [tours]);
  const used = new Set(Object.values(mapping).filter(Boolean));
  const mapped = draft.columns.filter((c) => mapping[c.key]).length;
  const operators = new Set(draft.columns.map((c) => c.operator).filter(Boolean)).size;
  const own = draft.columns.filter((c) => !c.operator).length;

  const slotLabel = (kind: SlotKind | null, n: number, count: number) => {
    const base = kind ? t(`slots.${kind}`) : t("slots.departure");
    return count > 1 || !kind ? `${base} ${n}` : base;
  };

  const status = (key: string): { label: string; className: string } => {
    if (!mapping[key]) return { label: ti("notUsed"), className: "text-slate-400" };
    const quality: MatchQuality | null = suggested[key]?.tourId === mapping[key] ? suggested[key].quality : "exact";
    return quality === "partial"
      ? { label: ti("check"), className: "text-amber-700" }
      : { label: ti("matches"), className: "text-emerald-700" };
  };

  const save = async () => {
    setSaving(true);
    setFailed(false);
    const ok = await onSave(draftToPickups(draft, mapping, zoneNames, slotLabel));
    setSaving(false);
    if (!ok) setFailed(true);
  };

  const stats = [
    { value: draft.hotelCount, label: ti("statHotels") },
    { value: draft.zones.length, label: ti("statZones") },
    { value: own, label: ti("statOwn") },
    { value: operators, label: ti("statOperators") },
  ];

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onCancel} className="text-xs font-semibold text-blue-600 hover:text-blue-700">← {ti("back")}</button>
        <h2 className="mt-2 font-display text-xl font-bold text-navy-900">{ti("title")}</h2>
        <p className="mt-1 text-sm text-slate-500">{ti("subtitle", { file: fileName, sheets: draft.sheetCount })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="font-display text-2xl font-bold tabular-nums text-navy-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-bold text-navy-900">{ti("columnsTitle")}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{ti("columnsHint", { mapped, total: draft.columns.length })}</p>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-slate-500">
                  <th scope="col" className="px-5 py-2 font-medium">{ti("colExcel")}</th>
                  <th scope="col" className="px-2 py-2 font-medium">{ti("colDepartures")}</th>
                  <th scope="col" className="px-2 py-2 font-medium">{ti("colTour")}</th>
                  <th scope="col" className="px-5 py-2 font-medium">{ti("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {draft.columns.map((column) => {
                  const st = status(column.key);
                  return (
                    <tr key={column.key} className={`border-t border-slate-100 ${st.className === "text-amber-700" ? "bg-amber-50" : ""}`}>
                      <td className="px-5 py-2">
                        <span className="block font-mono text-xs text-slate-700">{column.label}</span>
                        {column.operator && <span className="text-[11px] text-slate-400">{column.operator}</span>}
                      </td>
                      <td className="px-2 py-2 tabular-nums text-slate-500">{column.slots.length}</td>
                      <td className="px-2 py-2">
                        <select
                          value={mapping[column.key] ?? ""}
                          onChange={(e) => setMapping({ ...mapping, [column.key]: e.target.value || null })}
                          aria-label={ti("tourFor", { column: column.label })}
                          className="w-full min-w-48 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-navy-900 outline-none focus:border-blue-500"
                        >
                          <option value="">{ti("notUsedOption")}</option>
                          {named.map((tour) => (
                            <option key={tour.id} value={tour.id} disabled={used.has(tour.id) && mapping[column.key] !== tour.id}>
                              {tour.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`px-5 py-2 text-xs font-semibold ${st.className}`}>{st.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-bold text-navy-900">{ti("zonesTitle")}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{ti("zonesHint")}</p>
          </div>
          <div className="max-h-[520px] divide-y divide-slate-100 overflow-auto">
            {draft.zones.map((zone) => (
              <div key={zone.key} className="space-y-1 px-5 py-3">
                <div className="flex items-center gap-2">
                  <input
                    value={zoneNames[zone.key] ?? ""}
                    onChange={(e) => setZoneNames({ ...zoneNames, [zone.key]: e.target.value })}
                    aria-label={ti("zoneName")}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm font-semibold text-navy-900 outline-none focus:border-blue-500"
                  />
                  <span className="shrink-0 text-xs text-slate-500">{t("placesCount", { count: zone.hotels.length })}</span>
                </div>
                <p className="text-xs text-slate-500">{zone.hotels.map((h) => h.name).join(", ")}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {failed && <span className="text-sm font-semibold text-red-600">{ti("saveError")}</span>}
        {replacing && <span className="text-xs text-amber-800">{ti("replaces")}</span>}
        <button onClick={onCancel} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-900 hover:bg-slate-50">
          {t("cancel")}
        </button>
        <button
          onClick={save}
          disabled={saving || !mapped}
          className="h-10 rounded-lg bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-40"
        >
          {saving ? ti("saving") : ti("save", { zones: draft.zones.length, hotels: draft.hotelCount })}
        </button>
      </div>
    </div>
  );
}
