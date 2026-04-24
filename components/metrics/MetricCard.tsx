"use client";

import { useTranslations } from "next-intl";

interface MetricCardProps {
  label: string;
  value: number | string;
  change?: string;
  positive?: boolean;
  icon?: React.ReactNode;
}

export default function MetricCard({ label, value, change, positive, icon }: MetricCardProps) {
  const t = useTranslations("dashboard.metrics");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">{icon}</div>}
      </div>
      <p className="font-display text-2xl font-extrabold tracking-tight text-navy-900">{value}</p>
      {change && (
        <p className={`text-xs font-medium mt-1 ${positive ? "text-green-600" : "text-red-500"}`}>
          {positive ? "+" : ""}{change} {t("change")}
        </p>
      )}
    </div>
  );
}
