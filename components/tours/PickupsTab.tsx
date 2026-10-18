"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PickupData, PickupTour, Tour } from "@/types";
import { usePickups } from "@/hooks/usePickups";
import { fold, indexTimes, normalizeTime, setTime, timeKey } from "@/lib/pickups/grid";
import SaveStatus, { type SaveState } from "./SaveStatus";

const AUTOSAVE_MS = 1000;

interface PickupsTabProps {
  tours: Tour[];
}

// Tours › Recogidas (flag `pickups`): hora de recogida por zona de hoteles,
// tour y salida, con excepciones por hotel. El bot la consulta para responder
// "¿a que hora me recogen?".
export default function PickupsTab({ tours }: PickupsTabProps) {
  const t = useTranslations("dashboard.tours.pickups");
  const { data, isError, save } = usePickups(true);
  if (isError) return <p className="text-sm text-red-600">{t("loadError")}</p>;
  if (!data) return <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />;
  return <PickupsEditor initial={data} tours={tours} save={save} />;
}

interface EditorProps {
  initial: PickupData;
  tours: Tour[];
  save: (data: PickupData, keepalive?: boolean) => Promise<boolean>;
}

type OperatorFilter = { kind: "all" } | { kind: "own" } | { kind: "operator"; name: string };
type Dialog = { mode: "add" } | { mode: "edit"; tourId: string } | null;

