"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatSkeleton from "@/components/chat/ChatSkeleton";
import ConversationLeadButton from "@/components/leads/ConversationLeadButton";
import ConversationLeadPanel from "@/components/leads/ConversationLeadPanel";
import { toAssignee } from "@/lib/assignee";
import { hasFeature } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import { useConversationDetail } from "@/hooks/useConversationDetail";
import { useConversationLead } from "@/hooks/useLeads";

export default function ConversationDetailPage() {
  const params = useParams();
  const t = useTranslations("dashboard.chat");
  const id = params.id as string;
  const { data: conv, isPending, isError } = useConversationDetail(id);
  const conversationLead = useConversationLead(id);
  const { featureFlags } = useAuth();
  const showPanel = hasFeature(featureFlags, "leadPanel");

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
    <div className="flex h-full">
      <div className="min-w-0 flex-1">
        <ChatWindow
          key={conv.id}
          conversationId={conv.id}
          contactName={conv.contact?.name ?? null}
          contactPhone={conv.contact?.phone ?? ""}
          initialBotActive={conv.bot_active}
          initialStatus={conv.status}
          initialAssignee={toAssignee(conv.assigned_agent)}
          leadButton={<ConversationLeadButton {...conversationLead} className={showPanel ? "xl:hidden" : ""} />}
        />
      </div>
      {showPanel && (
        <ConversationLeadPanel
          key={conv.id}
          {...conversationLead}
          contactName={conv.contact?.name ?? null}
          contactPhone={conv.contact?.phone ?? ""}
        />
      )}
    </div>
  );
}
