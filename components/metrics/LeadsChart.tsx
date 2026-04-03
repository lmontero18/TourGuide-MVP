"use client";

const MOCK_DATA = [
  { label: "Mon", value: 12 },
  { label: "Tue", value: 19 },
  { label: "Wed", value: 8 },
  { label: "Thu", value: 24 },
  { label: "Fri", value: 31 },
  { label: "Sat", value: 18 },
  { label: "Sun", value: 6 },
];

export default function LeadsChart() {
  const max = Math.max(...MOCK_DATA.map((d) => d.value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-navy-900">Leads this week</h3>
          <p className="text-xs text-slate-400 mt-0.5">Conversations that became qualified leads</p>
        </div>
        <span className="text-xs font-medium text-slate-400">Last 7 days</span>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-2 h-40">
        {MOCK_DATA.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold text-navy-900">{d.value}</span>
            <div className="w-full rounded-t-md bg-slate-100 relative overflow-hidden" style={{ height: "100%" }}>
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-md bg-navy-900 transition-all duration-500"
                style={{ height: `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
