"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { currentMonth, templateStats, useTemplateHistory } from "@/hooks/useTemplateHistory";

// Plantillas del mes en Metricas: cuantas, de que categoria (marketing cuesta
// mas que utilidad en la factura de Meta) y cuantas fallaron.
export default function TemplatesCard() {
  const t = useTranslations("dashboard.templates.history");
  const tCat = useTranslations("dashboard.templates.category");
  const { data: rows } = useTemplateHistory(currentMonth());
  const stats = useMemo(() => templateStats(rows ?? [], t("unknownAgent")), [rows, t]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-navy-900">{t("cardTitle")}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{t("cardSub")}</p>
        </div>
        <Link href="/templates#history" className="text-xs font-semibold text-blue-600 hover:underline">{t("seeHistory")}</Link>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="font-display text-3xl font-extrabold tabular-nums text-navy-900">{rows ? stats.sent : "—"}</p>
        <p className="text-xs text-slate-500">
          {tCat("MARKETING")}: <b className="tabular-nums text-navy-900">{stats.byCategory.MARKETING}</b>
          {" · "}
          {tCat("UTILITY")}: <b className="tabular-nums text-navy-900">{stats.byCategory.UTILITY}</b>
          {" · "}
          {t("failed")}: <b className={`tabular-nums ${stats.failed ? "text-red-600" : "text-navy-900"}`}>{stats.failed}</b>
        </p>
      </div>
      {stats.byAgent.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {t("byAgent")}: {stats.byAgent.slice(0, 4).map((a) => `${a.name} ${a.count}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
