"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useConversationLead } from "@/hooks/useLeads";
import LeadDrawer from "./LeadDrawer";
import { STAGE_DOT } from "./leadMeta";

// Boton "Ficha" del encabezado del chat: abre la ficha del cliente que llena
// la IA, sin salir de la conversacion.
export default function ConversationLeadButton({ conversationId }: { conversationId: string }) {
  const t = useTranslations("dashboard.leads");
  const { lead, update, refresh } = useConversationLead(conversationId);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={lead === undefined}
        title={t("fichaTitle")}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        {lead && <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[lead.status]}`} />}
        {t("fichaButton")}
      </button>
      <LeadDrawer lead={lead ?? null} open={open} onClose={close} onUpdate={update} onRefresh={refresh} showConversationLink={false} />
    </>
  );
}
