import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import PageLoadingShell from "@/components/skeletons/PageLoadingShell";
import MetricsSkeleton from "@/components/skeletons/MetricsSkeleton";

export default async function Loading() {
  const t = await getTranslations("dashboard.metrics");
  return (
    <PageLoadingShell
      title={t("title")}
      actions={
        <>
          {/* Selector de periodo + Exportar */}
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </>
      }
    >
      <MetricsSkeleton />
    </PageLoadingShell>
  );
}
