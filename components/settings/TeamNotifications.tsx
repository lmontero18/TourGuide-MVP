"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { NotifyScope, TeamMember } from "@/types";

interface TeamNotificationsProps {
  agents: TeamMember[];
  onChange: (id: string, prefs: { notify_scope?: NotifyScope }) => Promise<{ ok: boolean }>;
}

// Avisos del equipo (CODE-195): el admin decide quien recibe los avisos
// generales (traspaso del bot, cliente sin respuesta). notify_scope 'all' =
// prendido, 'mine' = apagado. Lo asignado y lo que cada uno atiende le llega
// siempre; el sonido es personal (campana).
export default function TeamNotifications({ agents, onChange }: TeamNotificationsProps) {
  const t = useTranslations("dashboard.agents.notifications");
  const nobodyOn = agents.length > 0 && agents.every((a) => a.notify_scope !== "all");

  const toggle = async (a: TeamMember) => {
    const res = await onChange(a.id, { notify_scope: a.notify_scope === "all" ? "mine" : "all" });
    if (!res.ok) toast.error(t("error"));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-end justify-between gap-4 border-b border-slate-100 px-5 py-3">
        <div>
          <h2 className="text-sm font-bold text-navy-900">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{t("sub")}</p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("column")}</span>
      </div>

      {nobodyOn && (
        <p role="alert" className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs leading-relaxed text-amber-800">
          {t("nobody")}
        </p>
      )}

      <div className="divide-y divide-slate-100">
        {agents.map((a) => {
          const name = a.full_name?.trim() || a.email.split("@")[0];
          const on = a.notify_scope === "all";
          return (
            <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy-900">
                  {name}
                  {a.is_self && <span className="ml-1 text-xs font-normal text-slate-400">({t("you")})</span>}
                </p>
                <p className="truncate text-xs text-slate-400">{a.email}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={t("toggleLabel", { name })}
                onClick={() => toggle(a)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>
          );
        })}
      </div>

      <p className="border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">{t("help")}</p>
    </section>
  );
}
