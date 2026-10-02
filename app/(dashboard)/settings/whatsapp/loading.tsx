import { getTranslations } from "next-intl/server";
import PageLoadingShell from "@/components/skeletons/PageLoadingShell";
import WhatsAppSettingsSkeleton from "@/components/skeletons/WhatsAppSettingsSkeleton";

export default async function Loading() {
  const t = await getTranslations("dashboard.settings.whatsapp");
  return (
    <PageLoadingShell title={t("title")}>
      <WhatsAppSettingsSkeleton />
    </PageLoadingShell>
  );
}
