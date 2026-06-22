import { Skeleton } from "@/components/ui/skeleton";

function FieldSkeleton({ width = "w-full" }: { width?: string }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className={`h-10 ${width} rounded-xl`} />
    </div>
  );
}

function SectionSkeleton({ fields }: { fields: number }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export default function SettingsSkeleton() {
  return (
    <div className="max-w-2xl space-y-6" aria-hidden>
      <SectionSkeleton fields={2} />
      <SectionSkeleton fields={3} />
      <SectionSkeleton fields={2} />
    </div>
  );
}
