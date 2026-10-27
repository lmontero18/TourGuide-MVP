"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useContactLeads, type ConversationLead, type LeadPatch, type LeadWithContact } from "@/hooks/useLeads";
import type { LeadField, LeadStatus } from "@/types";
import { FICHA_FIELDS, STAGES, STAGE_DOT, TEMPERATURE, formatMoney, isCurrentLead, timeAgo } from "./leadMeta";
import { formatQuote, groupCount, parseQuote, suggestAmount, type SuggestedAmount } from "@/lib/leads/quoteAmount";
import { cleanText } from "@/lib/leads/emptyValue";
import { useAuth } from "@/hooks/useAuth";
import { hasFeature } from "@/lib/features";
import LeadBookings from "@/components/bookings/LeadBookings";

interface ConversationLeadPanelProps extends ConversationLead {
  contactName: string | null;
  contactPhone: string;
  // Ultimo mensaje de la conversacion: si llego despues de cerrar la
  // oportunidad, la ficha avisa que es de antes.
  lastMessageIso: string | null;
}

const CURRENCIES = ["USD", "NIO", "CRC", "MXN", "PEN", "COP", "GTQ", "EUR"];
// El proximo paso va en su propia seccion, no entre los datos del viaje.
const TRIP_FIELDS = FICHA_FIELDS.filter((f) => f !== "next_step");

function initials(name: string | null) {
  if (!name) return "#";
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function fieldValue(lead: LeadWithContact, key: LeadField): string {
  if (key === "tour_interest") return cleanText(lead.tour_interest) ?? "";
  if (key === "summary") return cleanText(lead.summary) ?? "";
  if (key === "next_step") return cleanText(lead.next_step) ?? "";
  return cleanText(lead.metadata?.[key]) ?? "";
}

const iconButton =
  "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-navy-900";
const sectionLabel = "text-[11px] font-bold uppercase tracking-wider text-slate-400";

// Texto que se lee como texto y se edita con un clic. Al guardarlo queda
// bloqueado y la IA ya no lo pisa (igual que en LeadFicha).
function InlineText({
  value,
  multiline,
  clamp,
  className = "",
  onSave,
}: {
  value: string;
  multiline?: boolean;
  clamp?: boolean;
  className?: string;
  onSave: (value: string | null) => void;
}) {
  const t = useTranslations("dashboard.leads.panel");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [expanded, setExpanded] = useState(false);
  const save = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onSave(draft.trim() || null);
  };

  if (editing) {
    const field = "w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-navy-900 outline-none focus:border-navy-900";
    return multiline ? (
      <textarea
        autoFocus
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        className={`${field} resize-none`}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className={field}
      />
    );
  }

  const long = clamp && value.length > 140;
  return (
    <div className={className}>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        title={t("clickToEdit")}
        className={`w-full whitespace-pre-line break-words rounded-md text-left text-sm text-navy-900 hover:bg-slate-50 ${long && !expanded ? "line-clamp-3" : ""}`}
      >
        {value || <span className="text-slate-300">{t("add")}</span>}
      </button>
      {long && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-0.5 text-xs font-semibold text-slate-500 hover:text-navy-900">
          {expanded ? t("less") : t("more")}
        </button>
      )}
    </div>
  );
}

// Solo digitos y separador decimal: los montos no aceptan letras.
const numericOnly = (v: string) => v.replace(/[^\d.,]/g, "");

function toNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

