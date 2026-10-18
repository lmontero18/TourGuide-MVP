"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PickupData, PickupTour, Tour } from "@/types";
import type { PickupDraft } from "@/lib/pickups/parseSheet";
import { importPickupsFile, usePickups } from "@/hooks/usePickups";
import { fold, indexTimes, NO_PICKUP, normalizeTime, setTime, timeKey } from "@/lib/pickups/grid";
import SaveStatus, { type SaveState } from "./SaveStatus";
import PickupsImport from "./PickupsImport";

const AUTOSAVE_MS = 1000;

interface PickupsTabProps {
  tours: Tour[];
}

// Tours › Recogidas (flag `pickups`): hora de recogida por zona de hoteles,
// tour y salida, con horas propias por hotel. Lo normal es importar el Excel
// que la agencia ya usa; armarla a mano queda como alternativa.
export default function PickupsTab({ tours }: PickupsTabProps) {
  const t = useTranslations("dashboard.tours.pickups");
  const { data, isError, save } = usePickups(true);
  const [imported, setImported] = useState<{ draft: PickupDraft; fileName: string } | null>(null);
  const [version, setVersion] = useState(0);

  if (isError) return <p className="text-sm text-red-600">{t("loadError")}</p>;
  if (!data) return <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />;

  if (imported) {
    return (
      <PickupsImport
        draft={imported.draft}
        fileName={imported.fileName}
        tours={tours}
        replacing={data.zones.length > 0 || data.tours.length > 0}
        onCancel={() => setImported(null)}
        onSave={async (next) => {
          const ok = await save(next);
          if (ok) {
            setImported(null);
            setVersion((v) => v + 1);
          }
          return ok;
        }}
      />
    );
  }

  return (
    <PickupsEditor
      key={version}
      initial={data}
      tours={tours}
      save={save}
      onImported={(draft, fileName) => setImported({ draft, fileName })}
    />
  );
}

interface EditorProps {
  initial: PickupData;
  tours: Tour[];
  save: (data: PickupData, keepalive?: boolean) => Promise<boolean>;
  onImported: (draft: PickupDraft, fileName: string) => void;
}

type Dialog = { mode: "pick" } | { mode: "settings"; tourId: string } | null;

