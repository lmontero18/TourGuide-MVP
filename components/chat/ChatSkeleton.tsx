import { Skeleton } from "@/components/ui/skeleton";

const BUBBLES: { side: "left" | "right"; width: string }[] = [
  { side: "left", width: "w-48" },
  { side: "right", width: "w-32" },
  { side: "left", width: "w-56" },
  { side: "left", width: "w-40" },
  { side: "right", width: "w-44" },
  { side: "left", width: "w-36" },
  { side: "right", width: "w-28" },
];

/** Bubble rows only — for the messages area of an already-rendered ChatWindow. */
export function ChatMessagesSkeleton() {
  return (
    <div aria-hidden>
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className={`flex ${b.side === "right" ? "justify-end" : "justify-start"} mb-2.5`}
        >
          <Skeleton className={`h-10 ${b.width} rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}

/** Full chat shell — header + messages + input — for whole-panel loading. */
export default function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 py-4">
        <ChatMessagesSkeleton />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 px-4 py-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
