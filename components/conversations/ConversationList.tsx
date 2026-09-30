"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import ConversationItem from "./ConversationItem";
import ConversationListSkeleton from "./ConversationListSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useConversationsContext } from "@/components/providers/ConversationsProvider";
import type { ConversationListItem } from "@/hooks/useConversations";

// Pestañas por lo que el agente necesita hacer, no por el estado crudo
// (CODE-162). "Abierta" es lo normal y no tiene pestaña propia.
type Tab = "all" | "waiting" | "mine" | "resolved";
const TABS: Tab[] = ["all", "waiting", "mine", "resolved"];

interface ConversationListProps {
  activeId?: string;
}

export default function ConversationList({ activeId }: ConversationListProps) {
  const { user, loading: authLoading } = useAuth();
  // Datos compartidos con el sidebar (ConversationsProvider en el layout del dashboard).
  const { conversations, loading } = useConversationsContext();
  const t = useTranslations("dashboard.conversations");
  const [filter, setFilter] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const inTab = useMemo(() => {
    const me = user?.id;
    return {
      all: () => true,
      // Esperando agente = el bot pidio un humano y nadie la tomo.
      waiting: (c: ConversationListItem) => c.status === "pending" && !c.assignee,
      mine: (c: ConversationListItem) => c.status !== "resolved" && !!me && c.assignee?.id === me,
      resolved: (c: ConversationListItem) => c.status === "resolved",
    } satisfies Record<Tab, (c: ConversationListItem) => boolean>;
  }, [user?.id]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (!inTab[filter](c)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (c.contactName?.toLowerCase().includes(q) ?? false) ||
          c.contactPhone.includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [conversations, filter, search, inTab]);

  const counts = useMemo(
    () =>
      Object.fromEntries(TABS.map((tab) => [tab, conversations.filter(inTab[tab]).length])) as Record<Tab, number>,
    [conversations, inTab]
  );

  const isLoading = authLoading || loading;

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="relative">
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
              filter === tab
                ? "bg-navy-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-navy-900"
            }`}
          >
            {t(`tabs.${tab}`)}
            {tab === "waiting" && counts.waiting > 0 && filter !== tab ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {counts.waiting}
              </span>
            ) : (
              <span className={`text-[10px] ${filter === tab ? "text-white/60" : "text-slate-400"}`}>
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">No conversations yet</p>
            <p className="text-xs text-slate-400 mt-0.5">When customers message your WhatsApp, they will show up here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">No conversations found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem key={conv.id} {...conv} currentUserId={user?.id} active={conv.id === activeId} unread={conv.unreadCount > 0} />
          ))
        )}
      </div>
    </div>
  );
}
