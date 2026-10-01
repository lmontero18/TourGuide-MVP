"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, type ConversationEvents, type ConversationListItem } from "@/hooks/useConversations";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { isLastFocusedTab, markTabFocused, playChime, showDesktopNotification, type ChimeKind } from "@/lib/notifications/alert";

interface ConversationsState {
  conversations: ConversationListItem[];
  loading: boolean;
  unreadTotal: number;
  activeId: string | null;
}

const ConversationsContext = createContext<ConversationsState | null>(null);

const BASE_TITLE = "Tourfy";

// Datos de conversaciones a nivel dashboard: la lista y el badge del sidebar
// comparten una sola carga y una sola suscripcion de realtime, y la lista no
// se vuelve a pedir al ir de Metricas a Conversaciones.
export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { orgId, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("dashboard.notifications");
  const prefs = useNotificationPrefs();
  const match = pathname.match(/^\/conversations\/([^/]+)/);
  const activeId = match ? match[1] : null;

  // Avisos (CODE-175). Pestaña visible -> toast; en segundo plano ->
  // notificacion del sistema. Nunca de la conversacion que ya estas mirando.
  // El sonido solo en la ultima pestaña usada (varias pestañas = un sonido).
  const deliver = (item: ConversationListItem, title: string, body: string, kind: ChimeKind = "message") => {
    const visible = document.visibilityState === "visible";
    if (visible && item.id === activeId) return;
    const open = () => router.push(`/conversations/${item.id}`);
    if (visible) {
      toast(title, { description: body, action: { label: t("open"), onClick: open } });
    } else if (prefs.desktop) {
      showDesktopNotification({ title, body, tag: `conversation:${item.id}`, onClick: open });
    }
    if (prefs.sound && isLastFocusedTab()) playChime(kind);
  };

  const nameOf = (item: ConversationListItem) => item.contactName || item.contactPhone;
  const me = user?.id ?? null;

  const events: ConversationEvents = {
    // Todo el equipo: alguien tiene que tomarla.
    onHandoff: (item) => deliver(item, t("handoffTitle", { name: nameOf(item) }), item.lastMessage || t("handoffBody"), "urgent"),
    // Solo quien la atiende.
    onCustomerMessage: (item, content) => {
      if (!me || item.assignee?.id !== me || item.status === "resolved") return;
      deliver(item, t("messageTitle", { name: nameOf(item) }), content);
    },
    // "Otro agente tomo tu conversacion": para no escribirle dos personas al mismo cliente.
    onAssigneeChanged: (previous, item) => {
      if (!me || previous?.id !== me || !item.assignee || item.assignee.id === me) return;
      deliver(item, t("takenTitle", { agent: item.assignee.name }), t("takenBody", { name: nameOf(item) }));
    },
  };

  const { conversations, loading, unreadTotal } = useConversations(orgId, activeId, events);

  useEffect(() => {
    markTabFocused();
    const onFocus = () => markTabFocused();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // "(3) Tourfy" en la pestaña: se ve aunque el agente este en otra.
  useEffect(() => {
    document.title = unreadTotal > 0 ? `(${unreadTotal}) ${BASE_TITLE}` : BASE_TITLE;
  }, [unreadTotal]);

  return (
    <ConversationsContext.Provider value={{ conversations, loading, unreadTotal, activeId }}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext(): ConversationsState {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversationsContext must be used inside <ConversationsProvider>");
  return ctx;
}
