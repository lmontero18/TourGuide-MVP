"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Role, TeamMember } from "@/types";

interface AgentRowProps {
  agent: TeamMember;
  onChangeRole: (role: Role) => Promise<void>;
  onResend: () => Promise<void>;
  onRemove: () => Promise<void>;
}

function initials(agent: TeamMember): string {
  const source = agent.full_name?.trim() || agent.email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function AgentRow({ agent, onChangeRole, onResend, onRemove }: AgentRowProps) {
  const t = useTranslations("dashboard.agents");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = agent.status === "pending";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMenuOpen(false);
    try {
      await action();
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  }

  return (
    <div className={`px-5 py-3.5 ${busy ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
              pending ? "bg-slate-100 text-slate-400" : "bg-navy-900/10 text-navy-700"
            }`}
          >
            {initials(agent)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium truncate ${pending ? "text-slate-500" : "text-navy-900"}`}>
                {agent.full_name || agent.email}
              </span>
              {agent.is_self && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">{t("you")}</span>
              )}
              {pending && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">{t("pending")}</span>
              )}
            </div>
            {agent.full_name && <span className="text-xs text-slate-400 truncate block">{agent.email}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-wider ${
              agent.role === "admin"
                ? "bg-navy-900/5 text-navy-700 border-navy-900/10"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            {t(agent.role)}
          </span>

          {!agent.is_self && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                disabled={busy}
                aria-label={t("actions")}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-10 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => run(() => onChangeRole(agent.role === "admin" ? "agent" : "admin"))}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-navy-900 hover:bg-slate-50"
                  >
                    {agent.role === "admin" ? t("makeAgent") : t("makeAdmin")}
                  </button>
                  {pending && (
                    <button
                      onClick={() => run(onResend)}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-navy-900 hover:bg-slate-50"
                    >
                      {t("resend")}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmRemove(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    {t("remove")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmRemove && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-800">{t("removeConfirm")}</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmRemove(false)}
              className="h-7 rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:text-navy-900"
            >
              {t("cancel")}
            </button>
            <button
              onClick={() => run(onRemove)}
              className="h-7 rounded-lg bg-red-600 px-2.5 text-xs font-bold text-white hover:bg-red-700"
            >
              {t("removeYes")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
