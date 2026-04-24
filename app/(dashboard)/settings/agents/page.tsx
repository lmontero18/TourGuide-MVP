"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import TopBar from "@/components/layout/TopBar";

const MOCK_AGENTS = [
  { id: "1", name: "Luis Montero", email: "luis@cuscoexpeditions.com", role: "admin" as const, active: true },
  { id: "2", name: "Ana Martinez", email: "ana@cuscoexpeditions.com", role: "agent" as const, active: true },
  { id: "3", name: "Carlos Rios", email: "carlos@cuscoexpeditions.com", role: "agent" as const, active: true },
  { id: "4", name: "Sofia Paredes", email: "sofia@cuscoexpeditions.com", role: "agent" as const, active: false },
];

export default function AgentsPage() {
  const t = useTranslations("dashboard.agents");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent">("agent");

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t("title")}>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-navy-900 px-3 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          {t("invite")}
        </button>
      </TopBar>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl">
          {/* Invite modal */}
          {showInvite && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 mb-5">
              <h3 className="text-sm font-bold text-navy-900 mb-3">{t("inviteTitle")}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("email")}</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-900 mb-1.5">{t("role")}</label>
                  <div className="flex gap-2">
                    {(["agent", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setInviteRole(r)}
                        className={`flex-1 h-9 rounded-lg border text-xs font-medium capitalize transition-all ${
                          inviteRole === r
                            ? "border-navy-900 bg-navy-900/5 text-navy-900 ring-2 ring-navy-900/10"
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {t(r)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {t("roleHelp")}
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => { setShowInvite(false); setInviteEmail(""); }}
                    className="h-8 rounded-lg px-3 text-xs font-medium text-slate-500 hover:text-navy-900 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button className="h-8 rounded-lg bg-navy-900 px-4 text-xs font-bold text-white hover:bg-navy-800 transition-colors">
                    {t("send")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agents list */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-navy-900">{t("teamTitle")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t("teamCount", { count: MOCK_AGENTS.length })}</p>
            </div>

            <div className="divide-y divide-slate-100">
              {MOCK_AGENTS.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${
                      agent.active ? "bg-navy-900/10 text-navy-700" : "bg-slate-100 text-slate-400"
                    }`}>
                      {agent.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${agent.active ? "text-navy-900" : "text-slate-400"}`}>
                          {agent.name}
                        </span>
                        {!agent.active && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{t("inactive")}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{agent.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-wider ${
                      agent.role === "admin"
                        ? "bg-navy-900/5 text-navy-700 border-navy-900/10"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}>
                      {t(agent.role)}
                    </span>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
