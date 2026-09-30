"use client";

import { useTranslations } from "next-intl";
import type { ConversationStatus } from "@/types";

interface StatusBadgeProps {
  status: ConversationStatus;
  botActive?: boolean;
}

// Solo se muestran los estados que piden algo (CODE-162): "Esperando agente"
// en rojo y "Resuelta" en gris. "Abierta" es lo normal y no lleva badge.
export default function StatusBadge({ status, botActive }: StatusBadgeProps) {
  const t = useTranslations("dashboard.conversations.status");
  return (
    <div className="flex items-center gap-1.5">
      {status === "pending" && (
        <span className="inline-flex h-5 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 text-[10px] font-bold uppercase tracking-wider text-red-700">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          {t("pending")}
        </span>
      )}
      {status === "resolved" && (
        <span className="inline-flex h-5 items-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {t("resolved")}
        </span>
      )}
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
