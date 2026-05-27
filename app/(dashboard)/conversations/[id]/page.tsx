"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import ConversationList from "@/components/conversations/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/client";

interface ConversationDetail {
  id: string;
  bot_active: boolean;
  contact: { name: string | null; phone: string } | null;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("conversations")
        .select("id, bot_active, contact:contacts(name, phone)")
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Failed to load conversation");
        setLoading(false);
        return;
      }
      setConv(data as unknown as ConversationDetail);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Conversations" />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block w-full max-w-md border-r border-slate-200 bg-white overflow-hidden">
          <ConversationList activeId={id} />
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Loading conversation...
            </div>
          ) : conv ? (
            <ChatWindow
              conversationId={conv.id}
              contactName={conv.contact?.name ?? null}
              contactPhone={conv.contact?.phone ?? ""}
              initialBotActive={conv.bot_active}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Conversation not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
