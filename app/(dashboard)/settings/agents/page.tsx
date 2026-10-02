"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import TopBar from "@/components/layout/TopBar";
import AgentRow from "@/components/agents/AgentRow";
import { useAgents } from "@/hooks/useAgents";
import type { Role } from "@/types";
import { AgentRowsSkeleton } from "@/components/skeletons/AgentsSkeleton";

export default function AgentsPage() {
  const t = useTranslations("dashboard.agents");
  const { agents, error, invite, changeRole, remove, resend } = useAgents();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("agent");
  const [sending, setSending] = useState(false);

  function closeInvite() {
    setShowInvite(false);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("agent");
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const res = await invite(inviteEmail.trim(), inviteRole, inviteName.trim() || undefined);
    setSending(false);
    if (res.ok) {
      toast.success(t("inviteSent", { email: inviteEmail.trim() }));
      closeInvite();
    } else if (res.code === "already_in_team") {
      toast.error(t("errors.alreadyInTeam"));
    } else if (res.code === "email_taken") {
      toast.error(t("errors.emailTaken"));
    } else {
      toast.error(t("errors.invite"));
    }
  }

  const inputClass =
    "w-full h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all";

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
          {showInvite && (
            <form onSubmit={sendInvite} className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 mb-5">
              <h3 className="text-sm font-bold text-navy-900 mb-3">{t("inviteTitle")}</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="invite-email" className="block text-xs font-medium text-navy-900 mb-1.5">{t("email")}</label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="invite-name" className="block text-xs font-medium text-navy-900 mb-1.5">{t("name")}</label>
                  <input
                    id="invite-name"
                    type="text"
                    maxLength={100}
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <span className="block text-xs font-medium text-navy-900 mb-1.5">{t("role")}</span>
                  <div className="flex gap-2">
                    {(["agent", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
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
                  <p className="text-[10px] text-slate-400 mt-1.5">{t("roleHelp")}</p>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={closeInvite}
                    className="h-8 rounded-lg px-3 text-xs font-medium text-slate-500 hover:text-navy-900 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="h-8 rounded-lg bg-navy-900 px-4 text-xs font-bold text-white hover:bg-navy-800 transition-colors disabled:opacity-50"
                  >
                    {sending ? `${t("send")}...` : t("send")}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-navy-900">{t("teamTitle")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{agents ? t("teamCount", { count: agents.length }) : "\u00a0"}</p>
            </div>

            {error && <p className="px-5 py-4 text-xs text-red-600">{t("errors.load")}</p>}
            {!agents && !error && <AgentRowsSkeleton />}

            <div className="divide-y divide-slate-100">
              {agents?.map((agent) => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  onChangeRole={async (role) => {
                    const res = await changeRole(agent.id, role);
                    if (!res.ok) toast.error(t("errors.role"));
                  }}
                  onResend={async () => {
                    const res = await resend(agent.id);
                    if (res.ok) toast.success(t("resent", { email: agent.email }));
                    else toast.error(t("errors.resend"));
                  }}
                  onRemove={async () => {
                    const res = await remove(agent.id);
                    if (res.ok) toast.success(t("removed"));
                    else toast.error(t("errors.remove"));
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
