"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import LeadBoard from "@/components/leads/LeadBoard";
import LeadDrawer from "@/components/leads/LeadDrawer";
import { formatMoney } from "@/components/leads/leadMeta";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import type { LeadStatus } from "@/types";
import { LeadBoardSkeleton } from "@/components/skeletons/LeadsSkeleton";
import LeadsExport from "@/components/leads/LeadsExport";

export default function LeadsPage() {
  const t = useTranslations("dashboard.leads");
  const locale = useLocale();
  const { orgId } = useAuth();
  const { leads, error, update, refresh } = useLeads(orgId);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusAmount, setFocusAmount] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!leads || !q) return leads ?? [];
    return leads.filter((l) =>
      [l.contact?.name, l.contact?.phone, l.tour_interest, l.summary].some((v) => v?.toLowerCase().includes(q))
    );
  }, [leads, query]);

  // Resumen del mes en curso (calendario del navegador).
  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const inMonth = (iso: string | null) => !!iso && new Date(iso).getTime() >= monthStart;
    const all = leads ?? [];
    const won = all.filter((l) => l.status === "converted" && inMonth(l.closed_at));
    const revenue = new Map<string, number>();
    for (const l of won) if (l.amount != null) revenue.set(l.currency ?? "USD", (revenue.get(l.currency ?? "USD") ?? 0) + l.amount);
    return {
      created: all.filter((l) => inMonth(l.created_at)).length,
      ready: all.filter((l) => l.status === "qualified").length,
      won: won.length,
      revenue: [...revenue.entries()].map(([cur, sum]) => formatMoney(sum, cur, locale)).join(" + ") || formatMoney(0, "USD", locale),
    };
  }, [leads, locale]);

  const selected = leads?.find((l) => l.id === selectedId) ?? null;

  const move = useCallback(
    async (id: string, status: LeadStatus) => {
      const lead = leads?.find((l) => l.id === id);
      if (!lead || lead.status === status) return;
      const res = await update(id, { status });
      if (!res.ok) return toast.error(res.error || t("saveError"));
      // Al reservar se pide el monto: abre la ficha con el campo listo.
      if (status === "converted") {
        setFocusAmount(true);
        setSelectedId(id);
      }
    },
    [leads, update, t]
  );

  const close = useCallback(() => {
    setSelectedId(null);
    setFocusAmount(false);
  }, []);

  const cards = [
    { label: t("kpi.created"), value: String(kpis.created), hint: t("kpi.createdHint") },
    { label: t("kpi.ready"), value: String(kpis.ready), hint: t("kpi.readyHint") },
    { label: t("kpi.won"), value: String(kpis.won), hint: t("kpi.wonHint") },
    { label: t("kpi.revenue"), value: kpis.revenue, hint: t("kpi.revenueHint") },
  ];

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")}>
        <LeadsExport />
      </TopBar>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <p className="max-w-2xl text-sm text-slate-500">{t("intro")}</p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-navy-900">{leads ? c.value : "—"}</p>
                <p className="text-[11px] text-slate-400">{c.hint}</p>
              </div>
            ))}
          </div>

          <label className="flex h-10 max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="min-w-0 flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-slate-400"
            />
          </label>

          {error && <p className="text-sm text-red-600">{t("loadError")}</p>}
          {!leads && !error && <LeadBoardSkeleton />}
          {leads && leads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-navy-900">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-slate-500">{t("emptySub")}</p>
            </div>
          )}
          {leads && leads.length > 0 && (
            <LeadBoard leads={filtered} selectedId={selectedId} onSelect={(id) => { setFocusAmount(false); setSelectedId(id); }} onMove={move} />
          )}
        </div>
      </div>

      <LeadDrawer lead={selected} open={!!selected} onClose={close} onUpdate={update} onRefresh={refresh} showConversationLink focusAmount={focusAmount} />
    </div>
  );
}