const editBox = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-navy-900 outline-none focus:border-navy-900";

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Menu de etapa: un select nativo toma el ancho de la opcion mas larga y deja
// el punto lejos del texto.
function StageMenu({ value, onChange }: { value: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const t = useTranslations("dashboard.leads");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        id="panel-stage"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="-mr-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-semibold text-navy-900 hover:bg-slate-50"
      >
        <span className={`h-2 w-2 rounded-full ${STAGE_DOT[value]}`} />
        {t(`stages.${value}`)}
        <Chevron />
      </button>
      {open && (
        <ul role="listbox" aria-label={t("stage")} className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {STAGES.map((s) => (
            <li key={s}>
              <button
                role="option"
                aria-selected={s === value}
                onClick={() => {
                  setOpen(false);
                  onChange(s);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${s === value ? "font-semibold text-navy-900" : "text-slate-600"}`}
              >
                <span className={`h-2 w-2 rounded-full ${STAGE_DOT[s]}`} />
                {t(`stages.${s}`)}
                {s === value && <span className="ml-auto text-navy-900" aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Monto de la venta: sin monto es un boton; al editar, solo numeros.
function AmountRow({
  lead,
  suggestion,
  autoOpen,
  onSave,
}: {
  lead: LeadWithContact;
  suggestion: SuggestedAmount | null;
  autoOpen: boolean;
  onSave: (amount: number | null, currency: string) => void;
}) {
  const t = useTranslations("dashboard.leads");
  const tp = useTranslations("dashboard.leads.panel");
  const locale = useLocale();
  const [editing, setEditing] = useState(autoOpen);
  const [draft, setDraft] = useState(lead.amount != null ? String(lead.amount) : suggestion ? String(suggestion.amount) : "");
  const [currency, setCurrency] = useState(lead.currency ?? suggestion?.currency ?? "USD");
  const missing = lead.amount == null;

  const save = () => {
    const n = toNumber(draft);
    if (Number.isNaN(n)) return toast.error(t("amountInvalid"));
    setEditing(false);
    if (n !== lead.amount || currency !== lead.currency) onSave(n, currency);
  };

  return (
    <div className={`flex min-h-9 items-center justify-between gap-3 rounded-lg py-1 ${missing && !editing ? "-mx-2 bg-green-50 px-2" : ""}`}>
      <label htmlFor="panel-amount" className={`text-sm ${missing && !editing ? "font-semibold text-green-800" : "text-slate-500"}`}>
        {tp("amount")}
      </label>
      {editing ? (
        <div
          className="flex items-center gap-1"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) save();
          }}
        >
          <input
            id="panel-amount"
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(numericOnly(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="0"
            className={`${editBox} w-24 text-right font-semibold tabular-nums`}
          />
          <select aria-label={t("currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${editBox} px-1`}>
            {[...new Set([currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      ) : missing ? (
        <button id="panel-amount" onClick={() => setEditing(true)} className="text-sm font-semibold text-green-700 hover:text-green-900">
          {tp("addAmount")}
        </button>
      ) : (
        <button id="panel-amount" onClick={() => setEditing(true)} title={tp("clickToEdit")} className="-mr-1.5 rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums text-navy-900 hover:bg-slate-50">
          {formatMoney(lead.amount!, lead.currency, locale)}
        </button>
      )}
    </div>
  );
}

// Precio cotizado: se edita con numero, moneda y por persona o total. Se
// guarda como texto ("$280 por persona"), el formato que usa la IA.
function QuoteField({ value, onSave }: { value: string; onSave: (value: string | null) => void }) {
  const t = useTranslations("dashboard.leads");
  const tp = useTranslations("dashboard.leads.panel");
  const parts = parseQuote(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(parts.amount != null ? String(parts.amount) : "");
  const [currency, setCurrency] = useState(parts.currency);
  const [perPerson, setPerPerson] = useState(parts.perPerson);

  const save = () => {
    const n = toNumber(draft);
    if (Number.isNaN(n)) return toast.error(t("amountInvalid"));
    setEditing(false);
    const next = n == null ? null : formatQuote(n, currency, perPerson);
    if ((next ?? "") !== value) onSave(next);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title={tp("clickToEdit")}
        className="w-full break-words rounded-md text-left text-sm font-medium text-navy-900 hover:bg-slate-50"
      >
        {value || <span className="font-normal text-slate-300">{tp("add")}</span>}
      </button>
    );
  }
  return (
    <div
      className="space-y-1"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      }}
    >
      <div className="flex gap-1">
        <input
          autoFocus
          inputMode="decimal"
          aria-label={t("fields.quote")}
          value={draft}
          onChange={(e) => setDraft(numericOnly(e.target.value))}
          placeholder="0"
          className={`${editBox} min-w-0 flex-1 font-semibold tabular-nums`}
        />
        <select aria-label={t("currency")} value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${editBox} px-1`}>
          {[...new Set([currency, ...CURRENCIES])].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <select
        aria-label={tp("quoteUnit")}
        value={perPerson ? "person" : "total"}
        onChange={(e) => setPerPerson(e.target.value === "person")}
        className={`${editBox} w-full`}
      >
        <option value="person">{tp("perPerson")}</option>
        <option value="total">{tp("total")}</option>
      </select>
    </div>
  );
}

// Ficha del cliente siempre abierta a la derecha del chat (flag leadPanel).
// Version compacta de LeadFicha: los datos se leen como texto, los vacios
// quedan escondidos y la etapa es un menu. En pantallas angostas no entra y
// queda el boton Ficha del encabezado con la ficha completa.
export default function ConversationLeadPanel({ lead, update, refresh, contactName, contactPhone, lastMessageIso }: ConversationLeadPanelProps) {
  const t = useTranslations("dashboard.leads");
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

      {lead === undefined ? (
        <div className="space-y-3 px-5 py-5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-slate-100" />)}
        </div>
      ) : lead ? (
        <PanelBody key={lead.id} lead={lead} update={update} refresh={refresh} stale={!isCurrentLead(lead, lastMessageIso)} />
      ) : (
        <p className="px-5 py-5 text-sm text-slate-500">{t("noLeadYet")}</p>
      )}
    </aside>
  );
}

function PanelBody({ lead, update, refresh, stale }: Pick<ConversationLead, "update" | "refresh"> & { lead: LeadWithContact; stale: boolean }) {
  const t = useTranslations("dashboard.leads");
  const tp = useTranslations("dashboard.leads.panel");
  const locale = useLocale();
  const { featureFlags } = useAuth();
  const { data: contactLeads } = useContactLeads(lead.contact_id);
  const past = (contactLeads ?? []).filter((l) => l.id !== lead.id);
  const [showEmpty, setShowEmpty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [justWon, setJustWon] = useState(false);
  const closed = lead.status === "converted" || lead.status === "lost";
  const temp = lead.intent ? TEMPERATURE[lead.intent] : null;
  const suggestion = suggestAmount(lead.metadata?.quote, lead.metadata?.group_size);

  const run = async (patch: LeadPatch) => {
    const res = await update(lead.id, patch);
    if (!res.ok) toast.error(res.error || t("saveError"));
  };
  const saveField = (field: LeadField) => (value: string | null) => void run({ fields: { [field]: value } });
  const setStage = (status: LeadStatus) => {
    if (status === lead.status) return;
    if (status === "converted" && lead.amount == null) setJustWon(true);
    void run({ status });
  };

  const filled = TRIP_FIELDS.filter((f) => fieldValue(lead, f));
  const empty = TRIP_FIELDS.filter((f) => !fieldValue(lead, f));
  const shown = showEmpty ? TRIP_FIELDS : filled;
  // Precio por persona × grupo, para no sacar la calculadora.
  const quote = parseQuote(fieldValue(lead, "quote"));
  const people = groupCount(lead.metadata?.group_size);
  const quoteTotal = quote.perPerson && quote.amount != null && people ? Math.round(quote.amount * people * 100) / 100 : null;
  const summary = fieldValue(lead, "summary");
  const nextStep = fieldValue(lead, "next_step");
  const sourceMark = (f: LeadField) =>
    lead.locked_fields?.includes(f) ? null : (
      <span title={tp("byAi")} className="ml-1 text-[10px] text-slate-300">✦</span>
    );

  const refreshNow = async () => {
    setRefreshing(true);
    const ok = await refresh(lead.id);
    setRefreshing(false);
    if (!ok) toast.error(t("refreshError"));
  };

  return (
    <div className="divide-y divide-slate-100">
      {stale && (
        <div className="bg-slate-50 px-5 py-3 text-xs text-slate-600">
          <p>
            {tp("staleNotice", {
              stage: t(`stages.${lead.status}`).toLowerCase(),
              date: new Date(lead.closed_at ?? lead.updated_at).toLocaleDateString(locale, { day: "numeric", month: "short" }),
            })}
          </p>
          <button onClick={refreshNow} disabled={refreshing} className="mt-1 font-semibold text-navy-900 hover:underline disabled:opacity-40">
            ↻ {refreshing ? t("refreshing") : t("refreshClosed")}
          </button>
        </div>
      )}
      <div className="space-y-1 px-5 py-4">
        <div className="flex items-center justify-between gap-3 py-1">
          <label htmlFor="panel-stage" className="text-sm text-slate-500">{t("stage")}</label>
          <StageMenu value={lead.status} onChange={setStage} />
        </div>
        {lead.status === "converted" && (
          <AmountRow
            key={`${lead.amount}-${lead.currency}`}
            lead={lead}
            suggestion={suggestion}
            autoOpen={justWon && lead.amount == null}
            onSave={(amount, currency) => {
              setJustWon(false);
              void run({ amount, currency });
            }}
          />
        )}
      </div>

      {summary && (
        <div className="px-5 py-4">
          <p className={`${sectionLabel} mb-1.5`}>{t("summary")}{sourceMark("summary")}</p>
          <InlineText value={summary} multiline clamp onSave={saveField("summary")} className="text-slate-700" />
        </div>
      )}

      <div className="px-5 py-4">
        <p className={`${sectionLabel} mb-1`}>{tp("trip")}</p>
        <dl>
          {shown.map((f) => (
            <Fragment key={`${f}-${fieldValue(lead, f)}`}>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-2 py-1.5">
              <dt className="pt-px text-sm text-slate-500">
                {t(`fields.${f}`)}
                {fieldValue(lead, f) && sourceMark(f)}
              </dt>
              <dd className="min-w-0">
                {f === "quote" ? (
                  <QuoteField value={fieldValue(lead, f)} onSave={saveField(f)} />
                ) : fieldValue(lead, f) ? (
                  <InlineText value={fieldValue(lead, f)} multiline={f === "needs"} onSave={saveField(f)} className="font-medium" />
                ) : (
                  <InlineText value="" onSave={saveField(f)} />
                )}
              </dd>
            </div>
            {f === "quote" && quoteTotal != null && (
              <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-2 py-1.5">
                <dt className="text-sm text-slate-500">{tp("quoteTotal")}</dt>
                <dd className="text-sm">
                  <span className="font-bold tabular-nums text-navy-900">{formatMoney(quoteTotal, quote.currency, locale)}</span>
                  <span className="ml-1.5 text-xs tabular-nums text-slate-400">
                    {formatMoney(quote.amount!, quote.currency, locale)} × {people}
                  </span>
                </dd>
              </div>
            )}
            </Fragment>
          ))}
        </dl>
        {empty.length > 0 && (
          <button onClick={() => setShowEmpty((v) => !v)} className="mt-1 text-xs font-semibold text-slate-500 hover:text-navy-900">
            {showEmpty ? tp("hideEmpty") : tp("addFields", { fields: empty.map((f) => t(`fields.${f}`).toLowerCase()).join(", ") })}
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        <p className={`${sectionLabel} mb-1.5`}>{t("fields.next_step")}{nextStep && sourceMark("next_step")}</p>
        {nextStep ? (
          <div className="flex gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600" aria-hidden>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
            <InlineText value={nextStep} multiline clamp onSave={saveField("next_step")} className="min-w-0 flex-1 font-medium" />
          </div>
        ) : (
          <InlineText value="" onSave={saveField("next_step")} />
        )}
      </div>

      {hasFeature(featureFlags, "bookings") && (
        <div className="px-5 py-4 empty:hidden">
          <LeadBookings lead={lead} />
        </div>
      )}

      {past.length > 0 && (
        <div className="px-5 py-4">
          <p className={`${sectionLabel} mb-1.5`}>{t("history", { count: past.length })}</p>
          <ul className="space-y-1.5">
            {past.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STAGE_DOT[p.status]}`} />
                  <span className="truncate text-slate-700">{p.tour_interest || t("noTourYet")}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-400">
                  {p.status === "converted" && p.amount != null ? formatMoney(p.amount, p.currency, locale) : t(`stages.${p.status}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-5 py-3 text-[11px] text-slate-400" title={t("fichaHint")}>
        {temp && <span className={`rounded-full px-1.5 py-px font-bold ${temp.className}`}>{t(`temperature.${temp.key}`)}</span>}
        <span>{t("updated", { when: timeAgo(lead.updated_at, locale) })}</span>
        <span aria-hidden>·</span>
        <button
          onClick={refreshNow}
          disabled={refreshing}
          title={closed ? t("refreshClosedHint") : undefined}
          className="font-semibold text-slate-500 hover:text-navy-900 disabled:opacity-40"
        >
          ↻ {refreshing ? t("refreshing") : closed ? t("refreshClosed") : t("refresh")}
        </button>
      </div>
    </div>
  );
}
