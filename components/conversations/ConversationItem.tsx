"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import AssigneeBadge from "./AssigneeBadge";
import type { Assignee, ConversationStatus } from "@/types";

interface ConversationItemProps {
  id: string;
  contactName: string | null;
  contactPhone: string;
  lastMessage: string;
  lastMessageAt: string;
  status: ConversationStatus;
  botActive: boolean;
  assignee: Assignee | null;
  currentUserId?: string | null;
  unread?: boolean;
  unreadCount?: number;
  active?: boolean;
}

export default function ConversationItem({
  id,
  contactName,
  contactPhone,
  lastMessage,
  lastMessageAt,
  status,
  botActive,
  assignee,
  currentUserId,
  unread,
  unreadCount = 0,
  active,
}: ConversationItemProps) {
  const displayName = contactName || contactPhone;
  const initials = contactName
    ? contactName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "#";

  return (
    // Sin prefetch: Next precargaria cada conversacion visible en cada
    // navegacion (50 en pantalla = 50 requests por click). El chat carga sus
    // datos en el cliente, el prefetch no aporta.
    <Link
      href={`/conversations/${id}`}
      prefetch={false}
      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50 ${
        active ? "bg-navy-900/[0.03]" : ""
      }`}
    >
      {/* Avatar */}
      <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
        unread ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-500"
      }`}>
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${unread ? "font-bold text-navy-900" : "font-medium text-navy-900"}`}>
            {displayName}
          </span>
          <span className={`shrink-0 text-[10px] ${unread ? "font-bold text-blue-600" : "text-slate-400"}`}>{lastMessageAt}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate ${unread ? "text-navy-700 font-medium" : "text-slate-500"}`}>
            {lastMessage}
          </p>
          {unreadCount > 0 && (
            <span className="shrink-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <StatusBadge status={status} botActive={botActive} />
          {!botActive && assignee && (
            <AssigneeBadge assignee={assignee} isSelf={assignee.id === currentUserId} />
          )}
        </div>
      </div>
    </Link>
  );
}
