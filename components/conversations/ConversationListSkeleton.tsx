import { Skeleton } from "@/components/ui/skeleton";

const ROWS = ["w-28", "w-36", "w-24", "w-32", "w-40", "w-28", "w-36", "w-24"];

export default function ConversationListSkeleton() {
  return (
    <div aria-hidden>
      {ROWS.map((nameWidth, i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-4 py-3 border-b border-slate-100"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className={`h-3.5 ${nameWidth}`} />
              <Skeleton className="h-2.5 w-8" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
