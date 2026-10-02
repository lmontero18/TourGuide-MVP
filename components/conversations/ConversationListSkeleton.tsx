import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "@/components/skeletons/LoadingRegion";

const ROWS = [
  { name: "w-28", preview: "w-48", badge: "w-16" },
  { name: "w-36", preview: "w-40", badge: "w-20" },
  { name: "w-24", preview: "w-52", badge: "w-16" },
  { name: "w-32", preview: "w-36", badge: "w-14" },
  { name: "w-40", preview: "w-44", badge: "w-20" },
  { name: "w-28", preview: "w-48", badge: "w-16" },
  { name: "w-36", preview: "w-32", badge: "w-14" },
  { name: "w-24", preview: "w-40", badge: "w-20" },
];

/** Filas de la bandeja (mismo alto que ConversationItem). */
export default function ConversationListSkeleton() {
  return (
    <LoadingRegion>
      {ROWS.map((row, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="flex h-5 items-center justify-between gap-2">
              <Skeleton className={`h-3.5 ${row.name}`} />
              <Skeleton className="h-2 w-8" />
            </div>
            <div className="mt-0.5 flex h-4 items-center">
              <Skeleton className={`h-2.5 ${row.preview} max-w-full`} />
            </div>
            <div className="mt-1.5">
              <Skeleton className={`h-5 ${row.badge} rounded-full`} />
            </div>
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}
