"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TakeControlButton from "./TakeControlButton";
import TemplatePicker from "./TemplatePicker";
import { ChatMessagesSkeleton } from "./ChatSkeleton";
import { useMessages } from "@/hooks/useMessages";
import { useConversationControl } from "@/hooks/useConversationControl";
import { useAuth } from "@/hooks/useAuth";
import type { Assignee, ConversationStatus, MessageRole } from "@/types";

interface ChatWindowProps {
  conversationId: string;
  contactName: string | null;
  contactPhone: string;
  initialBotActive?: boolean;
  initialAssignee?: Assignee | null;
  initialStatus?: ConversationStatus;
}

interface OptimisticMessage {
  id: string;
  content: string;
  role: MessageRole;
  sentAt: number;
  status: "pending" | "failed";
}

const WINDOW_MS = 24 * 60 * 60 * 1000;
// Desde cuando avisar que la ventana esta por cerrarse.
const WINDOW_WARN_MS = 2 * 60 * 60 * 1000;

function splitLeft(ms: number) {
  const min = Math.max(1, Math.round(ms / 60_000));
  return { h: Math.floor(min / 60), m: min % 60 };
}

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWindow({
  conversationId,
  contactName,
  contactPhone,
  initialBotActive = true,
  initialAssignee = null,
  initialStatus = "open",
}: ChatWindowProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.chat");
  const locale = useLocale();
  const { user } = useAuth();
  const { messages, loading } = useMessages(conversationId);
  const { botActive, assignee, status, setState: setControl, refresh: refreshControl } = useConversationControl(
    conversationId,
    { botActive: initialBotActive, assignee: initialAssignee, status: initialStatus }
  );
  // Nombre del agente que la tiene, si NO soy yo. Mientras carga el usuario
  // (user null) no se asume nada: evita mostrar "otro agente" a uno mismo.
  const heldByOther = !botActive && !!assignee && !!user && assignee.id !== user.id;
  const [confirmTakeover, setConfirmTakeover] = useState<string | null>(null);
  const [pickingTemplate, setPickingTemplate] = useState(false);
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
      createdAt: formatTime(m.created_at, locale),
      sortAt: new Date(m.created_at).getTime(),
      mediaPath: m.media_url,
      pending: false,
      failed: false,
    }));
    const opt = optimistic.map((o) => ({
      key: o.id,
      content: o.content,
      role: o.role,
      createdAt: formatTime(new Date(o.sentAt).toISOString(), locale),
      sortAt: o.sentAt,
      mediaPath: null as string | null,
      pending: o.status === "pending",
      failed: o.status === "failed",
    }));
    return [...real, ...opt].sort((a, b) => a.sortAt - b.sortAt);
  }, [messages, optimistic, locale]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [combined.length]);

  // Ventana de 24h de WhatsApp (CODE-176): texto libre solo hasta 24h despues
  // del ultimo mensaje del cliente. El reloj se actualiza cada minuto.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const lastClient = messages.findLast((m) => m.role === "user");
  const lastClientAt = lastClient ? new Date(lastClient.created_at).getTime() : null;
  const windowLeftMs = lastClientAt === null ? 0 : lastClientAt + WINDOW_MS - now;
  const windowClosed = !loading && windowLeftMs <= 0;
  const windowClosing = !windowClosed && windowLeftMs < WINDOW_WARN_MS;

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
      if (res.status === 409 && result.code === "window_closed") throw new Error(t("windowClosedToast"));
      if (!res.ok) throw new Error(result.error ?? t("errors.send"));
      // success: realtime will deliver the persisted message and dedupe removes the optimistic one
    } catch (err) {
      setOptimistic((prev) =>
        prev.map((o) => (o.id === tempId ? { ...o, status: "failed" } : o))
      );
      toast.error(err instanceof Error ? err.message : t("errors.send"));
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!confirm(t("deleteConfirm"))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? t("errors.delete"));
      toast.success(t("deleted"));
      router.push("/conversations");
    } catch (err) {
      setDeleting(false);
      toast.error(err instanceof Error ? err.message : t("errors.delete"));
    }
  };

  // Tomar control / devolver al bot. Sin `force`, si otro agente la tiene la
  // API responde 409 y se pide confirmacion antes de quitarsela.
  const setBotActiveRemote = async (next: boolean, force = false) => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_active: next, force }),
      });
      const result = await res.json();
      if (res.status === 409 && result.code === "taken") {
        setConfirmTakeover(result.holder ?? t("anotherAgent"));
        await refreshControl();
        return;
      }
      if (!res.ok) throw new Error(result.error ?? t("errors.update"));
      setControl({
        botActive: next,
        status: "open",
        assignee: next || !user ? null : { id: user.id, name: t("you") },
      });
      setConfirmTakeover(null);
      await refreshControl();
      toast.success(next ? t("returnedToBot") : t("nowInControl"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.update"));
    } finally {
      setToggling(false);
    }
  };

  // Ciclo de vida (CODE-162): resolver deja el bot activo y sin agente; si el
  // cliente vuelve a escribir, el webhook reabre la conversacion.
  const setStatusRemote = async (next: "resolved" | "open") => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? t("errors.update"));
      await refreshControl();
      toast.success(next === "resolved" ? t("resolvedToast") : t("reopenedToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.update"));
    } finally {
      setToggling(false);
    }
  };

  const handleToggleBot = () => {
    if (heldByOther && assignee) {
      setConfirmTakeover(assignee.name);
      return;
    }
    // Esperando agente (bot pausado, sin dueño): el boton toma la
    // conversacion en vez de devolverla al bot.
    if (!botActive && !assignee) {
      setBotActiveRemote(false);
      return;
    }
    setBotActiveRemote(!botActive);
  };

  const banner =
    status === "resolved"
      ? { tone: "slate", text: t("resolvedBanner") }
      : status === "pending" && !assignee
        ? { tone: "red", text: t("pendingBanner") }
        : botActive
          ? { tone: "green", text: t("botBanner") }
          : heldByOther && assignee
            ? { tone: "indigo", text: t("otherAgentBanner", { name: assignee.name }) }
            : { tone: "amber", text: t("agentBanner") };

  const BANNER_STYLES: Record<string, { bar: string; dot: string; text: string }> = {
    green: { bar: "bg-green-50 border-green-100", dot: "bg-green-500", text: "text-green-700" },
    indigo: { bar: "bg-indigo-50 border-indigo-100", dot: "bg-indigo-500", text: "text-indigo-700" },
    amber: { bar: "bg-amber-50 border-amber-100", dot: "bg-amber-500", text: "text-amber-700" },
    red: { bar: "bg-red-50 border-red-100", dot: "bg-red-500", text: "text-red-700" },
    slate: { bar: "bg-slate-100 border-slate-200", dot: "bg-slate-400", text: "text-slate-600" },
  };
  const bannerStyle = BANNER_STYLES[banner.tone];

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
          {status === "resolved" ? (
            <button
              onClick={() => setStatusRemote("open")}
              disabled={toggling}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {t("reopen")}
            </button>
          ) : (
            <>
              <TakeControlButton botActive={botActive} heldByOther={heldByOther} unassigned={!assignee} onToggle={handleToggleBot} />
              <button
                onClick={() => setStatusRemote("resolved")}
                disabled={toggling}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {t("resolve")}
              </button>
            </>
          )}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title={t("moreOptions")}
              aria-label={t("moreOptions")}
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
                  {deleting ? t("deleting") : t("deleteConversation")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estado: resuelta / esperando agente / bot / yo / otro agente */}
      <div className={`flex items-center gap-2 border-b px-4 py-2 ${bannerStyle.bar}`}>
        {banner.tone === "green" ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        ) : (
          <span className={`h-2 w-2 rounded-full ${bannerStyle.dot}`} />
        )}
        <span className={`text-xs font-medium ${bannerStyle.text}`}>{banner.text}</span>
      </div>

      {confirmTakeover && (
        <div className="flex items-center justify-between gap-3 border-b border-indigo-100 bg-white px-4 py-2.5">
          <p className="text-xs text-navy-900">{t("takeOverConfirm", { name: confirmTakeover })}</p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setConfirmTakeover(null)}
              className="h-7 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:text-navy-900"
            >
              {t("cancel")}
            </button>
            <button
              onClick={() => setBotActiveRemote(false, true)}
              disabled={toggling}
              className="h-7 rounded-lg bg-indigo-600 px-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {t("takeOverYes")}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {loading ? (
          <ChatMessagesSkeleton />
        ) : combined.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">{t("noMessages")}</div>
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
      {windowClosed && pickingTemplate ? (
        <TemplatePicker conversationId={conversationId} contactName={contactName} onClose={() => setPickingTemplate(false)} />
      ) : windowClosed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <span>
            <strong className="font-semibold">{t("windowClosedTitle")}</strong> {t("windowClosedTemplateBody")}
          </span>
          {!heldByOther && (
            <button
              onClick={() => setPickingTemplate(true)}
              className="shrink-0 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
            >
              {t("sendTemplate")}
            </button>
          )}
        </div>
      ) : windowClosing && !botActive && !heldByOther ? (
        <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-2 text-xs text-amber-700">
          {t("windowClosing", { left: t("timeLeft", splitLeft(windowLeftMs)) })}
        </div>
      ) : null}

      {!(windowClosed && pickingTemplate) && (
        <ChatInput
          onSend={handleSend}
          disabled={botActive || heldByOther || windowClosed}
          placeholder={
            windowClosed
              ? t("windowClosedPlaceholder")
              : botActive
              ? t("takeControlPlaceholder")
              : heldByOther && assignee
                ? t("heldByOtherPlaceholder", { name: assignee.name })
                : t("typePlaceholder")
          }
        />
      )}
    </div>
  );
}
