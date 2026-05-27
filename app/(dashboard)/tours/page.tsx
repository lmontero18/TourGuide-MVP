"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import {
  ToursEditor,
  BusinessEditor,
  FaqsEditor,
  type FaqDraft,
} from "@/components/tours/TourCards";
import { importFromUrl } from "@/lib/import/client";
import type { BusinessSection, Organization, Tour } from "@/types";

const INPUT_CLASS =
  "w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

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
  const [tours, setTours] = useState<Tour[]>([]);
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [business, setBusiness] = useState<BusinessSection[]>([]);
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<Tab>("tours");

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

  const runImport = async () => {
    if (!url.trim()) return;
    setImporting(true);
    try {
      const result = await importFromUrl(url);
      const total = result.tours.length + result.faqs.length + result.business.length;
      if (total === 0) {
        toast.message(result.thin ? t("importThin") : t("importEmpty"));
      } else {
        setTours((prev) => [...prev, ...result.tours]);
        setBusiness((prev) => [...prev, ...result.business]);
        setFaqs((prev) => [...prev, ...result.faqs.map((faq) => ({ id: crypto.randomUUID(), ...faq }))]);
        setUrl("");
        toast.success(
          t("importDone", {
            tours: result.tours.length,
            sections: result.business.length,
            faqs: result.faqs.length,
          }),
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("importError"));
    } finally {
      setImporting(false);
    }
  };

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
          <div className="max-w-2xl text-sm text-slate-400">…</div>
        ) : (
          <div className="max-w-3xl space-y-5">
            <p className="text-sm text-slate-500 leading-relaxed">{t("subtitle")}</p>

            {/* Importar desde la web */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-navy-900">{t("importTitle")}</h2>
              <p className="mt-1 text-xs text-slate-400">{t("importSubtitle")}</p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !importing && runImport()}
                  placeholder={t("urlPlaceholder")}
                  className={INPUT_CLASS}
                />
                <button
                  onClick={runImport}
                  disabled={importing || !url.trim()}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-navy-900 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing && (
                    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  {importing ? t("importing") : t("importCta")}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {importing ? t("importingHint") : t("importHint")}
              </p>
            </section>

            {/* Pestañas */}
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {TABS.map((item) => {
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`flex flex-1 h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all ${
                      active ? "bg-navy-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-navy-900"
                    }`}
                  >
                    <TabIcon tab={item.key} />
                    {item.label}
                    <span className={active ? "text-white/70" : "text-slate-400"}>{item.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Contenido de la pestaña activa */}
            <div>
              {tab === "tours" && <ToursEditor tours={tours} onChange={setTours} />}
              {tab === "business" && <BusinessEditor business={business} onChange={setBusiness} />}
              {tab === "faqs" && <FaqsEditor faqs={faqs} onChange={setFaqs} />}
            </div>
          </div>
        )}
      </div>

      {/* Barra de guardar fija */}
      {!loading && (
        <div className="border-t border-slate-200 bg-white px-5 py-3">
          <div className="max-w-3xl flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {t("summary", { tours: tours.length, sections: business.length, faqs: faqs.length })}
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-900 px-5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
