"use client";

import { useTranslations } from "next-intl";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const VALUES = [12, 19, 8, 24, 31, 18, 6];

export default function LeadsChart() {
  const t = useTranslations("dashboard.metrics.chart");
  const max = Math.max(...VALUES);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-navy-900">{t("title")}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{t("sub")}</p>
        </div>
        <span className="text-xs font-medium text-slate-400">{t("period")}</span>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-2 h-40">
        {DAYS.map((day, i) => {
          const value = VALUES[i];
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-navy-900">{value}</span>
              <div className="w-full rounded-t-md bg-slate-100 relative overflow-hidden" style={{ height: "100%" }}>
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-md bg-navy-900 transition-all duration-500"
                  style={{ height: `${(value / max) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">{t(`days.${day}`)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
