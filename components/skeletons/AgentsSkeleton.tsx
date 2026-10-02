import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "./LoadingRegion";

const ROWS = [
  { name: "w-32", email: "w-44", role: "w-14" },
  { name: "w-28", email: "w-40", role: "w-16" },
  { name: "w-36", email: "w-48", role: "w-16" },
];

/** Solo las filas de agentes (mismo padding que AgentRow). */
export function AgentRowsSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {ROWS.map((row, i) => (
        <div key={i} className="px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0">
                <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${row.name}`} /></div>
                <div className="flex h-4 items-center"><Skeleton className={`h-2.5 ${row.email}`} /></div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Skeleton className={`h-6 ${row.role} rounded-full`} />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Contenido de /settings/agents debajo del TopBar (dentro del area `p-5`). */
export default function AgentsSkeleton() {
  const t = useTranslations("dashboard.agents");
  return (
    <LoadingRegion label={t("loading")} className="max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-36" /></div>
          <div className="mt-0.5 flex h-4 items-center"><Skeleton className="h-2.5 w-20" /></div>
        </div>
        <AgentRowsSkeleton />
      </div>
    </LoadingRegion>
  );
}
