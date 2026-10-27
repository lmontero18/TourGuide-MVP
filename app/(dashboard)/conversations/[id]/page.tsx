"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatSkeleton from "@/components/chat/ChatSkeleton";
import ChatInsight from "@/components/chat/ChatInsight";
import ConversationLeadButton from "@/components/leads/ConversationLeadButton";
import ConversationLeadPanel from "@/components/leads/ConversationLeadPanel";
import { toAssignee } from "@/lib/assignee";
import { hasFeature, isPreviewUser } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import { useConversationDetail } from "@/hooks/useConversationDetail";
import { useConversationLead } from "@/hooks/useLeads";
import { useConversationsContext } from "@/components/providers/ConversationsProvider";
import { cleanText } from "@/lib/leads/emptyValue";

export default function ConversationDetailPage() {
  const params = useParams();
  const t = useTranslations("dashboard.chat");
  const id = params.id as string;
  const { data: conv, isPending, isError } = useConversationDetail(id);
  const conversationLead = useConversationLead(id);
  const { user, featureFlags } = useAuth();
  const showPanel = hasFeature(featureFlags, "leadPanel");
  // Prueba del diseno nuevo de la bandeja: solo usuarios preview.
  const preview = isPreviewUser(user?.id);
  const { conversations } = useConversationsContext();
  const item = conversations.find((c) => c.id === id);

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
  const contactPhone = conv.contact?.phone ?? "";
  const tour = cleanText(conversationLead.lead?.tour_interest);
  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1">
        <ChatWindow
          key={conv.id}
          conversationId={conv.id}
          contactName={conv.contact?.name ?? null}
          contactPhone={contactPhone}
          initialBotActive={conv.bot_active}
          initialStatus={conv.status}
          initialAssignee={toAssignee(conv.assigned_agent)}
          leadButton={<ConversationLeadButton {...conversationLead} className={showPanel ? "xl:hidden" : ""} />}
          subtitle={preview && tour ? `${tour} · ${contactPhone}` : undefined}
          insight={
            preview ? (
              <ChatInsight key={conv.id} lead={conversationLead.lead} item={item} contactName={conv.contact?.name ?? null} />
            ) : undefined
          }
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
