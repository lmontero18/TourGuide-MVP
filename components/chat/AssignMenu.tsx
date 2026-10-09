"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import type { Assignee } from "@/types";

interface AssignMenuProps {
  conversationId: string;
  assignee: Assignee | null;
  onAssigned: () => void;
}

// "Asignar a…" en el chat (CODE-187): admins asignan cualquier conversación;
// un agente, la suya o una sin asignar. El asignado recibe aviso en la app y
// por correo.
export default function AssignMenu({ conversationId, assignee, onAssigned }: AssignMenuProps) {
  const t = useTranslations("dashboard.chat.assign");
  const { user, role } = useAuth();
  const { data: members } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const canAssign = role === "admin" || !assignee || assignee.id === user?.id;

  const assign = async (target: string | null, name?: string) => {
    setOpen(false);
    if (target === (assignee?.id ?? null)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assign_to: target }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? t("error"));
      toast.success(target ? t("assigned", { name: target === user?.id ? t("you") : (name ?? "") }) : t("unassigned"));
      onAssigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!canAssign || saving}
        title={canAssign ? t("title") : t("onlyHolder", { name: assignee?.name ?? "" })}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 max-w-[160px] items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 md:px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
        <span className="hidden truncate sm:inline">{assignee ? (assignee.id === user?.id ? t("you") : assignee.name) : t("title")}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("title")}</p>
          {(members ?? []).map((m) => {
            const current = m.id === assignee?.id;
            return (
              <button
                key={m.id}
                role="menuitem"
                onClick={() => void assign(m.id, m.name)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 ${current ? "font-bold text-navy-900" : "text-slate-700"}`}
              >
                <span className="truncate">
                  {m.name}
                  {m.id === user?.id && <span className="text-slate-400"> · {t("you")}</span>}
                </span>
                {current && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
          {assignee && (
            <button
              role="menuitem"
              onClick={() => void assign(null)}
              className="mt-1 w-full border-t border-slate-100 px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
            >
              {t("none")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
