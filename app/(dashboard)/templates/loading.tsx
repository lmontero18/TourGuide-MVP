import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import PageLoadingShell from "@/components/skeletons/PageLoadingShell";
import TemplatesSkeleton from "@/components/skeletons/TemplatesSkeleton";

export default async function Loading() {
  const t = await getTranslations("dashboard.templates");
  return (
    <PageLoadingShell title={t("title")} actions={<Skeleton className="h-8 w-32 rounded-lg" />}>
      <TemplatesSkeleton />
    </PageLoadingShell>
  );
}
