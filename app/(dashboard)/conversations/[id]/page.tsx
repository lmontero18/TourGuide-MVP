"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatSkeleton from "@/components/chat/ChatSkeleton";
import { toAssignee } from "@/lib/assignee";
import { useConversationDetail } from "@/hooks/useConversationDetail";

export default function ConversationDetailPage() {
  const params = useParams();
  const t = useTranslations("dashboard.chat");
  const id = params.id as string;
  const { data: conv, isPending, isError } = useConversationDetail(id);

  // La lista y el TopBar viven en conversations/layout.tsx: aca solo el chat.
  // Una conversacion ya abierta sale de la cache de TanStack Query al instante.
  if (isPending) return <ChatSkeleton />;
  if (isError || !conv) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        {t("notFound")}
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
