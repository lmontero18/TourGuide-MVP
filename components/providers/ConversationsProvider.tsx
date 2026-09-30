"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, type ConversationListItem } from "@/hooks/useConversations";

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
  const { orgId } = useAuth();
  const pathname = usePathname();
  const match = pathname.match(/^\/conversations\/([^/]+)/);
  const activeId = match ? match[1] : null;
  const { conversations, loading, unreadTotal } = useConversations(orgId, activeId);

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
