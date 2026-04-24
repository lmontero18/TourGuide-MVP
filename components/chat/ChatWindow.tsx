"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TakeControlButton from "./TakeControlButton";
import TypingIndicator from "./TypingIndicator";
import type { MessageRole } from "@/types";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

interface ChatWindowProps {
  conversationId: string;
  contactName: string;
  contactPhone: string;
  initialBotActive?: boolean;
  initialMessages?: Message[];
}

export default function ChatWindow({
  contactName,
  contactPhone,
  initialBotActive = true,
  initialMessages = [],
}: ChatWindowProps) {
  const t = useTranslations("dashboard.chat");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [botActive, setBotActive] = useState(initialBotActive);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = (content: string) => {
    const newMsg: Message = {
      id: crypto.randomUUID(),
      role: "agent",
      content,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleToggleBot = () => {
    setBotActive((prev) => !prev);
    if (botActive) {
      // Taking control — simulate typing stop
      setTyping(false);
    }
  };

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
        <TakeControlButton botActive={botActive} onToggle={handleToggleBot} />
      </div>

      {/* Bot status banner */}
      {botActive && (
        <div className="flex items-center gap-2 bg-green-50 border-b border-green-100 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-700">{t("botBanner")}</span>
        </div>
      )}
      {!botActive && (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-4 py-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
          <span className="text-xs font-medium text-amber-700">{t("agentBanner")}</span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} content={msg.content} role={msg.role} createdAt={msg.createdAt} />
        ))}
        {typing && <TypingIndicator />}
      </div>

      {/* Input — only enabled when agent has control */}
      <ChatInput
        onSend={handleSend}
        disabled={botActive}
        placeholder={botActive ? t("takeControlPlaceholder") : t("typePlaceholder")}
      />
    </div>
  );
}
