"use client";

import { useLocale, useTranslations } from "next-intl";

interface ActivityChartProps {
  daily: { date: string; conversations: number }[];
}

// Con 30/90 barras no entran todos los labels: se muestra ~1 de cada N.
const MAX_LABELS = 8;

export default function ActivityChart({ daily }: ActivityChartProps) {
  const t = useTranslations("dashboard.metrics.chart");
  const locale = useLocale();
  const max = Math.max(1, ...daily.map((d) => d.conversations));
  const labelEvery = Math.max(1, Math.ceil(daily.length / MAX_LABELS));
  const showValues = daily.length <= 14;
  // `date` viene como YYYY-MM-DD en la timezone de la agencia: parsear a
  // mediodia UTC evita que el huso del navegador corra el dia.
  const fmt = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    ...(daily.length <= 7 ? { weekday: "short" } : { day: "numeric", month: "short" }),
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-navy-900">{t("title")}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{t("sub")}</p>
      </div>

      <div className={`flex items-end h-40 ${daily.length > 30 ? "gap-px" : "gap-1.5"}`}>
        {daily.map((day, i) => (
          <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full">
            {showValues && <span className="text-[10px] font-bold text-navy-900">{day.conversations}</span>}
            <div
              className="w-full flex-1 rounded-t-md bg-slate-100 relative overflow-hidden"
              title={`${fmt.format(new Date(`${day.date}T12:00:00Z`))}: ${day.conversations}`}
            >
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-md bg-navy-900 transition-all duration-500"
                style={{ height: `${(day.conversations / max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 whitespace-nowrap h-3">
              {i % labelEvery === 0 ? fmt.format(new Date(`${day.date}T12:00:00Z`)) : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
