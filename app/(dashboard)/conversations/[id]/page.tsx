"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatSkeleton from "@/components/chat/ChatSkeleton";
import { createClient } from "@/lib/supabase/client";
import { ASSIGNED_AGENT_EMBED, toAssignee } from "@/lib/assignee";
import type { ConversationStatus } from "@/types";

interface ConversationDetail {
  id: string;
  bot_active: boolean;
  status: ConversationStatus;
  contact: { name: string | null; phone: string } | null;
  assigned_agent: { id: string; full_name: string | null; email: string } | null;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clicks rapidos entre conversaciones: una respuesta vieja que llega tarde
    // no debe pisar a la actual.
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(`id, bot_active, status, contact:contacts(name, phone), ${ASSIGNED_AGENT_EMBED}`)
        .eq("id", id)
        .single();
      if (cancelled) return;

      if (error) {
        toast.error("Failed to load conversation");
        setConv(null);
        setLoading(false);
        return;
      }
      setConv(data as unknown as ConversationDetail);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // La lista y el TopBar viven en conversations/layout.tsx: aca solo el chat.
  // La pagina no se re-monta al cambiar de conversacion: mientras llega la
  // nueva, `conv` todavia es la anterior. Id distinto = cargando.
  if (loading || (conv && conv.id !== id)) return <ChatSkeleton />;
  if (!conv) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Conversation not found
      </div>
    );
  }
  return (
    <ChatWindow
      key={conv.id}
      conversationId={conv.id}
      contactName={conv.contact?.name ?? null}
      contactPhone={conv.contact?.phone ?? ""}
      initialBotActive={conv.bot_active}
      initialStatus={conv.status}
      initialAssignee={toAssignee(conv.assigned_agent)}
    />
  );
}
