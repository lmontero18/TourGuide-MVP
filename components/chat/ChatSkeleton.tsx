import { Skeleton } from "@/components/ui/skeleton";
import LoadingRegion from "@/components/skeletons/LoadingRegion";

// Conversacion tipica: el cliente pregunta, el bot responde (izquierda), el
// agente escribe (derecha). Lineas por burbuja = alto parecido al real.
const BUBBLES: { side: "left" | "right"; lines: string[] }[] = [
  { side: "left", lines: ["w-44"] },
  { side: "left", lines: ["w-64", "w-40"] },
  { side: "left", lines: ["w-36"] },
  { side: "right", lines: ["w-48", "w-28"] },
  { side: "left", lines: ["w-56"] },
  { side: "right", lines: ["w-32"] },
];

function Bubbles() {
  return (
    <div className="space-y-2.5">
      {BUBBLES.map((b, i) => {
        const right = b.side === "right";
        return (
          <div key={i} className={`flex ${right ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                right ? "rounded-tr-md bg-navy-900/10" : "rounded-tl-md border border-slate-200 bg-white shadow-sm"
              }`}
            >
              {b.lines.map((w, j) => (
                <div key={j} className="flex h-[22px] items-center">
                  <Skeleton className={`h-3 ${w} max-w-full ${right ? "bg-navy-900/10" : ""}`} />
                </div>
              ))}
              <div className={`mt-1 flex h-[15px] items-center ${right ? "justify-end" : ""}`}>
                <Skeleton className={`h-2 w-8 ${right ? "bg-navy-900/10" : ""}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Solo las burbujas — para el area de mensajes de un ChatWindow ya montado. */
export function ChatMessagesSkeleton() {
  return (
    <LoadingRegion>
      <Bubbles />
    </LoadingRegion>
  );
}

/** Panel de chat completo — cabecera + banner + mensajes + input. */
export default function ChatSkeleton() {
  return (
    <LoadingRegion className="flex h-full flex-col bg-slate-50">
      {/* Cabecera: contacto + Tomar control / Resolver / Ficha / menu */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div>
            <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-32" /></div>
            <div className="flex h-[15px] items-center"><Skeleton className="h-2 w-20" /></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="hidden h-8 w-24 rounded-lg sm:block" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Banner de estado del bot */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <Skeleton className="h-2 w-2 rounded-full" />
        <div className="flex h-4 items-center"><Skeleton className="h-2.5 w-48" /></div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-hidden px-4 py-4">
        <Bubbles />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
        <div className="flex h-[42px] flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      </div>
    </LoadingRegion>
  );
}