function PickupsEditor({ initial, tours, save, onImported }: EditorProps) {
  const t = useTranslations("dashboard.tours.pickups");
  const [data, setData] = useState<PickupData>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [manual, setManual] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  const [ownRows, setOwnRows] = useState<Set<string>>(new Set());
  const [focusZone, setFocusZone] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  // Autoguardado igual que el resto de Tours: debounce + un PUT en vuelo.
  const latest = useRef(data);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);
  const queued = useRef(false);
  const tourIds = useMemo(() => new Set(tours.map((tour) => tour.id)), [tours]);

  const flush = useCallback(async (keepalive = false) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inflight.current) {
      queued.current = true;
      return;
    }
    inflight.current = true;
    setSaveState("saving");
    let ok = true;
    do {
      queued.current = false;
      const current = latest.current;
      // Una zona sin nombre todavia no se guarda; un tour borrado en la
      // pestaña Tours sale tambien de la tabla.
      const zones = current.zones.filter((z) => z.name.trim());
      const zoneIds = new Set(zones.map((z) => z.id));
      const payload: PickupData = {
        zones: zones.map((zone, i) => ({ ...zone, name: zone.name.trim(), sort: i })),
        places: current.places.filter((p) => zoneIds.has(p.zone_id)),
        tours: current.tours.filter((x) => tourIds.has(x.tour_id)).map((x, i) => ({ ...x, sort: i })),
        times: current.times.filter((x) => tourIds.has(x.tour_id) && zoneIds.has(x.zone_id)),
      };
      ok = await save(payload, keepalive);
    } while (queued.current);
    inflight.current = false;
    setSaveState(ok ? "saved" : "error");
  }, [save, tourIds]);

  const edit = useCallback((update: (prev: PickupData) => PickupData) => {
    setData((prev) => {
      const next = update(prev);
      latest.current = next;
      return next;
    });
    setSaveState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  }, [flush]);

  useEffect(() => () => {
    if (timer.current) void flush(true);
  }, [flush]);

  const tourName = useMemo(() => new Map(tours.map((tour) => [tour.id, tour.name])), [tours]);
  const times = useMemo(() => indexTimes(data.times), [data.times]);
  const operators = useMemo(
    () => [...new Set(data.tours.map((x) => x.operator).filter((x): x is string => !!x))].sort(),
    [data.tours]
  );

  // Tours de la tabla que siguen existiendo en la pestaña Tours.
  const listed = useMemo(() => data.tours.filter((x) => tourName.has(x.tour_id)), [data.tours, tourName]);
  const selected = listed.find((x) => x.tour_id === selectedId) ?? listed[0] ?? null;

  // Celdas de zona sin cargar por tour: el bot pasa esas preguntas al equipo.
  const pendingByTour = useMemo(() => {
    const map = new Map<string, number>();
    for (const tour of listed) {
      map.set(
        tour.tour_id,
        data.zones.reduce((n, zone) => n + tour.departures.filter((_, i) => !times.has(timeKey(tour.tour_id, i, zone.id))).length, 0)
      );
    }
    return map;
  }, [listed, data.zones, times]);

  const placesByZone = useMemo(() => {
    const map = new Map<string, PickupData["places"]>();
    for (const place of data.places) map.set(place.zone_id, [...(map.get(place.zone_id) ?? []), place]);
    return map;
  }, [data.places]);

  const zones = useMemo(() => {
    const q = fold(query);
    if (!q) return data.zones;
    return data.zones.filter(
      (zone) =>
        fold(zone.name).includes(q) ||
        (placesByZone.get(zone.id) ?? []).some((p) => fold(p.name).includes(q) || p.aliases.some((a) => fold(a).includes(q)))
    );
  }, [data.zones, placesByZone, query]);

  // Al buscar un hotel se abre su zona para que se vea.
  const isOpen = (zoneId: string) => openZones.has(zoneId) || (!!query.trim() && zones.length <= 3);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const addZone = () => {
    const id = crypto.randomUUID();
    edit((prev) => ({ ...prev, zones: [...prev.zones, { id, name: "", sort: prev.zones.length }] }));
    setOpenZones((prev) => new Set(prev).add(id));
    setFocusZone(id);
    setManual(true);
  };

  const removeZone = (zoneId: string) =>
    edit((prev) => ({
      ...prev,
      zones: prev.zones.filter((z) => z.id !== zoneId),
      places: prev.places.filter((p) => p.zone_id !== zoneId),
      times: prev.times.filter((x) => x.zone_id !== zoneId),
    }));

  const renameZone = (zoneId: string, name: string) =>
    edit((prev) => ({ ...prev, zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, name } : z)) }));

  const addPlace = (zoneId: string, name: string) =>
    edit((prev) => ({ ...prev, places: [...prev.places, { id: crypto.randomUUID(), zone_id: zoneId, name, aliases: [] }] }));

  const removePlace = (placeId: string) =>
    edit((prev) => ({
      ...prev,
      places: prev.places.filter((p) => p.id !== placeId),
      times: prev.times.filter((x) => x.place_id !== placeId),
    }));

  // "Usar las de la zona" en un hotel: saca sus horas propias de este tour.
  const clearOwnTimes = (placeId: string, tourId: string) => {
    edit((prev) => ({ ...prev, times: prev.times.filter((x) => !(x.place_id === placeId && x.tour_id === tourId)) }));
    setOwnRows((prev) => {
      const next = new Set(prev);
      next.delete(placeId);
      return next;
    });
  };

  // Lista de tours con casillas: los marcados quedan en la tabla.
  const pickTours = (ids: string[]) => {
    edit((prev) => {
      const keep = prev.tours.filter((x) => ids.includes(x.tour_id));
      const added: PickupTour[] = ids
        .filter((id) => !prev.tours.some((x) => x.tour_id === id))
        .map((id, i) => ({ tour_id: id, departures: [t("slots.morning")], operator: null, sort: keep.length + i }));
      return { ...prev, tours: [...keep, ...added], times: prev.times.filter((x) => ids.includes(x.tour_id)) };
    });
    const firstNew = ids.find((id) => !data.tours.some((x) => x.tour_id === id));
    if (firstNew) setSelectedId(firstNew);
    setManual(true);
  };

  const updateTour = (next: PickupTour) =>
    edit((prev) => ({
      ...prev,
      tours: prev.tours.map((x) => (x.tour_id === next.tour_id ? next : x)),
      // Si se sacaron salidas, sus horas ya no tienen columna.
      times: prev.times.filter((x) => x.tour_id !== next.tour_id || x.departure < next.departures.length),
    }));

  const settingsTour = dialog?.mode === "settings" ? data.tours.find((x) => x.tour_id === dialog.tourId) ?? null : null;
  const isEmpty = !data.zones.length && !data.tours.length;

  if (isEmpty && !manual) {
    return <ImportHero onImported={onImported} onManual={() => setManual(true)} />;
  }

  const summary = (tour: PickupTour) => {
    const pending = pendingByTour.get(tour.tour_id) ?? 0;
    return [
      tour.operator ? t("byOperator", { name: tour.operator }) : t("ownTour"),
      t("departuresCount", { count: tour.departures.length }),
      pending ? t("pendingCount", { count: pending }) : t("allFilled"),
    ].join(" · ");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="h-9 w-64 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <p className="text-sm text-slate-500">{t("counts", { zones: data.zones.length, places: data.places.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveStatus state={saveState} onRetry={() => void flush()} />
          <UploadButton onImported={onImported} variant="secondary" />
          <button onClick={addZone} className="h-9 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white hover:bg-navy-800">
            {t("addZone")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section aria-label={t("toursTitle")} className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:w-72 lg:shrink-0">
          <p className="px-4 pb-2 pt-3.5 text-xs font-semibold text-slate-500">{t("toursTitle")}</p>
          {listed.map((tour) => {
            const active = tour.tour_id === selected?.tour_id;
            const pending = pendingByTour.get(tour.tour_id) ?? 0;
            return (
              <button
                key={tour.tour_id}
                onClick={() => setSelectedId(tour.tour_id)}
                aria-current={active}
                className={`flex w-full items-center justify-between gap-3 border-l-[3px] border-t border-t-slate-100 px-4 py-3 text-left transition-colors ${
                  active ? "border-l-navy-900 bg-slate-50" : "border-l-transparent hover:bg-slate-50"
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-sm text-navy-900 ${active ? "font-bold" : "font-medium"}`}>{tourName.get(tour.tour_id)}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {[tour.operator, tour.departures.join(" · ")].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {pending > 0 && (
                  <span title={t("pendingCount", { count: pending })} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold tabular-nums text-amber-800">
                    {pending}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setDialog({ mode: "pick" })}
            className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-blue-600 hover:bg-slate-50 hover:text-blue-700"
          >
            {t("addTour")}
          </button>
        </section>

        <section className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {!selected ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-bold text-navy-900">{t("noTourSelected")}</p>
              <button onClick={() => setDialog({ mode: "pick" })} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                {t("pickToursCta")}
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-navy-900">{tourName.get(selected.tour_id)}</h2>
                  <p className="mt-0.5 text-[13px] text-slate-500">{summary(selected)}</p>
                </div>
                <button
                  onClick={() => setDialog({ mode: "settings", tourId: selected.tour_id })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-900 hover:border-slate-300 hover:bg-slate-50"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  {t("tourSettings")}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500">
                      <th scope="col" className="px-5 py-3 text-left font-semibold">{t("zone")}</th>
                      {selected.departures.map((label, i) => (
                        <th key={i} scope="col" className="w-28 px-5 py-3 text-right font-semibold">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!data.zones.length && (
                      <tr className="border-t border-slate-100">
                        <td colSpan={selected.departures.length + 1} className="px-5 py-6">
                          <button onClick={addZone} className="text-sm font-semibold text-blue-600 hover:text-blue-700">{t("addZoneCta")}</button>
                          <p className="mt-1 text-xs text-slate-500">{t("addZoneHint")}</p>
                        </td>
                      </tr>
                    )}
                    {zones.map((zone) => {
                      const open = isOpen(zone.id);
                      const places = placesByZone.get(zone.id) ?? [];
                      const exceptions = places.filter(
                        (p) => ownRows.has(p.id) || data.times.some((x) => x.place_id === p.id && x.tour_id === selected.tour_id)
                      );
                      return (
                        <Fragment key={zone.id}>
                          <tr className={`border-t border-slate-100 ${open ? "bg-slate-50" : ""}`}>
                            <th scope="row" className="px-3 py-1.5 text-left font-semibold">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setOpenZones((prev) => toggle(prev, zone.id))}
                                  aria-expanded={open}
                                  aria-label={open ? t("collapse") : t("expand")}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] text-slate-400 hover:bg-slate-100"
                                >
                                  {open ? "▾" : "▸"}
                                </button>
                                <ZoneName name={zone.name} autoFocus={focusZone === zone.id} onChange={(name) => renameZone(zone.id, name)} />
                                <span className="shrink-0 pr-2 text-xs font-normal text-slate-400">{t("placesCount", { count: places.length })}</span>
                              </div>
                            </th>
                            {selected.departures.map((label, i) => (
                              <td key={i} className="px-3 py-1.5 text-right">
                                <PickupCell
                                  value={times.get(timeKey(selected.tour_id, i, zone.id)) ?? null}
                                  label={`${zone.name} · ${label}`}
                                  onChange={(time) => edit((prev) => setTime(prev, selected.tour_id, i, zone.id, null, time))}
                                />
                              </td>
                            ))}
                          </tr>
                          {open && (
                            <tr className="bg-slate-50">
                              <td colSpan={selected.departures.length + 1} className="pb-3 pl-12 pr-5 pt-1">
                                <ZonePanel
                                  places={places}
                                  ownRows={ownRows}
                                  onAddPlace={(name) => addPlace(zone.id, name)}
                                  onRemovePlace={removePlace}
                                  onToggleOwn={(placeId) => setOwnRows((prev) => toggle(prev, placeId))}
                                  onRemoveZone={() => removeZone(zone.id)}
                                />
                              </td>
                            </tr>
                          )}
                          {open &&
                            exceptions.map((place) => (
                              <tr key={place.id} className="bg-amber-50">
                                <th scope="row" className="py-2 pl-12 pr-5 text-left font-medium text-navy-900">
                                  {place.name}
                                  <span className="ml-2 text-xs font-normal text-amber-800">{t("ownTimes")}</span>
                                  <button onClick={() => clearOwnTimes(place.id, selected.tour_id)} className="ml-2 text-xs font-normal text-amber-800 underline hover:text-amber-900">
                                    {t("useZoneTimes")}
                                  </button>
                                </th>
                                {selected.departures.map((label, i) => (
                                  <td key={i} className="px-3 py-1.5 text-right">
                                    <PickupCell
                                      value={times.get(timeKey(selected.tour_id, i, zone.id, place.id)) ?? null}
                                      inherited={times.get(timeKey(selected.tour_id, i, zone.id)) ?? null}
                                      label={`${place.name} · ${label}`}
                                      onChange={(time) => edit((prev) => setTime(prev, selected.tour_id, i, zone.id, place.id, time))}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                <span>{t("cellHint")}</span>
                <span>
                  <strong className="font-semibold text-slate-500">{t("cellNone")}</strong> {t("legendNone")} ·{" "}
                  <strong className="font-bold text-amber-500">—</strong> {t("legendPending")}
                </span>
              </div>
            </>
          )}
        </section>
      </div>

      {dialog?.mode === "pick" && (
        <TourPicker
          tours={tours}
          selected={data.tours.map((x) => x.tour_id)}
          onSave={(ids) => {
            pickTours(ids);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {settingsTour && (
        <TourSettings
          key={settingsTour.tour_id}
          name={tourName.get(settingsTour.tour_id) ?? ""}
          tour={settingsTour}
          operators={operators}
          onSave={(next) => {
            updateTour(next);
            setDialog(null);
          }}
          onRemove={() => {
            pickTours(data.tours.filter((x) => x.tour_id !== settingsTour.tour_id).map((x) => x.tour_id));
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// Pantalla vacia: el camino principal es subir el Excel que ya usan.
function ImportHero({ onImported, onManual }: { onImported: EditorProps["onImported"]; onManual: () => void }) {
  const t = useTranslations("dashboard.tours.pickups");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
      <h2 className="font-display text-xl font-bold text-navy-900">{t("heroTitle")}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{t("heroText")}</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <UploadButton onImported={onImported} variant="primary" />
        <button onClick={onManual} className="text-sm font-semibold text-slate-500 underline hover:text-navy-900">{t("heroManual")}</button>
      </div>
    </div>
  );
}

function UploadButton({ onImported, variant }: { onImported: EditorProps["onImported"]; variant: "primary" | "secondary" }) {
  const t = useTranslations("dashboard.tours.pickups");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const res = await importPickupsFile(file);
    setBusy(false);
    if (input.current) input.current.value = "";
    if (res.draft) onImported(res.draft, file.name);
    else setError(res.error || t("uploadError"));
  };

  return (
    <span className={`inline-flex flex-col ${variant === "primary" ? "items-center" : "items-end"}`}>
      <input ref={input} type="file" accept=".xlsx" className="sr-only" tabIndex={-1} onChange={(e) => void upload(e.target.files?.[0])} />
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className={
          variant === "primary"
            ? "h-11 rounded-lg bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
            : "h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-900 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        }
      >
        {busy ? t("uploading") : variant === "primary" ? t("uploadCta") : t("importExcel")}
      </button>
      {error && <span role="alert" className="mt-1 max-w-xs text-xs text-red-600">{error}</span>}
    </span>
  );
}

// Nombre de la zona editable en la misma fila. Una zona nueva arranca vacia y
// con el cursor puesto.
function ZoneName({ name, autoFocus, onChange }: { name: string; autoFocus: boolean; onChange: (name: string) => void }) {
  const t = useTranslations("dashboard.tours.pickups");
  const [draft, setDraft] = useState(name);
  const [shown, setShown] = useState(name);
  if (shown !== name) {
    setShown(name);
    setDraft(name);
  }
  return (
    <input
      value={draft}
      autoFocus={autoFocus}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft.trim() !== name && onChange(draft.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder={t("zoneNamePlaceholder")}
      aria-label={t("zoneName")}
      className="h-7 w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-semibold text-navy-900 outline-none placeholder:font-normal placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-500 focus:bg-white"
    />
  );
}

// Una celda de la tabla. Click abre un menu con los tres estados: una hora,
// "No recoge" o "Pendiente" (sin cargar). En la fila de un hotel con horas
// propias, la tercera opcion es "Igual que la zona" y se ve la hora heredada.
function PickupCell({ value, inherited, label, onChange }: {
  value: string | null;
  inherited?: string | null;
  label: string;
  onChange: (time: string | null) => void;
}) {
  const t = useTranslations("dashboard.tours.pickups");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const isHotel = inherited !== undefined;

  // Menu en posicion fija: la tabla tiene scroll horizontal y lo cortaria.
  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left + rect.width / 2 - 104, window.innerWidth - 216)) });
    setDraft(value && value !== NO_PICKUP ? value : "");
    setInvalid(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "mousedown" && (menu.current?.contains(e.target as Node) || button.current?.contains(e.target as Node))) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (next: string | null) => {
    if (next !== value) onChange(next);
    setOpen(false);
    button.current?.focus();
  };

  const saveTime = () => {
    if (!draft.trim()) return;
    const time = normalizeTime(draft);
    if (!time) {
      setInvalid(true);
      return;
    }
    pick(time);
  };

  // Lo que se ve en la celda.
  const shown = value ?? (isHotel ? inherited : null);
  let content: React.ReactNode;
  if (shown === NO_PICKUP) {
    content = <span className={`text-xs font-medium ${value ? "text-slate-500" : "text-slate-300"}`}>{t("cellNone")}</span>;
  } else if (shown) {
    content = <span className={`text-sm tabular-nums ${value && isHotel ? "font-bold text-amber-800" : value ? "font-medium text-navy-900" : "text-slate-300"}`}>{shown}</span>;
  } else {
    content = (
      <span title={t("cellPending")} className="text-base font-bold leading-none text-amber-400">
        —<span className="sr-only">{t("cellPending")}</span>
      </span>
    );
  }

  const option = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${active ? "bg-slate-100 font-semibold text-navy-900" : "text-slate-700 hover:bg-slate-50"}`;

  return (
    <>
      <button
        ref={button}
        onClick={() => (open ? setOpen(false) : show())}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="ml-auto flex h-9 w-full max-w-20 items-center justify-end rounded-md border border-transparent px-2 hover:border-slate-200 hover:bg-white focus-visible:border-blue-500 focus-visible:outline-none"
      >
        {content}
      </button>
      {open && pos && (
        <div
          ref={menu}
          role="dialog"
          aria-label={label}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-52 space-y-1 rounded-xl border border-slate-200 bg-white p-2 text-left shadow-xl"
        >
          <label className="block px-1 pb-1">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">{t("cellTimeLabel")}</span>
            <span className="flex gap-1.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setInvalid(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && saveTime()}
                placeholder="7:30"
                inputMode="numeric"
                aria-invalid={invalid}
                className={`h-9 min-w-0 flex-1 rounded-lg border px-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-blue-500/20 ${invalid ? "border-red-400" : "border-slate-200 focus:border-blue-500"}`}
              />
              <button onClick={saveTime} className="h-9 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white hover:bg-navy-800">{t("cellOk")}</button>
            </span>
            {invalid && <span className="mt-1 block text-[11px] text-red-600">{t("cellInvalid")}</span>}
          </label>
          <div className="border-t border-slate-100 pt-1">
            <button onClick={() => pick(NO_PICKUP)} className={option(value === NO_PICKUP)}>
              <span className="w-5 text-center text-slate-400">✕</span>
              <span className="text-xs">{t("cellNone")} <span className="text-slate-400">· {t("cellNoneHint")}</span></span>
            </button>
            <button onClick={() => pick(null)} className={option(value === null)}>
              {isHotel ? (
                <span className="text-xs">{t("cellInherit")}{inherited ? ` (${inherited === NO_PICKUP ? t("cellNone") : inherited})` : ""}</span>
              ) : (
                <>
                  <span className="w-5 text-center font-bold text-amber-400">—</span>
                  <span className="text-xs">{t("cellPending")} <span className="text-slate-400">· {t("cellPendingHint")}</span></span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ZonePanel({ places, ownRows, onAddPlace, onRemovePlace, onToggleOwn, onRemoveZone }: {
  places: PickupData["places"];
  ownRows: Set<string>;
  onAddPlace: (name: string) => void;
  onRemovePlace: (id: string) => void;
  onToggleOwn: (id: string) => void;
  onRemoveZone: () => void;
}) {
  const t = useTranslations("dashboard.tours.pickups");
  const [newPlace, setNewPlace] = useState("");
  const [confirming, setConfirming] = useState(false);

  const add = () => {
    const value = newPlace.trim();
    if (!value) return;
    onAddPlace(value);
    setNewPlace("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-slate-500">{t("placesLabel")}</span>
        {places.map((place) => (
          <span key={place.id} className={`inline-flex items-center rounded-full border text-xs ${ownRows.has(place.id) ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
            <button onClick={() => onToggleOwn(place.id)} title={t("ownTimesHint")} className="py-1 pl-2.5 pr-1 text-slate-700 hover:text-navy-900">
              {place.name}
            </button>
            <button onClick={() => onRemovePlace(place.id)} aria-label={t("removePlace", { name: place.name })} className="px-1.5 text-slate-400 hover:text-red-600">×</button>
          </span>
        ))}
        <input
          value={newPlace}
          onChange={(e) => setNewPlace(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          onBlur={add}
          placeholder={t("addPlace")}
          aria-label={t("addPlace")}
          className="h-7 w-44 rounded-full border border-dashed border-slate-300 bg-transparent px-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">{t("ownTimesHint")}</p>
        {confirming ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">{t("removeZoneConfirm")}</span>
            <button onClick={onRemoveZone} className="font-semibold text-red-600 hover:text-red-700">{t("removeZone")}</button>
            <button onClick={() => setConfirming(false)} className="text-slate-500 hover:text-navy-900">{t("cancel")}</button>
          </span>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-xs font-semibold text-slate-400 hover:text-red-600">{t("removeZone")}</button>
        )}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/25 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="font-display text-lg font-bold text-navy-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// "+ Tour": casillas con todos los tours; los marcados van a la tabla.
function TourPicker({ tours, selected, onSave, onClose }: {
  tours: Tour[];
  selected: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.tours.pickups");
  const [checked, setChecked] = useState<Set<string>>(new Set(selected));
  const named = tours.filter((tour) => tour.name.trim());

  return (
    <Modal title={t("pickTitle")} onClose={onClose}>
      <p className="text-sm text-slate-500">{t("pickHint")}</p>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {named.map((tour) => (
          <label key={tour.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-navy-900 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={checked.has(tour.id)}
              onChange={() =>
                setChecked((prev) => {
                  const next = new Set(prev);
                  if (next.has(tour.id)) next.delete(tour.id);
                  else next.add(tour.id);
                  return next;
                })
              }
              className="h-4 w-4 accent-navy-900"
            />
            {tour.name}
          </label>
        ))}
        {!named.length && <p className="text-sm text-slate-500">{t("noTours")}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-navy-900 hover:bg-slate-50">{t("cancel")}</button>
        <button
          onClick={() => onSave(named.filter((tour) => checked.has(tour.id)).map((tour) => tour.id))}
          className="h-9 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800"
        >
          {t("save")}
        </button>
      </div>
    </Modal>
  );
}

// Click en el nombre de un tour de la tabla: sus salidas y si lo hace otra empresa.
function TourSettings({ name, tour, operators, onSave, onRemove, onClose }: {
  name: string;
  tour: PickupTour;
  operators: string[];
  onSave: (tour: PickupTour) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.tours.pickups");
  const [departures, setDepartures] = useState<string[]>(tour.departures);
  const [external, setExternal] = useState(!!tour.operator);
  const [operator, setOperator] = useState(tour.operator ?? "");
  const clean = departures.map((d) => d.trim()).filter(Boolean);
  const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <Modal title={name} onClose={onClose}>
      <div>
        <span className="mb-1.5 block text-xs font-bold text-navy-900">{t("departures")}</span>
        <div className="space-y-2">
          {departures.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={label}
                onChange={(e) => setDepartures(departures.map((d, j) => (j === i ? e.target.value : d)))}
                aria-label={t("departureName", { n: i + 1 })}
                className={input}
              />
              {departures.length > 1 && (
                <button onClick={() => setDepartures(departures.filter((_, j) => j !== i))} aria-label={t("removeDeparture")} className="text-lg text-slate-400 hover:text-red-500">×</button>
              )}
            </div>
          ))}
        </div>
        {departures.length < 8 && (
          <button onClick={() => setDepartures([...departures, ""])} className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">{t("addDeparture")}</button>
        )}
        <p className="mt-1.5 text-xs text-slate-400">{t("departuresHint")}</p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} className="h-4 w-4 accent-navy-900" />
          {t("external")}
        </label>
        {external && (
          <>
            <input
              list="pickup-operators"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder={t("externalPlaceholder")}
              aria-label={t("externalPlaceholder")}
              className={input}
            />
            <datalist id="pickup-operators">
              {operators.map((o) => <option key={o} value={o} />)}
            </datalist>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button onClick={onRemove} className="text-sm font-semibold text-red-600 hover:text-red-700">{t("removeTour")}</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-navy-900 hover:bg-slate-50">{t("cancel")}</button>
          <button
            onClick={() => onSave({ ...tour, departures: clean, operator: external && operator.trim() ? operator.trim() : null })}
            disabled={!clean.length}
            className="h-9 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-40"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
