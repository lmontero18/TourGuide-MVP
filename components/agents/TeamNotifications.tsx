"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { NotifyScope, TeamMember } from "@/types";

interface TeamNotificationsProps {
  agents: TeamMember[];
  onChange: (id: string, prefs: { notify_scope?: NotifyScope; notify_sound?: boolean }) => Promise<{ ok: boolean }>;
}

// Avisos del equipo (CODE-195): el admin decide quien recibe los avisos de
// "cliente necesita atencion" y quien escucha el sonido. Lo asignado le llega
// a cada uno siempre.
export default function TeamNotifications({ agents, onChange }: TeamNotificationsProps) {
  const t = useTranslations("dashboard.agents.notifications");

  const update = async (id: string, prefs: { notify_scope?: NotifyScope; notify_sound?: boolean }) => {
    const res = await onChange(id, prefs);
    if (!res.ok) toast.error(t("error"));
  };

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-bold text-navy-900">{t("title")}</h2>
        <p className="mt-0.5 text-xs text-slate-400">{t("sub")}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {agents.map((a) => {
          const name = a.full_name?.trim() || a.email.split("@")[0];
          return (
            <div key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-medium text-navy-900">
                  {name}
                  {a.is_self && <span className="ml-1 text-xs font-normal text-slate-400">({t("you")})</span>}
                </p>
                <p className="truncate text-xs text-slate-400">{a.email}</p>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label={t("scopeLabel", { name })}>
                {(["all", "mine"] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    aria-pressed={a.notify_scope === scope}
                    onClick={() => a.notify_scope !== scope && update(a.id, { notify_scope: scope })}
                    className={`h-7 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                      a.notify_scope === scope ? "bg-navy-900 text-white" : "text-slate-500 hover:text-navy-900"
                    }`}
                  >
                    {t(`scope.${scope}`)}
                  </button>
                ))}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                <button
                  type="button"
                  role="switch"
                  aria-checked={a.notify_sound}
                  aria-label={t("soundLabel", { name })}
                  onClick={() => update(a.id, { notify_sound: !a.notify_sound })}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${a.notify_sound ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${a.notify_sound ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                {t("sound")}
              </label>
            </div>
          );
        })}
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-relaxed text-slate-400">{t("help")}</p>
    </div>
  );
}
