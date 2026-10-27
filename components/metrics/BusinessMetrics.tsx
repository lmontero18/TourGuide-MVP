"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import MetricCard from "./MetricCard";
import { STAGE_DOT, formatMoney, timeAgo } from "@/components/leads/leadMeta";
import type { BusinessMetrics as BusinessData, LeadStatus, SalesSummary, TeamMetrics } from "@/types";

interface BusinessMetricsProps {
  data: BusinessData;
  team: TeamMetrics | null;
  // El owner (dueño) no abre conversaciones: la lista de espera no es link.
  linkConversations: boolean;
}

const FUNNEL: LeadStatus[] = ["new", "contacted", "qualified", "converted"];

// % vs periodo anterior. Sin base no hay % que mostrar.
function delta(cur: number, prev: number): { change?: string; positive?: boolean } {
  if (prev === 0) return {};
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { change: `${pct}%`, positive: pct >= 0 };
}

function amounts(sales: SalesSummary, locale: string): string {
  const entries = Object.entries(sales.amount).filter(([, v]) => v > 0);
  if (!entries.length) return "—";
  return entries.map(([currency, value]) => formatMoney(value, currency, locale)).join(" · ");
}

// Con una sola moneda en los dos periodos se puede comparar el monto.
function amountDelta(cur: SalesSummary, prev: SalesSummary) {
  const [a] = Object.entries(cur.amount);
  const [b] = Object.entries(prev.amount);
  if (Object.keys(cur.amount).length !== 1 || Object.keys(prev.amount).length !== 1 || a[0] !== b[0]) return {};
  return delta(a[1], b[1]);
}

function minutes(value: number | null, lessThanMinute: string): string {
  if (value === null) return "—";
  if (value < 1) return lessThanMinute;
  const total = Math.round(value);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

// Vista Negocio de Metricas (flag teamMetrics): lo que el dueño mira primero.
// Ventas, consultas, embudo, tours mas pedidos, quien espera y como atiende el
// equipo.
export default function BusinessMetrics({ data, team, linkConversations }: BusinessMetricsProps) {
  const t = useTranslations("dashboard.metrics.business");
  const locale = useLocale();
  const conversion = data.leads > 0 ? `${Math.round((data.funnel.converted / data.leads) * 100)}%` : "—";
  const maxTour = Math.max(1, ...data.top_tours.map((x) => x.leads));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("kpi.sold")} hint={t("kpi.soldHint")} value={amounts(data.sales, locale)} {...amountDelta(data.sales, data.sales_prev)} />
        <MetricCard label={t("kpi.bookings")} hint={t("kpi.bookingsHint")} value={data.sales.count} {...delta(data.sales.count, data.sales_prev.count)} />
        <MetricCard label={t("kpi.leads")} hint={t("kpi.leadsHint")} value={data.leads} {...delta(data.leads, data.leads_prev)} />
        <MetricCard
          label={t("kpi.conversion")}
          hint={t("kpi.conversionHint")}
          value={conversion}
          note={data.leads > 0 ? t("kpi.conversionNote", { sales: data.funnel.converted, leads: data.leads }) : undefined}
        />
      </div>

      {/* Lo que cuenta como venta: si el equipo no marca Reservado, no aparece. */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
        </svg>
        <p>{t("salesNote")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("funnel.title")}>
          <div className="space-y-3">
            {FUNNEL.map((step, i) => {
              // Acumulado: cada paso cuenta las consultas que llegaron hasta
              // ahi o mas lejos (las perdidas solo cuentan como consulta).
              const count = i === 0 ? data.leads : FUNNEL.slice(i).reduce((sum, k) => sum + (data.funnel[k] ?? 0), 0);
              const pct = data.leads > 0 ? (count / data.leads) * 100 : 0;
              return (
                <div key={step}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-navy-900">
                      <span className={`h-2 w-2 rounded-full ${STAGE_DOT[step]}`} />
                      {t(`funnel.steps.${step}`)}
                    </span>
                    <span className="tabular-nums text-slate-500">
                      <span className="font-semibold text-navy-900">{count}</span>
                      {i > 0 && data.leads > 0 && <span className="ml-1.5 text-xs">{Math.round(pct)}%</span>}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${STAGE_DOT[step]}`} style={{ width: `${Math.max(pct, count ? 2 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
            {(data.funnel.lost ?? 0) > 0 && <p className="text-xs text-slate-400">{t("funnel.lost", { count: data.funnel.lost })}</p>}
          </div>
        </Card>

        <Card title={t("tours.title")}>
          {data.top_tours.length === 0 ? (
            <p className="text-sm text-slate-400">{t("tours.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {data.top_tours.map((tour) => (
                <li key={tour.name}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-navy-900" title={tour.name}>{tour.name}</span>
                    <span className="shrink-0 tabular-nums text-xs text-slate-500">
                      {t("tours.leads", { count: tour.leads })}
                      {tour.sales > 0 && <span className="ml-1.5 font-semibold text-green-700">· {t("tours.sales", { count: tour.sales })}</span>}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(tour.leads / maxTour) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={t("waiting.title")}
          aside={
            data.waiting_count > 0 ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">{data.waiting_count}</span>
            ) : undefined
          }
        >
          {data.waiting.length === 0 ? (
            <p className="text-sm text-slate-400">{t("waiting.empty")}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.waiting.map((w) => {
                const row = (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      <span className="truncate font-medium text-navy-900">{w.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                      {w.since && <span className="tabular-nums">{timeAgo(w.since, locale)}</span>}
                      <span className="w-28 truncate text-right">{w.assignee ?? t("waiting.unassigned")}</span>
                    </span>
                  </>
                );
                return (
                  <li key={w.conversation_id}>
                    {linkConversations ? (
                      <Link href={`/conversations/${w.conversation_id}`} prefetch={false} className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-slate-50">
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 py-2 text-sm">{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {data.waiting_count > data.waiting.length && (
            <p className="mt-2 text-xs text-slate-400">{t("waiting.more", { count: data.waiting_count - data.waiting.length })}</p>
          )}
        </Card>

        <Card title={t("care.title")}>
          {team ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500" title={t("care.responseHint")}>{t("care.response")}</dt>
                <dd className="font-semibold tabular-nums text-navy-900">{minutes(team.team.response_minutes, t("care.lessThanMinute"))}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500" title={t("care.longWaitsHint")}>{t("care.longWaits")}</dt>
                <dd className={`font-semibold tabular-nums ${team.team.long_waits > 0 ? "text-red-600" : "text-navy-900"}`}>{team.team.long_waits}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500" title={t("care.handoffsHint")}>{t("care.handoffs")}</dt>
                <dd className={`font-semibold tabular-nums ${team.team.handoffs_unanswered > 0 ? "text-red-600" : "text-navy-900"}`}>
                  {t("care.handoffsValue", { unanswered: team.team.handoffs_unanswered, total: team.team.handoffs })}
                </dd>
              </div>
              <p className="pt-1 text-xs text-slate-400">{t("care.hoursNote")}</p>
            </dl>
          ) : (
            <div className="space-y-3" aria-hidden>
              {[0, 1, 2].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-slate-100" />)}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
