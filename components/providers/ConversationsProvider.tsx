"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, type ConversationEvents, type ConversationListItem } from "@/hooks/useConversations";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useMyNotifyPrefs } from "@/hooks/useMyNotifyPrefs";
import { useDeliveryFailures } from "@/hooks/useDeliveryFailures";
import { deliveryReason } from "@/lib/whatsapp/deliveryReasons";
import { isLastFocusedTab, markTabFocused, playChime, showDesktopNotification, type ChimeKind } from "@/lib/notifications/alert";

// Despues de "volvio a escribir" llega el mensaje del cliente: no avisar dos
// veces por lo mismo.
const RETURNED_QUIET_MS = 15_000;

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
  const { orgId: authOrgId, user, role } = useAuth();
  // El owner (dueño) no atiende conversaciones: no se cargan ni avisan.
  const orgId = role === "owner" ? null : authOrgId;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("dashboard.notifications");
  const tD = useTranslations("dashboard.chat.delivery");
  const prefs = useNotificationPrefs();
  // Lo que decidio el admin (CODE-195): si recibe los avisos generales.
  const teamPrefs = useMyNotifyPrefs();
  const match = pathname.match(/^\/conversations\/([^/]+)/);
  const activeId = match ? match[1] : null;

  // Avisos (CODE-175). Pestaña visible -> toast; en segundo plano ->
  // notificacion del sistema. Nunca de la conversacion que ya estas mirando.
  // El sonido solo en la ultima pestaña usada (varias pestañas = un sonido).
  const deliver = (item: ConversationListItem, title: string, body: string, kind: ChimeKind = "message", force = false) => {
    const visible = document.visibilityState === "visible";
    if (visible && item.id === activeId && !force) return;
    const open = () => router.push(`/conversations/${item.id}`);
    if (visible) {
      toast(title, { description: body, action: { label: t("open"), onClick: open } });
    } else if (prefs.desktop) {
      showDesktopNotification({ title, body, tag: `conversation:${item.id}`, onClick: open });
    }
    if (prefs.sound && isLastFocusedTab()) playChime(kind);
  };

  const nameOf = (item: ConversationListItem) => item.contactName || item.contactPhone;
  const returnedAt = useRef<Record<string, number>>({});
  const me = user?.id ?? null;

  const events: ConversationEvents = {
    // Todo el equipo: alguien tiene que tomarla. Menos a quien el admin dejo
    // en "solo los suyos".
    onHandoff: (item) => teamPrefs.scope === "all" && deliver(item, t("handoffTitle", { name: nameOf(item) }), item.lastMessage || t("handoffBody"), "urgent"),
    // Solo quien la atiende. Si recien volvio (onReturned), ese aviso ya
    // cubre el mensaje.
    onCustomerMessage: (item, content) => {
      if (!me || item.assignee?.id !== me || item.status === "resolved") return;
      if (Date.now() - (returnedAt.current[item.id] ?? 0) < RETURNED_QUIET_MS) return;
      deliver(item, t("messageTitle", { name: nameOf(item) }), content);
    },
    // La habia resuelto, el cliente volvio a escribir y sigue conmigo: el bot
    // no le contesta, asi que el aviso es urgente.
    onReturned: (item) => {
      if (!me || item.assignee?.id !== me) return;
      returnedAt.current[item.id] = Date.now();
      deliver(item, t("returnedTitle", { name: nameOf(item) }), t("returnedBody"), "urgent");
    },
    // "Otro agente tomo tu conversacion": para no escribirle dos personas al mismo cliente.
    onAssigneeChanged: (previous, item) => {
      if (!me) return;
      // Me la asignaron (CODE-187). Si me la asigne yo, estoy mirando esa
      // conversacion y deliver() no avisa.
      if (item.assignee?.id === me && previous?.id !== me) {
        deliver(item, t("assignedTitle", { name: nameOf(item) }), item.lastMessage || t("assignedBody"), "urgent");
        return;
      }
      if (previous?.id !== me || !item.assignee || item.assignee.id === me) return;
      deliver(item, t("takenTitle", { agent: item.assignee.name }), t("takenBody", { name: nameOf(item) }));
    },
  };

  const { conversations, loading, unreadTotal } = useConversations(orgId, activeId, events);

  // Meta no entrego un mensaje (ej. plantilla sin metodo de pago): avisar a
  // quien atiende la conversacion, aunque la este mirando (la burbuja cambia
  // pero el aviso es lo que se nota). Si nadie la tiene asignada, a todos.
  useDeliveryFailures(orgId, (failure) => {
    const item = conversations.find((c) => c.id === failure.conversationId);
    if (!item) return;
    if (item.assignee && item.assignee.id !== me) return;
    const reason = deliveryReason(failure.errorCode);
    deliver(item, t("failedTitle", { name: nameOf(item) }), tD(`titles.${reason}`), "urgent", true);
  });

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
