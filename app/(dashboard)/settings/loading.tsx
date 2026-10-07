import SettingsShell from "@/components/settings/SettingsShell";
import SettingsSkeleton from "@/components/settings/SettingsSkeleton";

export default function Loading() {
  return (
    <SettingsShell>
      <SettingsSkeleton />
    </SettingsShell>
  );
}
