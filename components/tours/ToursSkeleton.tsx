import { Skeleton } from "@/components/ui/skeleton";

const RAIL_ROWS = ["w-32", "w-24", "w-36", "w-28", "w-20"];

export default function ToursSkeleton() {
  return (
    <div className="max-w-3xl space-y-5" aria-hidden>
      {/* Import card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="space-y-2 py-0.5">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-2.5 w-64" />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-28 rounded-xl" />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 flex-1 rounded-xl" />
        ))}
      </div>

      {/* Split workspace: rail + detail */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[clamp(440px,calc(100vh-22rem),680px)] lg:flex-row">
        {/* Rail */}
        <div className="flex shrink-0 flex-col border-b border-slate-100 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <div className="flex gap-1.5 overflow-hidden p-2 lg:flex-col lg:gap-0.5">
            {RAIL_ROWS.map((w, i) => (
              <div key={i} className="w-48 shrink-0 space-y-1.5 rounded-xl px-3 py-2.5 lg:w-full">
                <Skeleton className={`h-3.5 ${w}`} />
                <Skeleton className="h-2.5 w-40" />
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 space-y-5 p-5 lg:p-6">
          <div className="flex items-center justify-end">
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
