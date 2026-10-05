"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { currentMonth, templateStats, useTemplateHistory, type TemplateSend } from "@/hooks/useTemplateHistory";
import { deliveryReason } from "@/lib/whatsapp/deliveryReasons";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLE: Record<string, string> = {
  sent: "border-slate-200 bg-slate-50 text-slate-600",
  delivered: "border-blue-200 bg-blue-50 text-blue-700",
  read: "border-green-200 bg-green-50 text-green-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function Breakdown({ title, rows, total }: { title: string; rows: { name: string; count: number }[]; total: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-navy-900">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 5).map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-slate-600" title={r.name}>{r.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-navy-900" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-navy-900">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Historial de plantillas enviadas: cuantas, cuales, quien las mando y como
// terminaron (entregada, leida o fallida con su motivo).
export default function TemplateHistory() {
  const t = useTranslations("dashboard.templates.history");
  const tD = useTranslations("dashboard.chat.delivery");
  const tCat = useTranslations("dashboard.templates.category");
  const locale = useLocale();
  const [month, setMonth] = useState(currentMonth);
  const { data: rows, isPending, isError } = useTemplateHistory(month);
  const stats = useMemo(() => templateStats(rows ?? [], t("unknownAgent")), [rows, t]);
  const months = useMemo(() => lastMonths(6), []);
  const monthLabel = (m: string) => {
    const [y, mm] = m.split("-").map(Number);
    return new Date(y, mm - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  };
  const fmt = (iso: string) => new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const status = (r: TemplateSend) => r.delivery_status ?? null;

  const kpis = [
    { label: t("sent"), value: stats.sent },
    { label: t("delivered"), value: stats.delivered },
    { label: t("read"), value: stats.read },
    { label: t("failed"), value: stats.failed, danger: stats.failed > 0 },
  ];

  return (
    <section id="history" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy-900">{t("title")}</h2>
          <p className="text-xs text-slate-500">{t("sub")}</p>
        </div>
        <select
          aria-label={t("month")}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold capitalize text-navy-900"
        >
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{k.label}</p>
            {isPending ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <p className={`mt-1 font-display text-2xl font-extrabold tabular-nums ${k.danger ? "text-red-600" : "text-navy-900"}`}>{k.value}</p>
            )}
          </div>
        ))}
      </div>

      {isError && <p className="text-sm text-red-600">{t("loadError")}</p>}

      {rows && rows.length > 0 && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Breakdown title={t("byAgent")} rows={stats.byAgent} total={stats.sent} />
            <Breakdown title={t("byTemplate")} rows={stats.byTemplate} total={stats.sent} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">{t("colDate")}</th>
                  <th className="px-4 py-2.5">{t("colTemplate")}</th>
                  <th className="px-4 py-2.5">{t("colCustomer")}</th>
                  <th className="px-4 py-2.5">{t("colSender")}</th>
                  <th className="px-4 py-2.5">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = status(r);
                  return (
                    <tr key={r.id} className="border-t border-slate-100 first:border-t-0">
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500">{fmt(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-navy-900">{r.template_name}</span>
                        {r.template_category && (
                          <span className="ml-2 rounded-full border border-slate-200 px-1.5 py-px text-[10px] font-semibold text-slate-500">{tCat(r.template_category)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.conversation ? (
                          <Link href={`/conversations/${r.conversation.id}`} className="font-medium text-blue-600 hover:underline">
                            {r.conversation.contact?.name || r.conversation.contact?.phone || "—"}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.sender?.full_name || r.sender?.email || t("unknownAgent")}</td>
                      <td className="px-4 py-3">
                        {s ? (
                          <span
                            title={s === "failed" ? tD(`titles.${deliveryReason(r.delivery_error_code)}`) : undefined}
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[s]}`}
                          >
                            {tD(s)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {rows && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{t("empty")}</p>
      )}
    </section>
  );
}
