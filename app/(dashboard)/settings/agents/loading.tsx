import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import PageLoadingShell from "@/components/skeletons/PageLoadingShell";
import AgentsSkeleton from "@/components/skeletons/AgentsSkeleton";

export default async function Loading() {
  const t = await getTranslations("dashboard.agents");
  return (
    <PageLoadingShell title={t("title")} actions={<Skeleton className="h-8 w-24 rounded-lg" />}>
      <AgentsSkeleton />
    </PageLoadingShell>
  );
}
