"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatSkeleton from "@/components/chat/ChatSkeleton";
import { createClient } from "@/lib/supabase/client";
import { ASSIGNED_AGENT_EMBED, toAssignee } from "@/lib/assignee";
import type { ConversationStatus } from "@/types";
import { readCache, writeCache } from "@/lib/clientCache";

interface ConversationDetail {
  id: string;
  bot_active: boolean;
  status: ConversationStatus;
  contact: { name: string | null; phone: string } | null;
  assigned_agent: { id: string; full_name: string | null; email: string } | null;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const t = useTranslations("dashboard.chat");
  const id = params.id as string;
  const [conv, setConv] = useState<ConversationDetail | null>(() => readCache<ConversationDetail>(`conv:${id}`) ?? null);
  const [loading, setLoading] = useState(() => !readCache<ConversationDetail>(`conv:${id}`));

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
        .is("deleted_at", null)
        .single();
      if (cancelled) return;

      if (error) {
        toast.error(t("errors.load"));
        setConv(null);
        setLoading(false);
        return;
      }
      writeCache(`conv:${id}`, data);
      setConv(data as unknown as ConversationDetail);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  // La lista y el TopBar viven en conversations/layout.tsx: aca solo el chat.
  // La pagina no se re-monta al cambiar de conversacion: mientras llega la
  // nueva, `conv` todavia es la anterior. Id distinto = cargando.
  // Si esta conversacion ya se abrio antes, se muestra al instante desde la
  // cache mientras llega la version fresca.
  const current = conv && conv.id === id ? conv : readCache<ConversationDetail>(`conv:${id}`) ?? null;
  if (!current && (loading || (conv && conv.id !== id))) return <ChatSkeleton />;
  if (!current) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        {t("notFound")}
      </div>
    );
  }
  return (
    <ChatWindow
      key={current.id}
      conversationId={current.id}
      contactName={current.contact?.name ?? null}
      contactPhone={current.contact?.phone ?? ""}
      initialBotActive={current.bot_active}
      initialStatus={current.status}
      initialAssignee={toAssignee(current.assigned_agent)}
    />
  );
}
