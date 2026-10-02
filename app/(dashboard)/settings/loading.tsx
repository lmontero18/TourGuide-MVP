import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import PageLoadingShell from "@/components/skeletons/PageLoadingShell";
import SettingsSkeleton from "@/components/settings/SettingsSkeleton";

export default async function Loading() {
  const t = await getTranslations("dashboard.settings");
  return (
    <PageLoadingShell title={t("title")} actions={<Skeleton className="h-8 w-[104px] rounded-lg" />}>
      <SettingsSkeleton />
    </PageLoadingShell>
  );
}
