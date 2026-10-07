import SettingsShell from "@/components/settings/SettingsShell";
import WhatsAppSettingsSkeleton from "@/components/skeletons/WhatsAppSettingsSkeleton";

export default function Loading() {
  return (
    <SettingsShell>
      <WhatsAppSettingsSkeleton />
    </SettingsShell>
  );
}
