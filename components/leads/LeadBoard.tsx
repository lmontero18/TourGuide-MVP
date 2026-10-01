"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { LeadWithContact } from "@/hooks/useLeads";
import type { LeadStatus } from "@/types";
import { STAGES, STAGE_DOT, TEMPERATURE, formatMoney, timeAgo } from "./leadMeta";

interface LeadBoardProps {
  leads: LeadWithContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, status: LeadStatus) => void;
}

function LeadCard({ lead, selected, onSelect }: { lead: LeadWithContact; selected: boolean; onSelect: () => void }) {
  const t = useTranslations("dashboard.leads");
  const locale = useLocale();
  const temp = lead.intent ? TEMPERATURE[lead.intent] : null;
  const detail = [lead.metadata?.group_size, lead.metadata?.travel_date].filter(Boolean).join(" · ");
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)}
      onClick={onSelect}
      className={`w-full rounded-xl border bg-white p-3 text-left transition-shadow hover:shadow-md ${
        selected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"
      }`}
    >
      <span className="block truncate text-sm font-bold text-navy-900">{lead.contact?.name || lead.contact?.phone || t("unknownContact")}</span>
      <span className="mt-0.5 block truncate text-xs text-slate-600">{lead.tour_interest || t("noTourYet")}</span>
      {detail && <span className="block truncate text-[11px] text-slate-400">{detail}</span>}
      <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
        {temp ? <span className={`rounded-full px-1.5 py-px font-bold ${temp.className}`}>{t(`temperature.${temp.key}`)}</span> : <span />}
        <span className="tabular-nums">
          {lead.status === "converted" && lead.amount != null ? formatMoney(lead.amount, lead.currency, locale) : timeAgo(lead.updated_at, locale)}
        </span>
      </span>
    </button>
  );
}

// Embudo por etapas. Las tarjetas se arrastran entre columnas, o se mueven
// desde la ficha.
export default function LeadBoard({ leads, selectedId, onSelect, onMove }: LeadBoardProps) {
  const t = useTranslations("dashboard.leads");
  const [over, setOver] = useState<LeadStatus | null>(null);

  return (
    <div className="grid grid-cols-[repeat(5,minmax(220px,1fr))] gap-3 overflow-x-auto pb-2">
      {STAGES.map((stage) => {
        const cards = leads.filter((l) => l.status === stage);
        return (
          <section
            key={stage}
            aria-label={t(`stages.${stage}`)}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage);
            }}
            onDragLeave={() => setOver((o) => (o === stage ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/lead-id");
              if (id) onMove(id, stage);
            }}
            className={`flex min-h-[320px] flex-col gap-2 rounded-2xl border p-2.5 transition-colors ${
              over === stage ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-slate-50/60"
            }`}
          >
            <header className="flex items-center justify-between px-1 pb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900">
                <span className={`h-2 w-2 rounded-full ${STAGE_DOT[stage]}`} />
                {t(`stages.${stage}`)}
              </span>
              <span className="text-xs tabular-nums text-slate-400">{cards.length}</span>
            </header>
            {cards.map((lead) => (
              <LeadCard key={lead.id} lead={lead} selected={lead.id === selectedId} onSelect={() => onSelect(lead.id)} />
            ))}
            {cards.length === 0 && <p className="px-1 py-4 text-center text-[11px] text-slate-400">{t(`emptyStage.${stage}`)}</p>}
          </section>
        );
      })}
    </div>
  );
}
