import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Lineas de texto con la misma altura que `text-sm` (line-height 20px) para
// que el parrafo real no empuje lo de abajo al aparecer.
export function TextLines({
  widths,
  lineClassName = "h-5",
  barClassName = "h-3",
  className,
}: {
  widths: string[];
  lineClassName?: string;
  barClassName?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {widths.map((w, i) => (
        <div key={i} className={cn("flex items-center", lineClassName)}>
          <Skeleton className={cn(barClassName, w)} />
        </div>
      ))}
    </div>
  );
}

// Caja de busqueda (h-10, rounded-xl, borde) con el icono como bloque.
export function SearchBoxSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3", className)}>
      <Skeleton className="h-3.5 w-3.5 rounded-full" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