function PickupsEditor({ initial, tours, save }: EditorProps) {
  const t = useTranslations("dashboard.tours.pickups");
  const [data, setData] = useState<PickupData>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OperatorFilter>({ kind: "all" });
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  const [ownRows, setOwnRows] = useState<Set<string>>(new Set());
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
      // Un tour borrado en la pestaña Tours sale tambien de la tabla.
      const payload: PickupData = {
        zones: current.zones.map((zone, i) => ({ ...zone, sort: i })),
        places: current.places,
        tours: current.tours.filter((x) => tourIds.has(x.tour_id)).map((x, i) => ({ ...x, sort: i })),
        times: current.times.filter((x) => tourIds.has(x.tour_id)),
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

  const columns = useMemo(
    () =>
      data.tours.filter(
        (x) =>
          tourName.has(x.tour_id) &&
          (filter.kind === "all" ||
            (filter.kind === "own" && !x.operator) ||
            (filter.kind === "operator" && x.operator === filter.name))
      ),
    [data.tours, tourName, filter]
  );
  const slotCount = columns.reduce((n, x) => n + x.departures.length, 0);

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
    edit((prev) => ({ ...prev, zones: [...prev.zones, { id, name: t("newZone", { n: prev.zones.length + 1 }), sort: prev.zones.length }] }));
    setOpenZones((prev) => new Set(prev).add(id));
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

  const clearOwnTimes = (placeId: string) => {
    edit((prev) => ({ ...prev, times: prev.times.filter((x) => x.place_id !== placeId) }));
    setOwnRows((prev) => {
      const next = new Set(prev);
      next.delete(placeId);
      return next;
    });
  };

  const saveTour = (next: PickupTour) =>
    edit((prev) => {
      const exists = prev.tours.some((x) => x.tour_id === next.tour_id);
      return {
        ...prev,
        tours: exists ? prev.tours.map((x) => (x.tour_id === next.tour_id ? next : x)) : [...prev.tours, next],
        // Si se sacaron salidas, sus horas ya no tienen columna.
        times: prev.times.filter((x) => x.tour_id !== next.tour_id || x.departure < next.departures.length),
      };
    });

  const removeTour = (tourId: string) =>
    edit((prev) => ({
      ...prev,
      tours: prev.tours.filter((x) => x.tour_id !== tourId),
      times: prev.times.filter((x) => x.tour_id !== tourId),
    }));

  const chip = (active: boolean) =>
    `h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${
      active ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
    }`;
  const editingTour = dialog?.mode === "edit" ? data.tours.find((x) => x.tour_id === dialog.tourId) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {operators.length > 0 && (
            <>
              <button onClick={() => setFilter({ kind: "all" })} className={chip(filter.kind === "all")}>{t("all")}</button>
              <button onClick={() => setFilter({ kind: "own" })} className={chip(filter.kind === "own")}>{t("own")}</button>
              {operators.map((name) => (
                <button key={name} onClick={() => setFilter({ kind: "operator", name })} className={chip(filter.kind === "operator" && filter.name === name)}>
                  {name}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus state={saveState} onRetry={() => void flush()} />
          <button
            onClick={() => setDialog({ mode: "add" })}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-900 hover:border-slate-300 hover:bg-slate-50"
          >
            {t("addTour")}
          </button>
          <button onClick={addZone} className="h-9 rounded-lg bg-navy-900 px-3 text-xs font-semibold text-white hover:bg-navy-800">
            {t("addZone")}
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        <strong className="text-navy-900">{t("counts", { zones: data.zones.length, places: data.places.length })}</strong> {t("hint")}
      </p>

      {data.zones.length === 0 || columns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-sm font-bold text-navy-900">{data.zones.length === 0 ? t("emptyZones") : t("emptyTours")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th rowSpan={2} scope="col" className="sticky left-0 z-10 min-w-56 border-b border-r border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold text-slate-500">
                  {t("zone")}
                </th>
                {columns.map((col) => (
                  <th key={col.tour_id} colSpan={col.departures.length} scope="colgroup" className="border-l border-slate-100 px-2 pb-1 pt-3 text-center font-bold text-navy-900">
                    <button
                      onClick={() => setDialog({ mode: "edit", tourId: col.tour_id })}
                      className="rounded px-1 hover:bg-slate-100"
                      title={t("editTour")}
                    >
                      {tourName.get(col.tour_id)}
                    </button>
                    {col.operator && <span className="block text-[11px] font-medium text-slate-400">{col.operator}</span>}
                  </th>
                ))}
              </tr>
              <tr>
                {columns.flatMap((col) =>
                  col.departures.map((label, i) => (
                    <th key={`${col.tour_id}-${i}`} scope="col" className="border-b border-slate-200 px-2 pb-2.5 pt-0.5 text-center text-[11px] font-medium text-slate-500">
                      {label}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => {
                const open = isOpen(zone.id);
                const places = placesByZone.get(zone.id) ?? [];
                const exceptions = places.filter(
                  (p) => ownRows.has(p.id) || data.times.some((x) => x.place_id === p.id)
                );
                return (
                  <Fragment key={zone.id}>
                    <tr className={open ? "bg-slate-50" : "bg-white"}>
                      <th scope="row" className={`sticky left-0 z-10 border-b border-r border-slate-100 border-r-slate-200 px-4 py-2.5 text-left font-semibold ${open ? "bg-slate-50" : "bg-white"}`}>
                        <button
                          onClick={() => setOpenZones((prev) => toggle(prev, zone.id))}
                          aria-expanded={open}
                          className="flex items-center gap-2 text-left text-navy-900"
                        >
                          <span aria-hidden className="w-2.5 text-[11px] text-slate-400">{open ? "▾" : "▸"}</span>
                          <span>{zone.name}</span>
                          <span className="text-xs font-normal text-slate-500">{t("placesCount", { count: places.length })}</span>
                        </button>
                      </th>
                      {columns.flatMap((col) =>
                        col.departures.map((label, i) => (
                          <td key={`${col.tour_id}-${i}`} className="border-b border-slate-100 px-1 py-1 text-center">
                            <TimeCell
                              value={times.get(timeKey(col.tour_id, i, zone.id)) ?? ""}
                              label={`${zone.name} · ${tourName.get(col.tour_id)} · ${label}`}
                              onCommit={(time) => edit((prev) => setTime(prev, col.tour_id, i, zone.id, null, time))}
                            />
                          </td>
                        ))
                      )}
                    </tr>
                    {open && (
                      <tr className="bg-slate-50">
                        <td colSpan={slotCount + 1} className="border-b border-slate-200 py-3 pl-10 pr-4">
                          <ZonePanel
                            name={zone.name}
                            places={places}
                            ownRows={ownRows}
                            onRename={(name) => renameZone(zone.id, name)}
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
                          <th scope="row" className="sticky left-0 z-10 border-b border-r border-slate-200 bg-amber-50 py-2 pl-10 pr-4 text-left font-medium text-navy-900">
                            <span className="block">{place.name}</span>
                            <span className="flex items-center gap-2 text-[11px] font-normal text-amber-800">
                              {t("ownTimes")}
                              <button onClick={() => clearOwnTimes(place.id)} className="underline hover:text-amber-900">{t("useZoneTimes")}</button>
                            </span>
                          </th>
                          {columns.flatMap((col) =>
                            col.departures.map((label, i) => (
                              <td key={`${col.tour_id}-${i}`} className="border-b border-slate-200 px-1 py-1 text-center">
                                <TimeCell
                                  value={times.get(timeKey(col.tour_id, i, zone.id, place.id)) ?? ""}
                                  placeholder={times.get(timeKey(col.tour_id, i, zone.id)) ?? ""}
                                  highlight
                                  label={`${place.name} · ${tourName.get(col.tour_id)} · ${label}`}
                                  onCommit={(time) => edit((prev) => setTime(prev, col.tour_id, i, zone.id, place.id, time))}
                                />
                              </td>
                            ))
                          )}
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] text-navy-700">
        <strong>{t("botTitle")}</strong> {t("botHint")}
      </div>

      {dialog && (
        <TourDialog
          key={dialog.mode === "edit" ? dialog.tourId : "add"}
          tours={tours}
          taken={new Set(data.tours.map((x) => x.tour_id))}
          operators={operators}
          current={editingTour}
          onSave={(next) => {
            saveTour({ ...next, sort: editingTour?.sort ?? data.tours.length });
            setDialog(null);
          }}
          onRemove={editingTour ? () => { removeTour(editingTour.tour_id); setDialog(null); } : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// Una hora editable. Se guarda al salir del campo; si no es una hora valida
// vuelve a la anterior.
function TimeCell({ value, placeholder, highlight, label, onCommit }: {
  value: string;
  placeholder?: string;
  highlight?: boolean;
  label: string;
  onCommit: (time: string | null) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  // Si la hora cambia desde afuera (otra celda, un guardado), se muestra la nueva.
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(value);
  }

  const commit = () => {
    if (!draft.trim()) {
      setInvalid(false);
      if (value) onCommit(null);
      return;
    }
    const time = normalizeTime(draft);
    if (!time) {
      setInvalid(true);
      setDraft(value);
      return;
    }
    setInvalid(false);
    setDraft(time);
    if (time !== value) onCommit(time);
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder={placeholder || "—"}
      aria-label={label}
      aria-invalid={invalid}
      inputMode="numeric"
      className={`h-8 w-16 rounded-md border bg-transparent text-center tabular-nums outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 ${
        invalid ? "border-red-400" : "border-transparent hover:border-slate-200"
      } ${highlight && draft ? "font-bold text-amber-900" : "text-navy-900"} placeholder:text-slate-300`}
    />
  );
}

function ZonePanel({ name, places, ownRows, onRename, onAddPlace, onRemovePlace, onToggleOwn, onRemoveZone }: {
  name: string;
  places: PickupData["places"];
  ownRows: Set<string>;
  onRename: (name: string) => void;
  onAddPlace: (name: string) => void;
  onRemovePlace: (id: string) => void;
  onToggleOwn: (id: string) => void;
  onRemoveZone: () => void;
}) {
  const t = useTranslations("dashboard.tours.pickups");
  const [zoneName, setZoneName] = useState(name);
  const [newPlace, setNewPlace] = useState("");
  const [confirming, setConfirming] = useState(false);

  const add = () => {
    const value = newPlace.trim();
    if (!value) return;
    onAddPlace(value);
    setNewPlace("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
          onBlur={() => zoneName.trim() && zoneName.trim() !== name ? onRename(zoneName.trim()) : setZoneName(name)}
          aria-label={t("zoneName")}
          className="h-8 w-64 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold text-navy-900 outline-none focus:border-blue-500"
        />
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
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-slate-500">{t("placesLabel")}</span>
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
          className="h-7 w-36 rounded-full border border-dashed border-slate-300 bg-transparent px-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>
      <p className="text-[11px] text-slate-400">{t("ownTimesHint")}</p>
    </div>
  );
}

function TourDialog({ tours, taken, operators, current, onSave, onRemove, onClose }: {
  tours: Tour[];
  taken: Set<string>;
  operators: string[];
  current: PickupTour | null;
  onSave: (tour: PickupTour) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.tours.pickups");
  const available = tours.filter((tour) => tour.name.trim() && (!taken.has(tour.id) || tour.id === current?.tour_id));
  const [tourId, setTourId] = useState(current?.tour_id ?? available[0]?.id ?? "");
  const [departures, setDepartures] = useState<string[]>(current?.departures ?? [t("morning")]);
  const [operator, setOperator] = useState(current?.operator ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clean = departures.map((d) => d.trim()).filter(Boolean);
  const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/25 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="pickup-tour-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
        <h2 id="pickup-tour-title" className="font-display text-lg font-bold text-navy-900">{current ? t("editTour") : t("addTour")}</h2>

        <div>
          <label htmlFor="pickup-tour" className="mb-1.5 block text-xs font-bold text-navy-900">{t("tour")}</label>
          {available.length ? (
            <select id="pickup-tour" value={tourId} onChange={(e) => setTourId(e.target.value)} disabled={!!current} className={input}>
              {available.map((tour) => <option key={tour.id} value={tour.id}>{tour.name}</option>)}
            </select>
          ) : (
            <p className="text-sm text-slate-500">{t("noToursLeft")}</p>
          )}
        </div>

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

        <div>
          <label htmlFor="pickup-operator" className="mb-1.5 block text-xs font-bold text-navy-900">{t("operator")}</label>
          <input id="pickup-operator" list="pickup-operators" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder={t("operatorPlaceholder")} className={input} />
          <datalist id="pickup-operators">
            {operators.map((name) => <option key={name} value={name} />)}
          </datalist>
        </div>

        <div className="flex items-center justify-between pt-1">
          {onRemove ? (
            <button onClick={onRemove} className="text-sm font-semibold text-red-600 hover:text-red-700">{t("removeTour")}</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-navy-900 hover:bg-slate-50">{t("cancel")}</button>
            <button
              onClick={() => onSave({ tour_id: tourId, departures: clean, operator: operator.trim() || null, sort: 0 })}
              disabled={!tourId || !clean.length}
              className="h-9 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-40"
            >
              {t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
