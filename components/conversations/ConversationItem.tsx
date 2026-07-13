"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { ConversationStatus } from "@/types";

interface ConversationItemProps {
  id: string;
  contactName: string | null;
  contactPhone: string;
  lastMessage: string;
  lastMessageAt: string;
  status: ConversationStatus;
  botActive: boolean;
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
  unreadCount = 0,
  active,
}: ConversationItemProps) {
  const unread = unreadCount > 0;
  const displayName = contactName || contactPhone;
  const initials = contactName
    ? contactName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "#";

  return (
    <Link
      href={`/conversations/${id}`}
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
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] text-slate-400">{lastMessageAt}</span>
            {unread && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
        </div>
        <p className={`text-xs mt-0.5 truncate ${unread ? "text-navy-700 font-medium" : "text-slate-500"}`}>
          {lastMessage}
        </p>
        <div className="mt-1.5">
          <StatusBadge status={status} botActive={botActive} />
        </div>
      </div>
    </Link>
  );
}
