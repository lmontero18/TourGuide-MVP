"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { LeadPatch, LeadWithContact } from "@/hooks/useLeads";
import LeadFicha from "./LeadFicha";

interface LeadDrawerProps {
  lead: LeadWithContact | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: LeadPatch) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRefresh: (id: string) => Promise<boolean>;
  showConversationLink?: boolean;
  focusAmount?: boolean;
}

// Panel lateral con la ficha del cliente (tablero de leads y chat).
export default function LeadDrawer({ lead, open, onClose, onUpdate, onRefresh, showConversationLink, focusAmount }: LeadDrawerProps) {
  const t = useTranslations("dashboard.leads");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const name = lead?.contact?.name || lead?.contact?.phone || t("unknownContact");

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-navy-900/25 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        aria-label={t("fichaTitle")}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("fichaTitle")}</p>
            <h2 className="truncate font-display text-xl font-extrabold text-navy-900">{name}</h2>
            {lead?.contact?.name && <p className="text-xs text-slate-400">{lead.contact.phone}</p>}
          </div>
          <button onClick={onClose} aria-label={t("close")} className="px-2 text-2xl leading-none text-slate-400 hover:text-navy-900">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lead ? (
            <LeadFicha
              key={lead.id}
              lead={lead}
              onUpdate={onUpdate}
              onRefresh={onRefresh}
              showConversationLink={showConversationLink}
              focusAmount={focusAmount}
            />
          ) : (
            <p className="text-sm text-slate-500">{t("noLeadYet")}</p>
          )}
        </div>
      </aside>
    </>
  );
}
