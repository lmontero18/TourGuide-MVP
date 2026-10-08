"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import TopBar from "@/components/layout/TopBar";
import type { FaqDraft } from "@/components/tours/TourCards";
import ToursTable from "@/components/tours/ToursTable";
import TourDrawer from "@/components/tours/TourDrawer";
import BusinessGrid from "@/components/tours/BusinessGrid";
import FaqAccordion from "@/components/tours/FaqAccordion";
import SaveStatus, { type SaveState } from "@/components/tours/SaveStatus";
import ToursSkeleton from "@/components/tours/ToursSkeleton";
import type { BotConfig, BusinessSection, Organization, Tour } from "@/types";
import { promptUsage } from "@/lib/bot/compilePrompt";
import KnowledgeCapacity from "@/components/tours/KnowledgeCapacity";
import ImportDialog from "@/components/tours/ImportDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { queryKeys } from "@/lib/query/keys";

type Tab = "tours" | "business" | "faqs";

interface Knowledge {
  tours: Tour[];
  faqs: FaqDraft[];
  business: BusinessSection[];
}

const AUTOSAVE_MS = 1000;

function toKnowledge(org: Organization): Knowledge {
  return {
    tours: org.tours ?? [],
    faqs: (org.faqs ?? []).map((faq) => ({ id: crypto.randomUUID(), question: faq.question, answer: faq.answer })),
    business: org.business_info ?? [],
  };
}

// Lo incompleto no se manda (el API lo rechazaria): tours sin nombre, precios
// sin monto, FAQs sin pregunta o respuesta, secciones sin titulo o contenido.
function toPayload({ tours, faqs, business }: Knowledge) {
  return {
    tours: tours
      .filter((tour) => tour.name.trim())
      .map((tour) => ({
        ...tour,
        name: tour.name.trim(),
        category: tour.category?.trim() || undefined,
        info: tour.info.trim(),
        prices: (tour.prices ?? [])
          .filter((p) => Number.isFinite(p.amount) && p.currency?.trim())
          .map((p) => ({ ...p, label: p.label?.trim() || undefined })),
      })),
    faqs: faqs
      .filter((faq) => faq.question.trim() && faq.answer.trim())
      .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() })),
    business_info: business
      .filter((section) => section.title.trim() && section.content.trim())
      .map((section) => ({ ...section, title: section.title.trim(), content: section.content.trim() })),
  };
}

// La org viene de TanStack Query (compartida con Configuracion): con cache
// la pagina abre al instante. El editor se monta una vez con esos datos y
// desde ahi es dueño de su estado (un refetch en segundo plano no pisa lo que
// se esta editando).
export default function ToursSettingsPage() {
  const t = useTranslations("dashboard.tours");
  const { data: org, isError } = useOrganization();

  if (!org) {
    return (
      <div className="flex h-full flex-col">
        <TopBar title={t("title")} />
        <div className="flex-1 overflow-y-auto p-5">
          {isError ? <p className="text-sm text-red-600">{t("loadError")}</p> : <ToursSkeleton />}
        </div>
      </div>
    );
  }
  return <ToursEditor initialOrg={org} />;
}

