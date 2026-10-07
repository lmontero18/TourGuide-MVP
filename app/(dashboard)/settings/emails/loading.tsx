import SettingsShell from "@/components/settings/SettingsShell";
import { EmailPrefsSkeleton } from "@/components/settings/SettingsSkeleton";

export default function Loading() {
  return (
    <SettingsShell>
      <EmailPrefsSkeleton />
    </SettingsShell>
  );
}
