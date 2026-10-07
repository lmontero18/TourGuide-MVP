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

/** /settings/emails mientras carga: misma tarjeta que EmailPrefs. */
export function EmailPrefsSkeleton() {
  return (
    <LoadingRegion>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-16" /></div>
        <div className="mt-0.5 mb-4 flex h-4 items-center"><Skeleton className="h-2.5 w-44" /></div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-28" /></div>
            <div className="mt-1 space-y-1.5">
              <Skeleton className="h-2.5 w-full max-w-md" />
              <Skeleton className="h-2.5 w-2/3 max-w-xs" />
            </div>
          </div>
          <Skeleton className="mt-1 h-5 w-5 shrink-0 rounded" />
        </div>
        <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </section>
    </LoadingRegion>
  );
}

/** /settings/billing mientras carga: misma tarjeta que BillingPortal. */
export function BillingPortalSkeleton() {
  return (
    <LoadingRegion>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-36" /></div>
        <div className="mt-0.5 mb-4 flex h-4 items-center"><Skeleton className="h-2.5 w-72 max-w-full" /></div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {["w-32", "w-36", "w-40", "w-44"].map((w) => (
            <div key={w} className="flex h-5 items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className={`h-3 ${w}`} />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-56 rounded-xl" />
        <div className="mt-3 flex h-4 items-center"><Skeleton className="h-2.5 w-80 max-w-full" /></div>
      </section>
    </LoadingRegion>
  );
}
