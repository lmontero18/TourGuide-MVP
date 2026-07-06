"use client";

import type { MessageRole } from "@/types";
import { useChatMediaUrl } from "@/hooks/useChatMediaUrl";

interface MessageBubbleProps {
  content: string;
  role: MessageRole;
  createdAt: string;
  mediaPath?: string | null;
  pending?: boolean;
  failed?: boolean;
}

const ROLE_STYLES: Record<MessageRole, { wrapper: string; bubble: string; label: string }> = {
  user: {
    wrapper: "justify-start",
    bubble: "bg-white border border-slate-200 text-navy-900 rounded-tl-md shadow-sm",
    label: "Client",
  },
  assistant: {
    wrapper: "justify-start",
    bubble: "bg-blue-50 border border-blue-100 text-navy-900 rounded-tl-md",
    label: "Tourfy Bot",
  },
  agent: {
    wrapper: "justify-end",
    bubble: "bg-navy-900 text-white rounded-tr-md shadow-md",
    label: "You",
  },
};

export default function MessageBubble({ content, role, createdAt, mediaPath, pending, failed }: MessageBubbleProps) {
  const style = ROLE_STYLES[role];
  const mediaUrl = useChatMediaUrl(mediaPath);
  const isMediaPlaceholder = /^\[[a-z_]+\]$/.test(content);

  return (
    <div className={`flex ${style.wrapper}`}>
      <div className={`rounded-2xl px-3.5 py-2.5 max-w-[75%] ${style.bubble} ${pending ? "opacity-70" : ""} ${failed ? "ring-2 ring-red-400" : ""}`}>
        {role !== "agent" && (
          <span className={`block text-[10px] font-bold mb-0.5 ${
            role === "assistant" ? "text-blue-500" : "text-slate-400"
          }`}>
            {style.label}
          </span>
        )}
        {mediaUrl && (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL efímera, no optimizable por next/image */}
            <img
              src={mediaUrl}
              alt="Imagen enviada por el cliente"
              className="max-h-64 rounded-lg object-cover"
              loading="lazy"
            />
          </a>
        )}
        {!(mediaUrl && isMediaPlaceholder) && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        )}
        <span className={`flex items-center gap-1 text-[10px] mt-1 ${
          role === "agent" ? "text-white/50" : "text-slate-400"
        }`}>
          {createdAt}
          {pending && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          )}
          {failed && <span className="text-red-300">Failed</span>}
        </span>
      </div>
    </div>
  );
}
