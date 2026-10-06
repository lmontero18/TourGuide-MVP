"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { fetchLeadsForExport } from "@/hooks/useLeads";
import { downloadCsv } from "@/lib/csv";

const PERIODS = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "12m", days: 365 },
  { key: "all", days: null },
] as const;

// Inicio del periodo (null = todos). Fuera del componente: se llama desde el
// handler del menu, no durante el render.
function sinceFor(days: number | null): string | null {
  return days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
}

// "Exportar" del tablero de leads: elige el periodo y baja un CSV con la
// ficha completa de cada lead (lo que pidio Ecoterra en el demo).
export default function LeadsExport() {
  const t = useTranslations("dashboard.leads.export");
  const tL = useTranslations("dashboard.leads");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function run(period: (typeof PERIODS)[number]) {
    setOpen(false);
    setBusy(true);
    try {
      const rows = await fetchLeadsForExport(sinceFor(period.days));
      if (!rows.length) {
        toast(t("empty"));
        return;
      }
      const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" }) : "");
      const header = [
        t("cols.created"), t("cols.name"), t("cols.phone"), t("cols.stage"), t("cols.temperature"),
        tL("fields.tour_interest"), tL("fields.travel_date"), tL("fields.group_size"), tL("fields.quote"),
        tL("fields.pickup"), tL("fields.needs"), tL("fields.language"), tL("summary"), tL("fields.next_step"),
        t("cols.amount"), t("cols.currency"), t("cols.closed"), t("cols.agent"),
      ];
      const temp = { browsing: "cold", quoting: "warm", ready: "hot" } as const;
      const body = rows.map((l) => [
        date(l.created_at),
        l.contact?.name ?? "",
        l.contact?.phone ?? "",
        tL(`stages.${l.status}`),
        l.intent ? tL(`temperature.${temp[l.intent]}`) : "",
        l.tour_interest ?? "",
        l.metadata?.travel_date ?? "",
        l.metadata?.group_size ?? "",
        l.metadata?.quote ?? "",
        l.metadata?.pickup ?? "",
        l.metadata?.needs ?? "",
        l.metadata?.language ?? "",
        l.summary ?? "",
        l.next_step ?? "",
        l.amount ?? "",
        l.amount != null ? (l.currency ?? "USD") : "",
        date(l.closed_at),
        l.conversation?.assigned_agent?.full_name || l.conversation?.assigned_agent?.email || "",
      ]);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`${t("filename")}-${period.key}-${stamp}.csv`, [header, ...body]);
      toast.success(t("done", { count: rows.length }));
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        {busy ? t("exporting") : t("button")}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("period")}</p>
          {PERIODS.map((p) => (
            <button key={p.key} role="menuitem" onClick={() => void run(p)} className="block w-full px-3 py-2 text-left text-xs text-navy-900 hover:bg-slate-50">
              {t(`periods.${p.key}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
