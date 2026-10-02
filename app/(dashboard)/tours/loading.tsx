import { getTranslations } from "next-intl/server";
import PageLoadingShell from "@/components/skeletons/PageLoadingShell";
import ToursSkeleton from "@/components/tours/ToursSkeleton";

export default async function Loading() {
  const t = await getTranslations("dashboard.tours");
  return (
    <PageLoadingShell title={t("title")}>
      <ToursSkeleton />
    </PageLoadingShell>
  );
}
