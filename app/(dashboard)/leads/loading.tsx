import { getTranslations } from "next-intl/server";
import PageLoadingShell from "@/components/skeletons/PageLoadingShell";
import LeadsSkeleton from "@/components/skeletons/LeadsSkeleton";

export default async function Loading() {
  const t = await getTranslations("dashboard.leads");
  return (
    <PageLoadingShell title={t("title")}>
      <LeadsSkeleton />
    </PageLoadingShell>
  );
}
