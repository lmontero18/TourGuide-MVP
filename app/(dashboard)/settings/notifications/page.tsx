"use client";

import { useTranslations } from "next-intl";
import SettingsShell from "@/components/settings/SettingsShell";
import TeamNotifications from "@/components/settings/TeamNotifications";
import { AgentRowsSkeleton } from "@/components/skeletons/AgentsSkeleton";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/hooks/useAuth";
import { hasFeature } from "@/lib/features";

// Avisos del equipo (CODE-195). Detras del flag 'notifications': sin el flag
// la pestaña no aparece y la ruta queda vacia.
export default function NotificationSettingsPage() {
  const t = useTranslations("dashboard.agents");
  const { featureFlags } = useAuth();
  const { agents, error, setNotifications } = useAgents();

  if (!hasFeature(featureFlags, "notifications")) return <SettingsShell>{null}</SettingsShell>;

  return (
    <SettingsShell>
      {agents ? (
        <TeamNotifications agents={agents} onChange={setNotifications} />
      ) : error ? (
        <p className="text-sm text-red-600">{t("errors.load")}</p>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <AgentRowsSkeleton />
        </section>
      )}
    </SettingsShell>
  );
}
