"use client";

import { useLocale, useTranslations } from "next-intl";
import MetricCard from "./MetricCard";
import { formatMoney } from "@/components/leads/leadMeta";
import type { TeamMetrics as TeamMetricsData } from "@/types";

// "8 min", "1 h 20 min", "<1 min". Sin respuestas en el periodo: "—".
function formatMinutes(minutes: number | null, t: (key: "lessThanMinute") => string): string {
  if (minutes === null) return "—";
  if (minutes < 1) return t("lessThanMinute");
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// {"USD": 1200, "CRC": 50000} → "US$1,200 · ₡50,000". Sin montos: "—".
function formatAmounts(amounts: Record<string, number>, locale: string): string {
  const entries = Object.entries(amounts).filter(([, v]) => v > 0);
  if (!entries.length) return "—";
  return entries.map(([currency, value]) => formatMoney(value, currency, locale)).join(" · ");
}

function initials(name: string) {
  const clean = name.includes("@") ? name.split("@")[0] : name;
  return clean.split(/[\s._-]+/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// Pestaña Equipo de Metricas (flag teamMetrics): como le va a cada persona.
// La ven los admins y el owner (dueño).
export default function TeamMetrics({ data }: { data: TeamMetricsData }) {
  const t = useTranslations("dashboard.metrics.team");
  const locale = useLocale();
  const { team, members } = data;
  const unanswered = members.reduce((sum, m) => sum + m.unanswered, 0);
  // Los que no hicieron nada en el periodo van al final, atenuados.
  const sorted = [...members].sort((a, b) => b.chats - a.chats || b.sales - a.sales || a.name.localeCompare(b.name));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("cards.response")} hint={t("cards.responseHint")} value={formatMinutes(team.response_minutes, t)} />
        <MetricCard label={t("cards.unanswered")} hint={t("cards.unansweredHint")} value={unanswered} />
        <MetricCard label={t("cards.sales")} hint={t("cards.salesHint")} value={team.sales} />
        <MetricCard label={t("cards.sold")} hint={t("cards.soldHint")} value={formatAmounts(team.sales_amount, locale)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-bold">{t("columns.member")}</th>
                <th className="px-3 py-3 text-right font-bold" title={t("columns.chatsHint")}>{t("columns.chats")}</th>
                <th className="px-3 py-3 text-right font-bold" title={t("columns.responseHint")}>{t("columns.response")}</th>
                <th className="px-3 py-3 text-right font-bold" title={t("columns.unansweredHint")}>{t("columns.unanswered")}</th>
                <th className="px-3 py-3 text-right font-bold" title={t("columns.salesHint")}>{t("columns.sales")}</th>
                <th className="px-3 py-3 text-right font-bold">{t("columns.sold")}</th>
                <th className="px-5 py-3 text-right font-bold" title={t("columns.closeRateHint")}>{t("columns.closeRate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((m) => {
                const idle = m.chats === 0 && m.sales === 0 && m.unanswered === 0;
                return (
                  <tr key={m.id} className={idle ? "text-slate-400" : "text-navy-900"}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                          {initials(m.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{m.name}</p>
                          <p className="text-xs text-slate-400">{t(`roles.${m.role}`)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{m.chats}</td>
                    <td className="px-3 py-3 text-right tabular-nums" title={m.response_samples ? t("samples", { count: m.response_samples }) : undefined}>
                      {formatMinutes(m.response_minutes, t)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {m.unanswered > 0 ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-red-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          {m.unanswered}
                        </span>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{m.sales}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatAmounts(m.sales_amount, locale)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{m.leads > 0 ? `${Math.round((m.sales / m.leads) * 100)}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-1 text-xs text-slate-400">
        <p>{t("notes.hours")}</p>
        {team.unassigned_sales > 0 && <p>{t("notes.unassigned", { count: team.unassigned_sales })}</p>}
      </div>
    </div>
  );
}
