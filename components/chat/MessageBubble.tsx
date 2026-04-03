import type { MessageRole } from "@/types";

interface MessageBubbleProps {
  content: string;
  role: MessageRole;
  createdAt: string;
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
    label: "TourGuide Bot",
  },
  agent: {
    wrapper: "justify-end",
    bubble: "bg-navy-900 text-white rounded-tr-md shadow-md",
    label: "You",
  },
};

export default function MessageBubble({ content, role, createdAt }: MessageBubbleProps) {
  const style = ROLE_STYLES[role];

  return (
    <div className={`flex ${style.wrapper}`}>
      <div className={`rounded-2xl px-3.5 py-2.5 max-w-[75%] ${style.bubble}`}>
        {role !== "agent" && (
          <span className={`block text-[10px] font-bold mb-0.5 ${
            role === "assistant" ? "text-blue-500" : "text-slate-400"
          }`}>
            {style.label}
          </span>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        <span className={`block text-[10px] mt-1 ${
          role === "agent" ? "text-white/50" : "text-slate-400"
        }`}>
          {createdAt}
        </span>
      </div>
    </div>
  );
}
