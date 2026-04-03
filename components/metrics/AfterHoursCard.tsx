export default function AfterHoursCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-navy-900">After hours</h3>
          <p className="text-xs text-slate-400 mt-0.5">Conversations handled by bot outside business hours</p>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="font-display text-3xl font-extrabold tracking-tight text-navy-900">47</span>
        <span className="text-sm text-slate-500">conversations this week</span>
      </div>

      <div className="rounded-xl bg-green-50 border border-green-100 p-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
            <path d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-semibold text-green-800">
            $2,350 USD in potential revenue captured
          </span>
        </div>
        <p className="text-[10px] text-green-700/70 mt-1 ml-[22px]">
          Leads that would have been lost without the bot responding 24/7
        </p>
      </div>

      {/* Time breakdown */}
      <div className="mt-4 space-y-2">
        {[
          { time: "6pm — 10pm", count: 23, pct: 49 },
          { time: "10pm — 6am", count: 14, pct: 30 },
          { time: "Weekends", count: 10, pct: 21 },
        ].map((slot) => (
          <div key={slot.time} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-24 shrink-0">{slot.time}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-navy-900/70" style={{ width: `${slot.pct}%` }} />
            </div>
            <span className="text-xs font-medium text-navy-900 w-6 text-right">{slot.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
