"use client";

interface TopBarProps {
  title: string;
  children?: React.ReactNode;
}

export default function TopBar({ title, children }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
      <h1 className="font-display text-lg font-bold tracking-tight text-navy-900">
        {title}
      </h1>
      <div className="flex items-center gap-3">
        {children}
        {/* User avatar */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-navy-900/10 flex items-center justify-center">
            <span className="text-xs font-bold text-navy-700">LM</span>
          </div>
        </div>
      </div>
    </header>
  );
}
