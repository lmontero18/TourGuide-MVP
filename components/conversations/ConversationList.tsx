"use client";

import { useState } from "react";
import ConversationItem from "./ConversationItem";
import type { ConversationStatus } from "@/types";

const FILTERS: { label: string; value: ConversationStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
];

/* ─── Mock data ─── */
const MOCK_CONVERSATIONS = [
  {
    id: "conv-1",
    contactName: "Maria Garcia",
    contactPhone: "+52 55 8374 1234",
    lastMessage: "Perfecto, somos 6 personas para el tour del viernes",
    lastMessageAt: "2m ago",
    status: "open" as ConversationStatus,
    botActive: false,
    unread: true,
  },
  {
    id: "conv-2",
    contactName: "James Wilson",
    contactPhone: "+1 415 982 3344",
    lastMessage: "Do you have availability for Machu Picchu next week?",
    lastMessageAt: "8m ago",
    status: "open" as ConversationStatus,
    botActive: true,
    unread: true,
  },
  {
    id: "conv-3",
    contactName: null,
    contactPhone: "+57 301 456 7890",
    lastMessage: "Cuanto cuesta el tour al Valle Sagrado?",
    lastMessageAt: "23m ago",
    status: "open" as ConversationStatus,
    botActive: true,
    unread: false,
  },
  {
    id: "conv-4",
    contactName: "Sophie Laurent",
    contactPhone: "+33 6 12 34 56 78",
    lastMessage: "Thank you so much! We had an amazing time 🙏",
    lastMessageAt: "1h ago",
    status: "resolved" as ConversationStatus,
    botActive: false,
    unread: false,
  },
  {
    id: "conv-5",
    contactName: "Carlos Mendez",
    contactPhone: "+52 33 1987 4321",
    lastMessage: "Necesito hablar con alguien sobre un problema con la reserva",
    lastMessageAt: "2h ago",
    status: "pending" as ConversationStatus,
    botActive: false,
    unread: true,
  },
  {
    id: "conv-6",
    contactName: "Ana Torres",
    contactPhone: "+51 987 654 321",
    lastMessage: "Tienen tours para grupo de empresa? Somos 20 personas",
    lastMessageAt: "3h ago",
    status: "open" as ConversationStatus,
    botActive: true,
    unread: false,
  },
  {
    id: "conv-7",
    contactName: "David Kim",
    contactPhone: "+82 10 9876 5432",
    lastMessage: "I booked the Sacred Valley tour. What should I bring?",
    lastMessageAt: "5h ago",
    status: "resolved" as ConversationStatus,
    botActive: false,
    unread: false,
  },
];

interface ConversationListProps {
  activeId?: string;
}

export default function ConversationList({ activeId }: ConversationListProps) {
  const [filter, setFilter] = useState<ConversationStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = MOCK_CONVERSATIONS.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
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

  const counts = {
    all: MOCK_CONVERSATIONS.length,
    open: MOCK_CONVERSATIONS.filter((c) => c.status === "open").length,
    pending: MOCK_CONVERSATIONS.filter((c) => c.status === "pending").length,
    resolved: MOCK_CONVERSATIONS.filter((c) => c.status === "resolved").length,
  };

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
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-navy-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-navy-900"
            }`}
          >
            {f.label}
            <span className={`text-[10px] ${filter === f.value ? "text-white/60" : "text-slate-400"}`}>
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
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
            <ConversationItem key={conv.id} {...conv} active={conv.id === activeId} />
          ))
        )}
      </div>
    </div>
  );
}
