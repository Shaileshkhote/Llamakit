import type { DashboardData } from "@/types/metrics";
import { formatUsd } from "@/lib/format";

export function ChainBreakdown({ data }: { data: DashboardData }) {
  const breakdown = data.metrics.tvl?.chainBreakdown;
  if (!breakdown) return null;

  const entries = Object.entries(breakdown)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 5);
  const other = entries.slice(5).reduce((sum, [, value]) => sum + value, 0);
  const rows = other > 0 ? [...top, ["Other", other] as [string, number]] : top;
  const total = rows.reduce((sum, [, value]) => sum + value, 0);

  return (
    <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="m-0 text-[13px] font-semibold text-[var(--muted)]">Distribution</p>
      <h2 className="mb-[18px] mt-1.5 text-2xl">Chain TVL</h2>
      <div className="grid gap-3.5">
        {rows.map(([chain, value]) => {
          const pct = total ? (value / total) * 100 : 0;
          return (
            <div key={chain}>
              <div className="mb-1.5 flex justify-between">
                <span className="text-[13px]">{chain}</span>
                <span className="text-[13px] text-[var(--muted)]">
                  {pct.toFixed(1)}% · {formatUsd(value)}
                </span>
              </div>
              <div className="h-[9px] rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--text)]"
                  style={{
                    width: `${pct}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
