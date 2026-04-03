"use client";

interface TakeControlButtonProps {
  botActive: boolean;
  onToggle: () => void;
}

export default function TakeControlButton({ botActive, onToggle }: TakeControlButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all active:scale-[0.97] ${
        botActive
          ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
          : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
      }`}
    >
      {botActive ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.36 6.64A9 9 0 0 1 20.77 15" />
            <path d="M6.16 6.16a9 9 0 1 0 12.68 12.68" />
            <path d="M2 2l20 20" />
          </svg>
          Take control
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Return to bot
        </>
      )}
    </button>
  );
}
