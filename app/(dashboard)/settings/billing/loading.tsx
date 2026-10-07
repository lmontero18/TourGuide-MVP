import SettingsShell from "@/components/settings/SettingsShell";
import { BillingPortalSkeleton } from "@/components/settings/SettingsSkeleton";

export default function Loading() {
  return (
    <SettingsShell>
      <BillingPortalSkeleton />
    </SettingsShell>
  );
}
