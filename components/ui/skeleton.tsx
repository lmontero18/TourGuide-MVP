import { cn } from "@/lib/utils"

// Bloque de carga con un brillo que recorre el bloque (keyframe
// `skeleton-shimmer` en app/globals.css). Con prefers-reduced-motion el brillo
// se oculta y queda un bloque estatico.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative isolate overflow-hidden rounded-md bg-slate-200/60",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent",
        "before:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] motion-reduce:before:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
