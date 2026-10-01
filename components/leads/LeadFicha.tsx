"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { LeadPatch, LeadWithContact } from "@/hooks/useLeads";
import type { LeadField, LeadStatus } from "@/types";
import { FICHA_FIELDS, STAGES, STAGE_DOT, TEMPERATURE, timeAgo } from "./leadMeta";

interface LeadFichaProps {
  lead: LeadWithContact;
  onUpdate: (id: string, patch: LeadPatch) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRefresh: (id: string) => Promise<boolean>;
  showConversationLink?: boolean;
  focusAmount?: boolean;
}

const CURRENCIES = ["USD", "NIO", "CRC", "MXN", "PEN", "COP", "GTQ", "EUR"];

function fieldValue(lead: LeadWithContact, key: LeadField): string {
  if (key === "tour_interest") return lead.tour_interest ?? "";
  if (key === "summary") return lead.summary ?? "";
  if (key === "next_step") return lead.next_step ?? "";
  return lead.metadata?.[key] ?? "";
}

// Campo editable en el lugar: guarda al salir si cambio. Al guardarlo queda
// bloqueado y la IA ya no lo pisa.
function EditableField({
  lead,
  field,
  label,
  multiline,
  stacked,
  onSave,
}: {
  lead: LeadWithContact;
  field: LeadField;
  label: string;
  multiline?: boolean;
  stacked?: boolean;
  onSave: (field: LeadField, value: string | null) => void;
}) {
  const t = useTranslations("dashboard.leads");
  const current = fieldValue(lead, field);
  const [draft, setDraft] = useState(current);
  const [editing, setEditing] = useState(false);
  const locked = lead.locked_fields?.includes(field);
  const value = editing ? draft : current;
  const save = () => {
    setEditing(false);
    if (draft.trim() !== current.trim()) onSave(field, draft.trim() || null);
  };
  const input =
    "w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-navy-900 outline-none placeholder:font-normal placeholder:text-slate-300 hover:border-slate-200 focus:border-slate-300 focus:bg-white";

  return (
    <div className={`grid items-start gap-2 py-1.5 ${stacked ? "grid-cols-1" : "grid-cols-[120px_minmax(0,1fr)] border-b border-dashed border-slate-100 last:border-b-0 max-sm:grid-cols-1"}`}>
      <label htmlFor={`lead-${field}`} className={stacked ? "text-xs font-bold text-navy-900" : "pt-1.5 text-xs text-slate-500"}>
        {label}
        {current && <span className="block text-[10px] text-slate-300">{locked ? t("edited") : t("byAi")}</span>}
      </label>
      {multiline ? (
        <textarea
          id={`lead-${field}`}
          rows={2}
          value={value}
          placeholder="—"
          onFocus={() => { setDraft(current); setEditing(true); }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          className={`${input} resize-none`}
        />
      ) : (
        <input
          id={`lead-${field}`}
          value={value}
          placeholder="—"
          onFocus={() => { setDraft(current); setEditing(true); }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className={input}
        />
      )}
    </div>
  );
}

export default function LeadFicha({ lead, onUpdate, onRefresh, showConversationLink = true, focusAmount }: LeadFichaProps) {
  const t = useTranslations("dashboard.leads");
  const locale = useLocale();
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState(lead.amount != null ? String(lead.amount) : "");
  const temp = lead.intent ? TEMPERATURE[lead.intent] : null;

  const run = async (patch: LeadPatch) => {
    const res = await onUpdate(lead.id, patch);
    if (!res.ok) toast.error(res.error || t("saveError"));
  };
  const saveField = (field: LeadField, value: string | null) => void run({ fields: { [field]: value } });
  const setStage = (status: LeadStatus) => {
    if (status !== lead.status) void run({ status });
  };
  const saveAmount = () => {
    const n = amount.trim() === "" ? null : Number(amount.replace(",", "."));
    if (n !== null && (!Number.isFinite(n) || n < 0)) return toast.error(t("amountInvalid"));
    if (n !== lead.amount) void run({ amount: n, currency: lead.currency ?? "USD" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {temp && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${temp.className}`}>{t(`temperature.${temp.key}`)}</span>}
        <span className="text-xs text-slate-400">{t("updated", { when: timeAgo(lead.updated_at, locale) })}</span>
        <button
          onClick={async () => {
            setRefreshing(true);
            const ok = await onRefresh(lead.id);
            setRefreshing(false);
            if (!ok) toast.error(t("refreshError"));
          }}
          disabled={refreshing || lead.status === "converted" || lead.status === "lost"}
          className="ml-auto rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-40"
        >
          {refreshing ? t("refreshing") : t("refresh")}
        </button>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-bold text-navy-900">{t("stage")}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("stage")}>
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              aria-pressed={lead.status === s}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                lead.status === s ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[s]}`} />
              {t(`stages.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {lead.status === "converted" && (
        <div className="rounded-xl border border-green-200 bg-green-50/60 p-3">
          <label htmlFor="lead-amount" className="text-xs font-bold text-green-800">{t("amount")}</label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="lead-amount"
              inputMode="decimal"
              autoFocus={focusAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={saveAmount}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder="150"
              className="w-32 rounded-lg border border-green-200 bg-white px-3 py-1.5 text-sm font-bold tabular-nums text-navy-900 outline-none focus:border-green-400"
            />
            <select
              aria-label={t("currency")}
              value={lead.currency ?? "USD"}
              onChange={(e) => void run({ currency: e.target.value })}
              className="rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm text-navy-900"
            >
              {[...new Set([lead.currency ?? "USD", ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <p className="mt-1.5 text-[11px] text-green-700">{t("amountHint")}</p>
        </div>
      )}

      <div className="rounded-xl bg-slate-50 px-2 py-1">
        <EditableField key={`summary-${lead.summary}`} lead={lead} field="summary" label={t("summary")} multiline stacked onSave={saveField} />
      </div>

      <div>
        {FICHA_FIELDS.map((f) => (
          <EditableField key={`${f}-${fieldValue(lead, f)}`} lead={lead} field={f} label={t(`fields.${f}`)} multiline={f === "next_step"} onSave={saveField} />
        ))}
      </div>

      {showConversationLink && lead.conversation_id && (
        <Link
          href={`/conversations/${lead.conversation_id}`}
          className="flex h-10 items-center justify-center rounded-xl bg-navy-900 text-sm font-bold text-white hover:bg-navy-800"
        >
          {t("openConversation")}
        </Link>
      )}
      <p className="text-[11px] text-slate-400">{t("fichaHint")}</p>
    </div>
  );
}
