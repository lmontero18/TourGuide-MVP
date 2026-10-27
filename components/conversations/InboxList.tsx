"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ConversationListSkeleton from "./ConversationListSkeleton";
import ChannelIcon from "./ChannelIcon";
import { useAuth } from "@/hooks/useAuth";
import { useLeads, type LeadWithContact } from "@/hooks/useLeads";
import { useConversationsContext } from "@/components/providers/ConversationsProvider";
import type { ConversationListItem } from "@/hooks/useConversations";
import { STAGE_DOT, formatMoney, isCurrentLead } from "@/components/leads/leadMeta";
import { parseReaction } from "@/lib/whatsapp/placeholders";

// Bandeja por lo que hay que hacer (prueba de diseno, flag inboxPreview):
// "Por responder" = le toca al equipo: el cliente escribio ultimo y no lo
// tiene el bot, o el bot la paso al equipo y nadie la tomo (ahi el ultimo
// mensaje es del bot, "te paso con el equipo"). "Mias" = asignadas a mi.
// "Todas" incluye las resueltas, marcadas con su etiqueta.
type Tab = "toAnswer" | "mine" | "all";
const TABS: Tab[] = ["toAnswer", "mine", "all"];
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const isToAnswer = (c: ConversationListItem) =>
  c.status !== "resolved" &&
  !c.botActive &&
  (c.lastRole === "user" || (c.status === "pending" && !c.assignee));

function tabFilters(me: string | undefined): Record<Tab, (c: ConversationListItem) => boolean> {
  return {
    toAnswer: isToAnswer,
    mine: (c) => c.status !== "resolved" && !!me && c.assignee?.id === me,
    all: () => true,
  };
}