function ToursEditor({ initialOrg }: { initialOrg: Organization }) {
  const t = useTranslations("dashboard.tours");
  const queryClient = useQueryClient();
  const [data, setData] = useState<Knowledge>(() => toKnowledge(initialOrg));
  const [tab, setTab] = useState<Tab>("tours");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [importOpen, setImportOpen] = useState(false);

  // Autoguardado: debounce + un solo PATCH en vuelo a la vez. Si hay cambios
  // mientras se guarda, se encola otro guardado con lo ultimo.
  const latest = useRef(data);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);
  const queued = useRef(false);

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
      try {
        const payload = toPayload(latest.current);
        const res = await fetch("/api/organizations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive,
        });
        ok = res.ok;
        // La cache queda igual a lo guardado: volver a la pagina no muestra
        // la version vieja.
        if (ok) queryClient.setQueryData<Organization>(queryKeys.organization, (prev) => (prev ? { ...prev, ...payload } : prev));
      } catch {
        ok = false;
      }
    } while (queued.current);
    inflight.current = false;
    setSaveState(ok ? "saved" : "error");
  }, [queryClient]);

  const edit = useCallback((patch: Partial<Knowledge>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      latest.current = next;
      return next;
    });
    setSaveState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  }, [flush]);

  // Avisar antes de cerrar la pestaña si queda algo sin guardar.
  const unsaved = saveState === "pending" || saveState === "saving" || saveState === "error";
  useEffect(() => {
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  // Navegar a otra pagina del dashboard dentro del debounce: guardar ya.
  useEffect(() => () => {
    if (timer.current) void flush(true);
  }, [flush]);

  const { tours, faqs, business } = data;

  // Espacio que ocupa el conocimiento en el prompt del bot (mismo calculo que
  // el server; arriba de 100% se recortaria).
  const capacity = useMemo(() => {
    const cfg = (initialOrg.bot_config ?? {}) as BotConfig;
    return promptUsage({
      agencyName: initialOrg.name,
      tone: cfg.tone ?? "friendly",
      greeting: cfg.greeting ?? null,
      defaultLang: cfg.default_lang,
      businessHours: cfg.business_hours ?? null,
      timezone: cfg.timezone,
      tours: toPayload(data).tours,
      faqs: toPayload(data).faqs,
      businessInfo: toPayload(data).business_info,
    }).ratio;
  }, [data, initialOrg]);
  const selected = tours.find((tour) => tour.id === selectedId) ?? null;

  // Editar un tour lo da por revisado: se limpia el aviso de baja confianza.
  const updateTour = useCallback(
    (tour: Tour) => edit({ tours: latest.current.tours.map((x) => (x.id === tour.id ? { ...tour, confidence: undefined } : x)) }),
    [edit],
  );

  const addTour = () => {
    const tour: Tour = { id: crypto.randomUUID(), name: "", info: "", prices: [], source: "manual" };
    edit({ tours: [...tours, tour] });
    setSelectedId(tour.id);
  };

  const deleteTour = (id: string) => {
    edit({ tours: latest.current.tours.filter((x) => x.id !== id) });
    setSelectedId(null);
  };

  // Un tour nuevo que se cierra sin escribir nada no queda como fila vacia.
  const closeDrawer = useCallback(() => {
    const current = latest.current.tours.find((x) => x.id === selectedId);
    if (current && !current.name.trim() && !current.info.trim() && !(current.prices ?? []).length) {
      const rest = latest.current.tours.filter((x) => x.id !== current.id);
      latest.current = { ...latest.current, tours: rest };
      setData(latest.current);
    }
    setSelectedId(null);
  }, [selectedId]);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "tours", label: t("tabTours"), count: tours.length },
    { key: "business", label: t("tabBusiness"), count: business.length },
    { key: "faqs", label: t("tabFaqs"), count: faqs.length },
  ];

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")}>
        <SaveStatus state={saveState} onRetry={() => void flush()} />
      </TopBar>

      <div className="flex-1 overflow-y-auto p-5">
          <div className="mx-auto max-w-5xl space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <p className="max-w-2xl text-sm text-slate-500">{t("subtitle")}</p>
              <div className="flex flex-wrap items-end gap-4">
                <KnowledgeCapacity ratio={capacity} />
                <button
                  onClick={() => setImportOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-900 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2M21 4v5h-5M3 20v-5h5" />
                  </svg>
                  {t("reimport.open")}
                </button>
              </div>
            </div>

            <div role="tablist" className="flex gap-6 border-b border-slate-200">
              {TABS.map((item) => {
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(item.key)}
                    className={`-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 text-sm font-bold transition-colors ${
                      active ? "border-navy-900 text-navy-900" : "border-transparent text-slate-400 hover:text-navy-900"
                    }`}
                  >
                    {item.label}
                    <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-400"}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {tab === "tours" && <ToursTable tours={tours} selectedId={selectedId} onSelect={setSelectedId} onAdd={addTour} />}
            {tab === "business" && <BusinessGrid sections={business} onChange={(v) => edit({ business: v })} />}
            {tab === "faqs" && <FaqAccordion faqs={faqs} onChange={(v) => edit({ faqs: v })} />}
          </div>
      </div>

      <ImportDialog
        open={importOpen}
        current={{ tours, faqs: faqs.map(({ question, answer }) => ({ question, answer })), business }}
        onClose={() => setImportOpen(false)}
        onApply={(next) =>
          edit({
            tours: next.tours,
            business: next.business,
            // Las FAQs del editor llevan id local; las nuevas se agregan al final.
            faqs: [
              ...latest.current.faqs,
              ...next.faqs.slice(latest.current.faqs.length).map((faq) => ({ id: crypto.randomUUID(), ...faq })),
            ],
          })
        }
      />

      <TourDrawer tour={selected} saveState={saveState} onChange={updateTour} onDelete={deleteTour} onClose={closeDrawer} />
    </div>
  );
}
