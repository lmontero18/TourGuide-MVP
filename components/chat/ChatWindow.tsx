"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TakeControlButton from "./TakeControlButton";
import { ChatMessagesSkeleton } from "./ChatSkeleton";
import { useMessages } from "@/hooks/useMessages";
import type { MessageRole } from "@/types";

interface ChatWindowProps {
  conversationId: string;
  contactName: string | null;
  contactPhone: string;
  initialBotActive?: boolean;
}

interface OptimisticMessage {
  id: string;
  content: string;
  role: MessageRole;
  sentAt: number;
  status: "pending" | "failed";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWindow({
  conversationId,
  contactName,
  contactPhone,
  initialBotActive = true,
}: ChatWindowProps) {
  const router = useRouter();
  const { messages, loading } = useMessages(conversationId);
  const [botActive, setBotActive] = useState(initialBotActive);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<OptimisticMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    setBotActive(initialBotActive);
  }, [initialBotActive]);

  // Dedupe optimistic when realtime delivers the persisted message
  useEffect(() => {
    if (optimistic.length === 0) return;
    setOptimistic((prev) =>
      prev.filter((opt) => {
        if (opt.status === "failed") return true;
        return !messages.some(
          (m) =>
            m.role === opt.role &&
            m.content === opt.content &&
            Math.abs(new Date(m.created_at).getTime() - opt.sentAt) < 30_000
        );
      })
    );
    // intentionally exclude `optimistic` from deps to avoid feedback loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const combined = useMemo(() => {
    const real = messages.map((m) => ({
      key: m.id,
      content: m.content,
      role: m.role,
      createdAt: formatTime(m.created_at),
      sortAt: new Date(m.created_at).getTime(),
      mediaPath: m.media_url,
      pending: false,
      failed: false,
    }));
    const opt = optimistic.map((o) => ({
      key: o.id,
      content: o.content,
      role: o.role,
      createdAt: formatTime(new Date(o.sentAt).toISOString()),
      sortAt: o.sentAt,
      mediaPath: null as string | null,
      pending: o.status === "pending",
      failed: o.status === "failed",
    }));
    return [...real, ...opt].sort((a, b) => a.sortAt - b.sortAt);
  }, [messages, optimistic]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [combined.length]);

  const handleSend = async (content: string) => {
    const tempId = `opt-${crypto.randomUUID()}`;
    const sentAt = Date.now();
    setOptimistic((prev) => [
      ...prev,
      { id: tempId, content, role: "agent", sentAt, status: "pending" },
    ]);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to send message");
      // success: realtime will deliver the persisted message and dedupe removes the optimistic one
    } catch (err) {
      setOptimistic((prev) =>
        prev.map((o) => (o.id === tempId ? { ...o, status: "failed" } : o))
      );
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!confirm("Delete this conversation? This will remove all messages permanently.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to delete");
      toast.success("Conversation deleted");
      router.push("/conversations");
    } catch (err) {
      setDeleting(false);
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleToggleBot = async () => {
    if (toggling) return;
    const next = !botActive;
    setToggling(true);
    setBotActive(next);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_active: next }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to update");
      toast.success(next ? "Returned to bot" : "You are now in control");
    } catch (err) {
      setBotActive(!next);
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-navy-900/10 flex items-center justify-center">
            <span className="text-xs font-bold text-navy-700">
              {contactName ? contactName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "#"}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900">{contactName || contactPhone}</p>
            <p className="text-[10px] text-slate-400">{contactPhone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TakeControlButton botActive={botActive} onToggle={handleToggleBot} />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title="More options"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-navy-900"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <button
                  onClick={() => { setMenuOpen(false); handleDelete(); }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                  {deleting ? "Deleting..." : "Delete conversation"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bot status banner */}
      {botActive ? (
        <div className="flex items-center gap-2 bg-green-50 border-b border-green-100 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-700">Bot is handling this conversation</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-4 py-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
          <span className="text-xs font-medium text-amber-700">You are in control — bot is paused</span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {loading ? (
          <ChatMessagesSkeleton />
        ) : combined.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">No messages yet</div>
        ) : (
          combined.map((msg) => (
            <MessageBubble
              key={msg.key}
              content={msg.content}
              role={msg.role}
              createdAt={msg.createdAt}
              mediaPath={msg.mediaPath}
              pending={msg.pending}
              failed={msg.failed}
            />
          ))
        )}
      </div>

      {/* Input — only enabled when agent has control */}
      <ChatInput
        onSend={handleSend}
        disabled={botActive}
        placeholder={botActive ? "Take control to send a message..." : "Type a message..."}
      />
    </div>
  );
}
