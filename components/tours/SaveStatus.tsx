"use client";

import { useTranslations } from "next-intl";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

interface SaveStatusProps {
  state: SaveState;
  onRetry?: () => void;
}

// Estado del autoguardado de la base de conocimiento.
export default function SaveStatus({ state, onRetry }: SaveStatusProps) {
  const t = useTranslations("dashboard.tours");
  if (state === "idle") return null;
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600" role="status">
        {t("saveError")}
        {onRetry && (
          <button onClick={onRetry} className="underline hover:text-red-700">{t("retry")}</button>
        )}
      </span>
    );
  }
  const busy = state === "pending" || state === "saving";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${busy ? "text-slate-400" : "text-green-600"}`} role="status">
      {busy ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
      )}
      {busy ? t("saving") : t("saved")}
    </span>
  );
}
