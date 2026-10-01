"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import type { MonthlyUsage, MonthlyUsagePoint } from "@/types";

// Meta: desde 2026-10-01, 1.000 mensajes de servicio gratis por mes por
// número; el excedente se cobra al método de pago de la agencia (CODE-173).
const FREE_TIER = 1000;
const WARN_AT = 0.8;
const WHATSAPP_MANAGER_URL = "https://business.facebook.com/wa/manage/home/";

interface UsageCardProps {
  usage: MonthlyUsage;
  history?: MonthlyUsagePoint[] | null;
}

export default function UsageCard({ usage, history }: UsageCardProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.metrics.usage");
  const ratio = usage.sent / FREE_TIER;
  const over = usage.sent - FREE_TIER;
  const state = ratio >= 1 ? "over" : ratio >= WARN_AT ? "warn" : "ok";
  const bar = { ok: "bg-navy-900", warn: "bg-amber-500", over: "bg-red-500" }[state];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-navy-900">{t("title")}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{t("sub")}</p>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display text-3xl font-extrabold tracking-tight text-navy-900">
          {usage.sent.toLocaleString(locale)}
        </span>
        <span className="text-sm text-slate-500">{t("ofFree", { free: FREE_TIER.toLocaleString(locale) })}</span>
      </div>

      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>

      {state !== "ok" && (
        <div
          className={`mt-4 rounded-xl border p-3 text-xs font-medium ${
            state === "over" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {state === "over" ? t("over", { count: over.toLocaleString(locale) }) : t("warn")}{" "}
          <a href={WHATSAPP_MANAGER_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            {t("checkPayment")}
          </a>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-slate-500 mb-2">{t("history")}</p>
          <div className="flex items-end gap-2 h-20">
            {history.map((h) => {
              const max = Math.max(FREE_TIER, ...history.map((x) => x.sent));
              const over = h.sent > FREE_TIER;
              return (
                <div key={h.month} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full" title={`${h.month}: ${h.sent}`}>
                  <span className="text-[10px] font-bold text-navy-900 tabular-nums">{h.sent.toLocaleString(locale)}</span>
                  <div className="w-full flex-1 rounded-t bg-slate-100 relative overflow-hidden">
                    <div
                      className={`absolute bottom-0 inset-x-0 rounded-t ${over ? "bg-red-500" : "bg-navy-900/80"}`}
                      style={{ height: `${(h.sent / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${h.month}-15T12:00:00Z`))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 mt-3">{t("note")}</p>
    </div>
  );
}
