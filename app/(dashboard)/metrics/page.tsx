"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import TopBar from "@/components/layout/TopBar";
import MetricCard from "@/components/metrics/MetricCard";
import ActivityChart from "@/components/metrics/ActivityChart";
import AfterHoursCard from "@/components/metrics/AfterHoursCard";
import MessagesCard from "@/components/metrics/MessagesCard";
import UsageCard from "@/components/metrics/UsageCard";
import { useMetrics } from "@/hooks/useMetrics";
import { useMonthlyUsage } from "@/hooks/useMonthlyUsage";
import type { MetricsPeriod } from "@/types";
import MetricsSkeleton from "@/components/skeletons/MetricsSkeleton";

const ROLLING: MetricsPeriod[] = ["7d", "30d", "90d"];

// Este mes + los 5 anteriores como meses calendario ("month:YYYY-MM").
function recentMonths(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

// CSV para abrir en Excel: resumen del periodo + conversaciones por dia.
function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// % vs período anterior. Sin base (prev = 0) no hay % que mostrar.
function delta(cur: number, prev: number): { change?: string; positive?: boolean } {
  if (prev === 0) return {};
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { change: `${pct}%`, positive: pct >= 0 };
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return sec ? `${min} min ${sec} s` : `${min} min`;
}

export default function MetricsPage() {
  const t = useTranslations("dashboard.metrics");
  const locale = useLocale();
  const months = recentMonths();
  const [period, setPeriod] = useState<MetricsPeriod>("7d");
  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
  const { data, loading, error } = useMetrics(period);
  const { usage, history } = useMonthlyUsage();

  const active = data?.active_conversations ?? 0;
  // En el modelo de Tourfy el bot prepara al cliente y el agente cierra: la
  // metrica es que parte de las respuestas dio el bot, no "conversaciones sin
  // agente" (que da ~0% aunque el bot haga casi todo).
  const botReplies = data?.messages.bot ?? 0;
  const allReplies = botReplies + (data?.messages.agent ?? 0);
  const botShare = allReplies > 0 ? `${Math.round((botReplies / allReplies) * 100)}%` : "—";
  const isEmpty = !!data && active === 0 && data.new_contacts === 0;
  const placeholder = loading && !data;

  function exportCsv() {
    if (!data) return;
    const label = period.startsWith("month:") ? monthLabel(period.slice(6)) : t(`period.${period}`);
    const csv = toCsv([
      [t("csv.period"), label],
      [t("cards.activeConversations"), data.active_conversations],
      [t("cards.newContacts"), data.new_contacts],
      [t("csv.clientMessages"), data.messages.client],
      [t("csv.botMessages"), data.messages.bot],
      [t("csv.agentMessages"), data.messages.agent],
      [t("cards.readyToClose"), data.handoff_events],
      [t("csv.botResponseSeconds"), Math.round(data.response_time.median_seconds ?? 0)],
      [t("csv.teamPickupSeconds"), Math.round(data.pickup.median_seconds ?? 0)],
      [t("csv.afterHoursConversations"), data.after_hours.conversations],
      [],
      [t("csv.date"), t("csv.conversations")],
      ...data.daily.map((d) => [d.date, d.conversations]),
    ]);
    // BOM para que Excel abra bien los acentos.
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${t("csv.filename")}-${period.replace("month:", "")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")}>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as MetricsPeriod)}
          aria-label={t("periodLabel")}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy-900 outline-none"
        >
          <optgroup label={t("periodGroups.months")}>
            {months.map((m, i) => (
              <option key={m} value={`month:${m}`}>
                {i === 0 ? t("period.thisMonth") : i === 1 ? t("period.lastMonth") : monthLabel(m)}
              </option>
            ))}
          </optgroup>
          <optgroup label={t("periodGroups.rolling")}>
            {ROLLING.map((p) => (
              <option key={p} value={p}>{t(`period.${p}`)}</option>
            ))}
          </optgroup>
        </select>
        <button
          onClick={exportCsv}
          disabled={!data}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy-900 hover:bg-slate-50 disabled:opacity-40"
        >
          {t("export")}
        </button>
      </TopBar>

      <div className={`flex-1 overflow-y-auto p-5 space-y-5 transition-opacity ${loading && !placeholder ? "opacity-60" : ""}`}>
        {placeholder ? <MetricsSkeleton /> : (<>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
            {t("loadError")}
          </div>
        )}
        {isEmpty && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-500">
            {t("empty")}
          </div>
        )}

        {/* Top metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label={t("cards.activeConversations")}
            hint={t("cards.activeConversationsHint")}
            value={placeholder ? "—" : active}
            {...(data ? delta(active, data.active_conversations_prev) : {})}
            note={data && data.active_conversations_prev === 0 && active > 0 ? t("noChange") : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
          />
          <MetricCard
            label={t("cards.newContacts")}
            hint={t("cards.newContactsHint")}
            value={placeholder ? "—" : data?.new_contacts ?? 0}
            {...(data ? delta(data.new_contacts, data.new_contacts_prev) : {})}
            note={data && data.new_contacts_prev === 0 && data.new_contacts > 0 ? t("noChange") : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></svg>}
          />
          <MetricCard
            label={t("cards.responseTime")}
            hint={t("cards.responseTimeHint")}
            value={formatSeconds(data?.response_time.median_seconds ?? null)}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
          />
          <MetricCard
            label={t("cards.botReplies")}
            hint={t("cards.botRepliesHint")}
            value={placeholder ? "—" : botShare}
            note={data && allReplies > 0 ? t("cards.botRepliesNote", { bot: botReplies, total: allReplies }) : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>}
          />
          <MetricCard
            label={t("cards.readyToClose")}
            hint={t("cards.readyToCloseHint")}
            value={placeholder ? "—" : data?.handoff_events ?? 0}
            note={data && data.handoff_events === 0 ? t("cards.eventsSince") : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M17 11l2 2 4-4" /></svg>}
          />
          <MetricCard
            label={t("cards.teamPickup")}
            hint={t("cards.teamPickupHint")}
            value={formatSeconds(data?.pickup.median_seconds ?? null)}
            note={data && data.pickup.samples === 0 ? t("cards.eventsSince") : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
          />
        </div>

        {/* Charts row */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ActivityChart daily={data.daily} />
            <AfterHoursCard afterHours={data.after_hours} />
          </div>
        )}

        {(data || usage) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {usage && <UsageCard usage={usage} history={history} />}
            {data && <MessagesCard messages={data.messages} />}
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}
