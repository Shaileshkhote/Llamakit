"use client";

import { useMemo, useState } from "react";
import { ChainBreakdown } from "@/components/dashboard/ChainBreakdown";
import { EconomicsTable } from "@/components/dashboard/EconomicsTable";
import { Methodology } from "@/components/dashboard/Methodology";
import { MetricChart } from "@/components/dashboard/MetricChart";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { YieldTable } from "@/components/dashboard/YieldTable";
import { formatUsd } from "@/lib/format";
import type { DashboardData } from "@/types/metrics";
import type { Tenant } from "@/types/tenant";

type WorkspaceView = "summary" | "performance" | "economics" | "yields" | "methodology";

const views: Array<{ id: WorkspaceView; label: string; description: string }> = [
  { id: "summary", label: "Summary", description: "Headline metrics and current activity" },
  { id: "performance", label: "Performance", description: "Compare multiple verified metrics" },
  { id: "economics", label: "Economics", description: "Fees, revenue, and chain distribution" },
  { id: "yields", label: "Yields", description: "Optional pool opportunities" },
  { id: "methodology", label: "Methodology", description: "Sources and freshness" },
];

const cardClass = "min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)]";
const eyebrowClass = "text-[13px] font-semibold text-[var(--muted)]";
const dashboardGridClass = "grid grid-cols-12 gap-3.5 max-[760px]:grid-cols-1";
const stackClass = "grid gap-3.5";

export function DashboardWorkspace({ tenant, data }: { tenant: Tenant; data: DashboardData }) {
  const [view, setView] = useState<WorkspaceView>("summary");
  const availableViews = views.filter((item) => {
    if (item.id === "yields") return tenant.enabledModules.yields && data.yieldPools.length > 0;
    if (item.id === "methodology") return tenant.enabledModules.methodology;
    if (item.id === "performance") return tenant.enabledModules.performance;
    if (item.id === "economics")
      return tenant.enabledModules.chains || tenant.enabledModules.economics;
    return true;
  });

  const summaryItems = useMemo(
    () => [
      { label: "TVL", value: formatUsd(data.metrics.tvl?.current) },
      { label: "30d volume", value: formatUsd(data.metrics.dexVolume?.total30d) },
      { label: "30d fees", value: formatUsd(data.metrics.fees?.total30d) },
    ],
    [data.metrics.dexVolume?.total30d, data.metrics.fees?.total30d, data.metrics.tvl?.current],
  );

  return (
    <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-3.5 max-[760px]:grid-cols-1">
      <aside className="sticky top-4 grid gap-3.5 self-start max-[760px]:static">
        <div className={`${cardClass} p-[18px]`}>
          <p className={`${eyebrowClass} m-0`}>Data room</p>
          <div className="mt-4 grid gap-0.5">
            {availableViews.map((item) => (
              <button
                className={[
                  "grid gap-1 border-0 border-l-2 border-l-transparent bg-transparent py-[11px] pl-3 pr-2.5 text-left text-[var(--muted)]",
                  view === item.id
                    ? "border-l-[var(--text)] bg-[var(--surface-muted)] text-[var(--text)]"
                    : "hover:border-l-[var(--text)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
                ].join(" ")}
                key={item.id}
                onClick={() => setView(item.id)}
                type="button"
              >
                <strong className="text-sm leading-[1.25] text-inherit">{item.label}</strong>
                <span className="text-xs leading-[1.35] text-[var(--muted)]">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className={`${cardClass} grid gap-3 p-[18px]`}>
          <p className={`${eyebrowClass} m-0`}>Snapshot</p>
          {summaryItems.map((item) => (
            <div className="grid gap-1" key={item.label}>
              <span className="text-xs text-[var(--muted)]">{item.label}</span>
              <strong className="text-xl leading-[1.1]">{item.value}</strong>
            </div>
          ))}
        </div>
      </aside>

      <section className="grid min-w-0 gap-3.5">
        {view === "summary" ? (
          <>
            {tenant.enabledModules.overview ? <OverviewCards data={data} /> : null}
            {tenant.enabledModules.performance ? (
              <MetricChart data={data} accentColor={tenant.accentColor} />
            ) : null}
            <div className={dashboardGridClass}>
              <div className={`${stackClass} col-span-5 max-[760px]:col-span-1`}>
                {tenant.enabledModules.chains ? <ChainBreakdown data={data} /> : null}
              </div>
              <div className={`${stackClass} col-span-7 max-[760px]:col-span-1`}>
                {tenant.enabledModules.economics ? <EconomicsTable data={data} compact /> : null}
              </div>
            </div>
          </>
        ) : null}

        {view === "performance" && tenant.enabledModules.performance ? (
          <MetricChart data={data} accentColor={tenant.accentColor} />
        ) : null}

        {view === "economics" ? (
          <div className={dashboardGridClass}>
            <div className={`${stackClass} col-span-5 max-[760px]:col-span-1`}>
              {tenant.enabledModules.chains ? <ChainBreakdown data={data} /> : null}
            </div>
            <div className={`${stackClass} col-span-7 max-[760px]:col-span-1`}>
              {tenant.enabledModules.economics ? <EconomicsTable data={data} /> : null}
            </div>
          </div>
        ) : null}

        {view === "yields" && tenant.enabledModules.yields ? (
          <YieldTable pools={data.yieldPools} />
        ) : null}

        {view === "methodology" && tenant.enabledModules.methodology ? (
          <Methodology tenant={tenant} data={data} />
        ) : null}
      </section>
    </div>
  );
}