function initials(name: string | null) {
  if (!name) return "#";
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function waitedMs(c: ConversationListItem, now: number) {
  return c.lastMessageIso ? now - new Date(c.lastMessageIso).getTime() : 0;
}

// Rojo pasado un dia, naranja pasadas 4 horas, amarillo antes.
function waitTone(ms: number) {
  if (ms >= DAY_MS) return "bg-red-50 text-red-700 ring-red-100";
  if (ms >= 4 * HOUR_MS) return "bg-orange-50 text-orange-700 ring-orange-100";
  return "bg-amber-50 text-amber-700 ring-amber-100";
}

type ShortT = (key: "min" | "h" | "d", values: { count: number }) => string;

function shortDuration(ms: number, t: ShortT) {
  const min = Math.max(1, Math.floor(ms / 60_000));
  if (min < 60) return t("min", { count: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t("h", { count: h });
  return t("d", { count: Math.floor(h / 24) });
}

// Hora si es de hoy, "Ayer", dia de la semana esta semana, fecha si no.
function stamp(iso: string | null, locale: string, yesterday: string, now: number) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date(now - DAY_MS).toDateString()) return yesterday;
  if (now - d.getTime() < 6 * DAY_MS) {
    const day = d.toLocaleDateString(locale, { weekday: "short" });
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export default function InboxList({ activeId }: { activeId?: string }) {
  const { user, orgId, loading: authLoading } = useAuth();
  const inTab = useMemo(() => tabFilters(user?.id), [user?.id]);
  const { conversations, loading } = useConversationsContext();
  const { leads } = useLeads(orgId);
  const t = useTranslations("dashboard.inbox");
  const tStage = useTranslations("dashboard.leads.stages");
  const tChat = useTranslations("dashboard.chat");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("toAnswer");
  const [search, setSearch] = useState("");
  // "Ahora" se mueve cada minuto para que los "Esperando X" avancen solos.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // La oportunidad mas reciente de cada conversacion (useLeads viene ordenado
  // por updated_at desc).
  const leadByConversation = useMemo(() => {
    const map = new Map<string, LeadWithContact>();
    for (const l of leads ?? []) if (l.conversation_id && !map.has(l.conversation_id)) map.set(l.conversation_id, l);
    return map;
  }, [leads]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((k) => [k, conversations.filter(inTab[k]).length])) as Record<Tab, number>,
    [conversations, inTab]
  );
  const overADay = useMemo(
    () => conversations.filter((c) => isToAnswer(c) && waitedMs(c, now) >= DAY_MS).length,
    [conversations, now]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = conversations.filter((c) => {
      if (!inTab[tab](c)) return false;
      if (!q) return true;
      const lead = leadByConversation.get(c.id);
      return (
        (c.contactName?.toLowerCase().includes(q) ?? false) ||
        c.contactPhone.includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (lead?.tour_interest?.toLowerCase().includes(q) ?? false)
      );
    });
    // Por responder: primero el que mas lleva esperando.
    return tab === "toAnswer" ? [...list].sort((a, b) => waitedMs(b, now) - waitedMs(a, now)) : list;
  }, [conversations, tab, search, leadByConversation, now, inTab]);

  const isLoading = authLoading || loading;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-5 pt-5">
        <h2 className="font-display text-2xl font-extrabold text-navy-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-semibold text-navy-900">{t("toAnswerCount", { count: counts.toAnswer })}</span>
          {overADay > 0 && <span className="text-red-600"> · {t("overADay", { count: overADay })}</span>}
        </p>
        <div className="mt-4 flex items-center gap-5 border-b border-slate-100" role="tablist">
          {TABS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 text-sm transition-colors ${
                tab === k ? "border-navy-900 font-semibold text-navy-900" : "border-transparent text-slate-500 hover:text-navy-900"
              }`}
            >
              {k === "toAnswer" && counts.toAnswer > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              {t(`tabs.${k}`)}
              <span className="text-xs text-slate-400">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="relative">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy-900 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">{t(`empty.${tab}`)}</p>
          </div>
        ) : (
          filtered.map((c) => {
            const found = leadByConversation.get(c.id);
            const lead = found && isCurrentLead(found, c.lastMessageIso) ? found : undefined;
            const waiting = isToAnswer(c) ? waitedMs(c, now) : null;
            const reaction = parseReaction(c.lastMessage);
            const preview = reaction
              ? [reaction.emoji, tChat(reaction.removed ? "reactionRemoved" : "reacted")].filter(Boolean).join(" ")
              : c.lastMessage;
            const active = c.id === activeId;
            return (
              <Link
                key={c.id}
                href={`/conversations/${c.id}`}
                prefetch={false}
                className={`mb-1 flex gap-3 rounded-xl border px-3 py-3 transition-colors ${
                  active ? "border-slate-200 bg-slate-50 shadow-sm" : "border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="relative h-10 w-10 shrink-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${c.unreadCount > 0 ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {initials(c.contactName)}
                  </div>
                  {/* De donde escribe el cliente; la etapa va en su etiqueta */}
                  <ChannelIcon channel={c.channel} className="absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm text-navy-900 ${c.unreadCount > 0 ? "font-bold" : "font-semibold"}`}>
                      {c.contactName || c.contactPhone}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{stamp(c.lastMessageIso, locale, t("yesterday"), now)}</span>
                  </div>
                  {lead?.tour_interest && <p className="truncate text-sm text-navy-800">{lead.tour_interest}</p>}
                  <p className="truncate text-sm text-slate-500">{preview}</p>
                  <div className="mt-2 flex min-w-0 items-center gap-1.5">
                    {waiting !== null && (
                      <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${waitTone(waiting)}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        {t("waiting", { time: shortDuration(waiting, t) })}
                      </span>
                    )}
                    {lead && (
                      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                        <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[lead.status]}`} />
                        {lead.status === "converted" && lead.amount != null
                          ? formatMoney(lead.amount, lead.currency, locale)
                          : tStage(lead.status)}
                      </span>
                    )}
                    {c.status === "resolved" && (
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">{t("resolved")}</span>
                    )}
                    {c.botActive && c.status !== "resolved" && (
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">{t("bot")}</span>
                    )}
                    {!c.botActive && c.assignee && (
                      // Iniciales del agente: el nombre completo no entra junto a las etiquetas.
                      <span
                        title={c.assignee.name}
                        className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200"
                      >
                        {initials(c.assignee.name)}
                      </span>
                    )}
                    {c.unreadCount > 0 && <span className={`${!c.botActive && c.assignee ? "" : "ml-auto "}h-2 w-2 shrink-0 rounded-full bg-blue-600`} aria-label={t("unread")} />}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
