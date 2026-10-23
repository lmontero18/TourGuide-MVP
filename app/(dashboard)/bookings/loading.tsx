import { getTranslations } from "next-intl/server";
import PageLoadingShell from "@/components/skeletons/PageLoadingShell";
import BookingsSkeleton from "@/components/skeletons/BookingsSkeleton";

export default async function Loading() {
  const t = await getTranslations("dashboard.bookings");
  return (
    <PageLoadingShell title={t("title")}>
      <BookingsSkeleton />
    </PageLoadingShell>
  );
}
