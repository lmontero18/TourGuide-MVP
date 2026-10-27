"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { LeadWithContact } from "@/hooks/useLeads";
import type { ConversationListItem } from "@/hooks/useConversations";
import { cleanText } from "@/lib/leads/emptyValue";
import { isCurrentLead } from "@/components/leads/leadMeta";

interface ChatInsightProps {
  lead: LeadWithContact | null | undefined;
  item: ConversationListItem | undefined;
  contactName: string | null;
}

// Desde cuanto sin respuesta vale la pena avisarlo.
const WAIT_NOTICE_MS = 15 * 60_000;

// "Que esta pasando" sobre el cuadro de texto (prueba de diseno, solo usuarios
// preview): el resumen de la IA y, si el cliente espera, hace cuanto.
export default function ChatInsight({ lead, item, contactName }: ChatInsightProps) {
  const t = useTranslations("dashboard.inbox.insight");
  const [hidden, setHidden] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const summary = lead && isCurrentLead(lead, item?.lastMessageIso ?? null) ? cleanText(lead.summary) : null;
  const waitingMs =
    item && item.status !== "resolved" && !item.botActive && item.lastRole === "user" && item.lastMessageIso
      ? now - new Date(item.lastMessageIso).getTime()
      : 0;
  const waiting = waitingMs >= WAIT_NOTICE_MS;
  if (hidden || (!summary && !waiting)) return null;

  const min = Math.floor(waitingMs / 60_000);
  const since = min < 60 ? t("minutes", { count: min }) : min < 1440 ? t("hours", { count: Math.floor(min / 60) }) : t("days", { count: Math.floor(min / 1440) });

  return (
    <div className="mx-4 mb-3 flex gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">{t("title")}</p>
        {summary && <p className="mt-0.5 line-clamp-3 text-sm text-navy-900">{summary}</p>}
        {waiting && (
          <p className={`mt-0.5 text-sm font-semibold ${waitingMs >= 4 * 3_600_000 ? "text-red-700" : "text-amber-700"}`}>
            {t("waiting", { name: contactName || t("client"), since })}
          </p>
        )}
      </div>
      <button onClick={() => setHidden(true)} aria-label={t("hide")} className="self-start px-1 text-lg leading-none text-blue-300 hover:text-blue-700">
        ×
      </button>
    </div>
  );
}
