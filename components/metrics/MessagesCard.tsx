"use client";

import { useTranslations } from "next-intl";
import type { OrgMetrics } from "@/types";

interface MessagesCardProps {
  messages: OrgMetrics["messages"];
}

export default function MessagesCard({ messages }: MessagesCardProps) {
  const t = useTranslations("dashboard.metrics.messages");
  const rows = [
    { key: "client", count: messages.client, color: "bg-blue-500" },
    { key: "bot", count: messages.bot, color: "bg-navy-900" },
    { key: "agent", count: messages.agent, color: "bg-green-500" },
  ] as const;
  const total = Math.max(1, messages.client + messages.bot + messages.agent);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-navy-900">{t("title")}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{t("sub")}</p>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 w-20 shrink-0">{t(row.key)}</span>
            <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${row.color} transition-all duration-700`} style={{ width: `${(row.count / total) * 100}%` }} />
            </div>
            <span className="text-xs font-bold text-navy-900 w-10 text-right">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
