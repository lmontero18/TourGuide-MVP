import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "@/components/skeletons/LoadingRegion";
import { SearchBoxSkeleton, TextLines } from "@/components/skeletons/primitives";

// Mismo grid que ToursTable: nombre+info | tipo | precio | chevron.
const GRID = "grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_20px] gap-4";

const ROWS: { name: string; info: string; type: string | null }[] = [
  { name: "w-44", info: "w-4/5", type: "w-16" },
  { name: "w-36", info: "w-3/5", type: "w-20" },
  { name: "w-52", info: "w-2/3", type: "w-14" },
  { name: "w-32", info: "w-1/2", type: null },
  { name: "w-40", info: "w-3/4", type: "w-16" },
  { name: "w-28", info: "w-2/5", type: "w-20" },
];

/** Contenido de "Lo que sabe tu bot" (pestañas + tabla de tours) mientras carga. */
export default function ToursSkeleton() {
  return (
    <LoadingRegion className="mx-auto max-w-5xl space-y-5">
      <TextLines widths={["w-full", "w-1/3"]} className="max-w-2xl" />

      {/* Pestañas subrayadas con contador */}
      <div className="flex gap-6 border-b border-slate-200">
        {["w-12", "w-20", "w-24"].map((w, i) => (
          <div key={i} className={`-mb-px flex items-center gap-2 border-b-2 pb-2.5 ${i === 0 ? "border-slate-300" : "border-transparent"}`}>
            <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${w}`} /></div>
            <Skeleton className="h-4 w-5 rounded-full" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {/* Toolbar: buscar + categorias + agregar */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchBoxSkeleton className="min-w-[220px] flex-1" />
          <div className="flex gap-1.5">
            {["w-12", "w-16", "w-14"].map((w, i) => (
              <Skeleton key={i} className={`h-[30px] ${w} rounded-full`} />
            ))}
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className={`${GRID} border-b border-slate-100 bg-slate-50/70 px-4 py-2.5`}>
            <div className="flex h-4 items-center"><Skeleton className="h-2.5 w-10" /></div>
            <div className="hidden h-4 items-center md:flex"><Skeleton className="h-2.5 w-10" /></div>
            <div className="flex h-4 items-center"><Skeleton className="h-2.5 w-12" /></div>
            <span className="hidden md:block" />
          </div>
          {ROWS.map((row, i) => (
            <div key={i} className={`${GRID} items-center border-t border-slate-100 px-4 py-3.5 first:border-t-0`}>
              <div className="min-w-0">
                <div className="flex h-6 items-center"><Skeleton className={`h-4 ${row.name} max-w-full`} /></div>
                <div className="mt-0.5 flex h-[19px] items-center"><Skeleton className={`h-3 ${row.info}`} /></div>
              </div>
              <div className="hidden md:block">
                {row.type && <Skeleton className={`h-5 ${row.type} rounded-full`} />}
              </div>
              <div>
                <div className="flex h-6 items-center"><Skeleton className="h-4 w-16" /></div>
                <div className="flex h-4 items-center"><Skeleton className="h-2.5 w-12" /></div>
              </div>
              <span className="hidden md:block" />
            </div>
          ))}
        </div>
        <div className="flex h-4 items-center"><Skeleton className="h-2.5 w-64" /></div>
      </div>
    </LoadingRegion>
  );
}
