"use client";

import { useTranslations } from "next-intl";

export default function TypingIndicator() {
  const t = useTranslations("dashboard.chat");
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-tl-md bg-blue-50 border border-blue-100 px-4 py-3">
        <span className="block text-[10px] font-bold text-blue-500 mb-1">{t("roleBot")}</span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
