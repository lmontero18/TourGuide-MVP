"use client";

import { useTranslations } from "next-intl";
import type { ConversationStatus } from "@/types";

interface StatusBadgeProps {
  status: ConversationStatus;
  botActive?: boolean;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function StatusBadge({ status, botActive }: StatusBadgeProps) {
  const t = useTranslations("dashboard.conversations.status");
  const color = STATUS_COLORS[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-bold uppercase tracking-wider ${color}`}>
        {t(status)}
      </span>
      {botActive && status !== "resolved" && (
        <span className="inline-flex h-5 items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 text-[10px] font-bold text-green-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          {t("bot")}
        </span>
      )}
    </div>
  );
}
