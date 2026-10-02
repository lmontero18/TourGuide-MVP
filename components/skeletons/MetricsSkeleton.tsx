import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "./LoadingRegion";

// Alturas fijas de las barras (7 dias, periodo por defecto) — sin random para
// que server y cliente rendericen lo mismo.
const BAR_HEIGHTS = ["h-[45%]", "h-[70%]", "h-[35%]", "h-[85%]", "h-[55%]", "h-[25%]", "h-[60%]"];

function CardHeader({ title = "w-36", sub = "w-52", className = "mb-4" }: { title?: string; sub?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${title}`} /></div>
      <div className="mt-0.5 flex h-4 items-center"><Skeleton className={`h-2.5 ${sub}`} /></div>
    </div>
  );
}

function MetricCardSkeleton({ withNote }: { withNote: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="flex h-8 items-center"><Skeleton className="h-6 w-16" /></div>
      {withNote && <div className="mt-1 flex h-4 items-center"><Skeleton className="h-2.5 w-24" /></div>}
    </div>
  );
}

function BarRows({ rows, label, bar }: { rows: number; label: string; bar: string }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className={`h-2.5 ${label} shrink-0`} />
          <Skeleton className={`${bar} flex-1 rounded-full`} />
          <Skeleton className="h-2.5 w-6" />
        </div>
      ))}
    </>
  );
}

/** Contenido de /metrics debajo del TopBar (dentro del area `p-5` con scroll). */
export default function MetricsSkeleton() {
  return (
    <LoadingRegion className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[true, true, false, true, false, false].map((withNote, i) => (
          <MetricCardSkeleton key={i} withNote={withNote} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Actividad */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <CardHeader className="mb-6" />
          <div className="flex h-40 items-end gap-1.5">
            {BAR_HEIGHTS.map((h, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <Skeleton className={`w-full rounded-b-none rounded-t-md ${h}`} />
                <Skeleton className="h-2.5 w-6" />
              </div>
            ))}
          </div>
        </div>

        {/* Fuera de horario */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <CardHeader />
          <div className="mb-4 flex h-9 items-center gap-2">
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="mt-4 space-y-2">
            <BarRows rows={3} label="w-28" bar="h-2" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Uso del mes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <CardHeader />
          <div className="mb-3 flex h-9 items-center gap-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="mt-3 flex h-4 items-center"><Skeleton className="h-2 w-3/4" /></div>
        </div>

        {/* Mensajes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <CardHeader />
          <div className="space-y-3">
            <BarRows rows={3} label="w-20" bar="h-3" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}
