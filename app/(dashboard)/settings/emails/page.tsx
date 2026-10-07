import SettingsShell from "@/components/settings/SettingsShell";
import EmailPrefs from "@/components/settings/EmailPrefs";

export default function EmailSettingsPage() {
  return (
    <SettingsShell>
      <EmailPrefs />
    </SettingsShell>
  );
}
