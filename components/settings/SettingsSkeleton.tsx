import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "@/components/skeletons/LoadingRegion";

function FieldSkeleton({ label = "w-24" }: { label?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex h-4 items-center"><Skeleton className={`h-2.5 ${label}`} /></div>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

function SectionTitle({ width, withSub }: { width: string; withSub?: boolean }) {
  return (
    <>
      <div className={`flex h-5 items-center ${withSub ? "mb-1" : "mb-4"}`}><Skeleton className={`h-3.5 ${width}`} /></div>
      {withSub && <div className="mb-4 flex h-4 items-center"><Skeleton className="h-2.5 w-64" /></div>}
    </>
  );
}

function HoursGroup({ withToggle }: { withToggle?: boolean }) {
  return (
    <div>
      <div className="mb-2 flex h-4 items-center justify-between">
        <Skeleton className="h-2.5 w-28" />
        {withToggle && <Skeleton className="h-2.5 w-32" />}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldSkeleton label="w-12" />
        <FieldSkeleton label="w-12" />
      </div>
    </div>
  );
}

/** Contenido de /settings (organizacion + horario) mientras carga. */
export default function SettingsSkeleton() {
  return (
    <LoadingRegion className="max-w-2xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <SectionTitle width="w-28" />
        <div className="space-y-4">
          <FieldSkeleton label="w-32" />
          <FieldSkeleton label="w-24" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <SectionTitle width="w-36" withSub />
        <div className="space-y-5">
          <HoursGroup />
          <HoursGroup withToggle />
        </div>
      </section>

      <div className="flex justify-end pb-8">
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </LoadingRegion>
  );
}
