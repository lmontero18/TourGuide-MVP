"use client";

import { useTranslations } from "next-intl";

// Panel derecho sin conversacion seleccionada. La lista y el TopBar viven en
// conversations/layout.tsx.
export default function ConversationsPage() {
  const t = useTranslations("dashboard.conversations");
  return (
    <div className="flex h-full items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 className="font-display text-lg font-bold text-navy-900">{t("empty.title")}</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">{t("empty.sub")}</p>
      </div>
    </div>
  );
}
