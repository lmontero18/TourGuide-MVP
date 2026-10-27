"use client";

import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ConversationLead } from "@/hooks/useLeads";
import LeadFicha from "./LeadFicha";
import { STAGE_DOT, formatMoney } from "./leadMeta";

interface ConversationLeadPanelProps extends ConversationLead {
  contactName: string | null;
  contactPhone: string;
}

function initials(name: string | null) {
  if (!name) return "#";
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const iconButton =
  "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-navy-900";

// Ficha del cliente siempre abierta a la derecha del chat (flag leadPanel):
// el equipo ve quien es, que pidio y en que etapa esta sin abrir nada. En
// pantallas angostas no entra y queda el boton Ficha del encabezado.
export default function ConversationLeadPanel({ lead, update, refresh, contactName, contactPhone }: ConversationLeadPanelProps) {
  const t = useTranslations("dashboard.leads");
  const locale = useLocale();
  const name = contactName || contactPhone || t("unknownContact");

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(contactPhone);
      toast.success(t("phoneCopied"));
    } catch {
      toast.error(contactPhone);
    }
  };

  return (
    <aside aria-label={t("fichaTitle")} className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white xl:flex">
      <div className="flex flex-col items-center border-b border-slate-100 px-5 pb-5 pt-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-900/10 font-display text-xl font-extrabold text-navy-700">
          {initials(contactName)}
        </div>
        <h2 className="mt-3 max-w-full truncate font-display text-lg font-extrabold text-navy-900">{name}</h2>
        {contactName && <p className="text-xs text-slate-400">{contactPhone}</p>}
        {lead && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
            <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[lead.status]}`} />
            {t(`stages.${lead.status}`)}
            {lead.status === "converted" && lead.amount != null && ` · ${formatMoney(lead.amount, lead.currency, locale)}`}
          </p>
        )}
        {contactPhone && (
          <div className="mt-4 flex gap-2">
            <a href={`tel:+${contactPhone.replace(/\D/g, "")}`} title={t("call")} aria-label={t("call")} className={iconButton}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </a>
            <button onClick={copyPhone} title={t("copyPhone")} aria-label={t("copyPhone")} className={iconButton}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("fichaTitle")}</p>
        {lead === undefined ? (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-slate-100" />)}
          </div>
        ) : lead ? (
          <LeadFicha key={lead.id} lead={lead} onUpdate={update} onRefresh={refresh} showConversationLink={false} />
        ) : (
          <p className="text-sm text-slate-500">{t("noLeadYet")}</p>
        )}
      </div>
    </aside>
  );
}
