import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "./LoadingRegion";
import { SearchBoxSkeleton, TextLines } from "./primitives";

// Tarjetas por columna del embudo (nuevo → perdido), para que no se vea vacio.
const CARDS_PER_STAGE = [3, 2, 2, 1, 1];
const NAME_WIDTHS = ["w-28", "w-36", "w-24"];

function LeadCardSkeleton({ index }: { index: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex h-5 items-center">
        <Skeleton className={`h-3.5 ${NAME_WIDTHS[index % NAME_WIDTHS.length]}`} />
      </div>
      <div className="mt-0.5 flex h-4 items-center">
        <Skeleton className="h-2.5 w-32" />
      </div>
      <div className="flex h-4 items-center">
        <Skeleton className="h-2 w-20" />
      </div>
      <div className="mt-2 flex h-4 items-center justify-between gap-2">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-2.5 w-8" />
      </div>
    </div>
  );
}

/** Solo el embudo de 5 columnas (mismo grid que LeadBoard). */
export function LeadBoardSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(5,minmax(220px,1fr))] gap-3 overflow-x-auto pb-2">
      {CARDS_PER_STAGE.map((count, stage) => (
        <div key={stage} className="flex min-h-[320px] flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5">
          <div className="flex h-5 items-center justify-between px-1 pb-1">
            <span className="flex items-center gap-1.5">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </span>
            <Skeleton className="h-3 w-4" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <LeadCardSkeleton key={i} index={stage + i} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Contenido de /leads debajo del TopBar (dentro del area `p-5` con scroll). */
export default function LeadsSkeleton() {
  const t = useTranslations("dashboard.leads");
  return (
    <LoadingRegion label={t("loading")} className="space-y-5">
      <TextLines widths={["w-full", "w-2/5"]} className="max-w-2xl" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex h-4 items-center"><Skeleton className="h-2.5 w-24" /></div>
            <div className="mt-1 flex h-8 items-center"><Skeleton className="h-6 w-14" /></div>
            <div className="flex h-4 items-center"><Skeleton className="h-2 w-28" /></div>
          </div>
        ))}
      </div>

      <SearchBoxSkeleton className="max-w-md" />

      <LeadBoardSkeleton />
    </LoadingRegion>
  );
}
