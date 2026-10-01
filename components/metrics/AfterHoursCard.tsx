"use client";

import { useTranslations } from "next-intl";
import type { OrgMetrics } from "@/types";

interface AfterHoursCardProps {
  afterHours: OrgMetrics["after_hours"];
}

export default function AfterHoursCard({ afterHours }: AfterHoursCardProps) {
  const t = useTranslations("dashboard.metrics.afterHours");
  const slots = [
    { key: "slotEvening", count: afterHours.evening },
    { key: "slotNight", count: afterHours.night },
    { key: "slotWeekend", count: afterHours.weekend },
  ] as const;
  const total = Math.max(1, afterHours.conversations);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-navy-900">{t("title")}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{t("sub")}</p>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="font-display text-3xl font-extrabold tracking-tight text-navy-900">{afterHours.conversations}</span>
        <span className="text-sm text-slate-500">{t("conversations", { count: afterHours.conversations })}</span>
      </div>

      {afterHours.messages > 0 && (
        <div className="rounded-xl bg-green-50 border border-green-100 p-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-semibold text-green-800">
              {t("messages", { count: afterHours.messages })}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {slots.map((slot) => (
          <div key={slot.key} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-28 shrink-0">{t(slot.key)}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-navy-900/70" style={{ width: `${(slot.count / total) * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-navy-900 w-6 text-right">{slot.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
