"use client";

import { useTranslations } from "next-intl";
import { initialsOf, shortName } from "@/lib/assignee";
import type { Assignee } from "@/types";

interface AssigneeBadgeProps {
  assignee: Assignee;
  isSelf: boolean;
}

// Quien atiende la conversacion cuando el bot esta pausado.
export default function AssigneeBadge({ assignee, isSelf }: AssigneeBadgeProps) {
  const t = useTranslations("dashboard.conversations.status");
  return (
    <span
      title={assignee.name}
      className={`inline-flex h-5 max-w-[140px] items-center gap-1 rounded-full border pl-0.5 pr-2 text-[10px] font-bold ${
        isSelf ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-indigo-50 border-indigo-200 text-indigo-700"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] ${
          isSelf ? "bg-amber-200 text-amber-900" : "bg-indigo-200 text-indigo-900"
        }`}
      >
        {initialsOf(assignee.name)}
      </span>
      <span className="truncate">{isSelf ? t("you") : shortName(assignee.name)}</span>
    </span>
  );
}
