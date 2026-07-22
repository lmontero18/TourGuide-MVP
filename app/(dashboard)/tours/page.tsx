"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import type { FaqDraft } from "@/components/tours/TourCards";
import { ToursSplit, BusinessSplit, FaqsSplit } from "@/components/tours/SplitEditors";
import ToursSkeleton from "@/components/tours/ToursSkeleton";
import type { BusinessSection, Organization, Tour } from "@/types";

type Tab = "tours" | "business" | "faqs";

const TabIcon = ({ tab }: { tab: Tab }) => {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (tab === "tours") return <svg {...common}><path d="M9 11H3v10h6V11z" /><path d="M21 3h-6v18h6V3z" /><path d="M15 7H9v14h6V7z" /></svg>;
  if (tab === "business") return <svg {...common}><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>;
};

export default function ToursSettingsPage() {
  const t = useTranslations("dashboard.tours");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tours, setTours] = useState<Tour[]>([]);
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [business, setBusiness] = useState<BusinessSection[]>([]);
  const [tab, setTab] = useState<Tab>("tours");

  // Setters que marcan cambios sin guardar (la carga inicial usa los setters crudos).
  const editTours = (v: Tour[]) => { setTours(v); setDirty(true); };
  const editBusiness = (v: BusinessSection[]) => { setBusiness(v); setDirty(true); };
  const editFaqs = (v: FaqDraft[]) => { setFaqs(v); setDirty(true); };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/organizations");
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Failed to load");
        const org = result.organization as Organization;
        setTours(org.tours ?? []);
        setFaqs(
          (org.faqs ?? []).map((faq) => ({
            id: crypto.randomUUID(),
            question: faq.question,
            answer: faq.answer,
          })),
        );
        setBusiness(org.business_info ?? []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("loadError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tours: tours
            .filter((tour) => tour.name.trim())
            .map((tour) => ({ ...tour, name: tour.name.trim(), info: tour.info.trim() })),
          faqs: faqs
            .filter((faq) => faq.question.trim() && faq.answer.trim())
            .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() })),
          business_info: business
            .filter((section) => section.title.trim() && section.content.trim())
            .map((section) => ({ ...section, title: section.title.trim(), content: section.content.trim() })),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to save");
      setDirty(false);
      toast.success(t("saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "tours", label: t("tabTours"), count: tours.length },
    { key: "business", label: t("tabBusiness"), count: business.length },
    { key: "faqs", label: t("tabFaqs"), count: faqs.length },
  ];

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")} />

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <ToursSkeleton />
        ) : (
          <div className="max-w-3xl space-y-5">
            {/* Pestañas con indicador deslizante */}
            <div role="tablist" className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {TABS.map((item) => {
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(item.key)}
                    className={`relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 ${
                      active ? "text-white" : "text-slate-500 hover:text-navy-900"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="toursTabPill"
                        className="absolute inset-0 rounded-xl bg-navy-900 shadow-sm"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <TabIcon tab={item.key} />
                      {item.label}
                      <span
                        className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {item.count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Contenido de la pestaña activa */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {tab === "tours" && <ToursSplit tours={tours} onChange={editTours} />}
                {tab === "business" && <BusinessSplit business={business} onChange={editBusiness} />}
                {tab === "faqs" && <FaqsSplit faqs={faqs} onChange={editFaqs} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Barra de guardar fija — glass */}
      {!loading && (
        <div className="border-t border-slate-200/70 bg-white/80 px-5 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {/* Chips de conteo (ocultos en móvil) */}
              <div className="hidden items-center gap-1.5 sm:flex">
                {TABS.map((item) => (
                  <span
                    key={item.key}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                  >
                    <b className="font-display tabular-nums text-navy-900">{item.count}</b>
                    {item.label}
                  </span>
                ))}
              </div>
              {/* Indicador de cambios */}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                <span className={`h-1.5 w-1.5 rounded-full ${dirty ? "animate-pulse bg-amber-500" : "bg-green-500"}`} />
                <span className={dirty ? "text-amber-600" : "text-slate-400"}>
                  {dirty ? t("unsaved") : t("allSaved")}
                </span>
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
