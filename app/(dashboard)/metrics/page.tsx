"use client";

import TopBar from "@/components/layout/TopBar";
import MetricCard from "@/components/metrics/MetricCard";
import LeadsChart from "@/components/metrics/LeadsChart";
import AfterHoursCard from "@/components/metrics/AfterHoursCard";

export default function MetricsPage() {
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Metrics">
        <select className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-navy-900 outline-none">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </TopBar>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Top metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total conversations"
            value="284"
            change="12%"
            positive
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
          />
          <MetricCard
            label="Qualified leads"
            value="118"
            change="23%"
            positive
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></svg>}
          />
          <MetricCard
            label="Conversion rate"
            value="41.5%"
            change="3.2%"
            positive
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>}
          />
          <MetricCard
            label="Revenue captured"
            value="$8,420"
            change="18%"
            positive
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeadsChart />
          <AfterHoursCard />
        </div>

        {/* Leads funnel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Lead funnel</h3>
          <div className="space-y-3">
            {[
              { label: "New", count: 284, pct: 100, color: "bg-blue-500" },
              { label: "Contacted", count: 196, pct: 69, color: "bg-blue-400" },
              { label: "Qualified", count: 118, pct: 42, color: "bg-navy-900" },
              { label: "Converted", count: 47, pct: 17, color: "bg-green-500" },
              { label: "Lost", count: 23, pct: 8, color: "bg-slate-300" },
            ].map((stage) => (
              <div key={stage.label} className="flex items-center gap-4">
                <span className="text-xs font-medium text-slate-500 w-20 shrink-0">{stage.label}</span>
                <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${stage.color} transition-all duration-700`} style={{ width: `${stage.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-navy-900 w-8 text-right">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
