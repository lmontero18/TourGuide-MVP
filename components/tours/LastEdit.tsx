"use client";

import { useLocale, useTranslations } from "next-intl";
import type { KnowledgeEdit } from "@/types";
import { timeAgo } from "@/components/leads/leadMeta";

// "Última modificación: Tatiana · hace 2 h". Sin registro no muestra nada
// (lo modificado antes de que existiera esta marca).
export default function LastEdit({ edit, className = "" }: { edit: KnowledgeEdit | null | undefined; className?: string }) {
  const t = useTranslations("dashboard.tours");
  const locale = useLocale();
  if (!edit?.by) return null;
  const date = new Date(edit.at);
  return (
    <p className={`text-xs text-slate-400 ${className}`} title={date.toLocaleString(locale)}>
      {t("lastEdit", { by: edit.by, when: timeAgo(edit.at, locale) })}
    </p>
  );
}
