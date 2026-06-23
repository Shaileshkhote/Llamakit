import type { DashboardData } from "@/types/metrics";
import type { Tenant } from "@/types/tenant";
import { formatTimestamp } from "@/lib/format";
import { normalizeMethodologyText, splitSourceUrls } from "@/lib/normalization/methodology";

export function Methodology({ tenant, data }: { tenant: Tenant; data: DashboardData }) {
  const metrics = Object.values(data.metrics);

  return (
    <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="m-0 text-[13px] font-semibold text-[var(--muted)]">Trust</p>
      <h2 className="mb-3.5 mt-1.5 text-2xl">Methodology and provenance</h2>
      <div className="grid gap-2.5">
        {metrics.map((metric) => {
          const sourceUrls = splitSourceUrls(metric.sourceUrl);
          const methodology = normalizeMethodologyText(metric.methodology);
          const methodologyLines = methodology?.split("\n").filter(Boolean) ?? [];
          const freshnessLine = `Updated ${formatTimestamp(metric.lastDataAt)}`;

          return (
            <div
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] p-3"
              key={metric.metric}
            >
              <div className="flex flex-wrap justify-between gap-2.5">
                <strong>{metric.label}</strong>
                {sourceUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 text-[13px]">
                    {sourceUrls.map((sourceUrl, index) => (
                      <a
                        href={sourceUrl}
                        key={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)]"
                      >
                        {sourceUrls.length === 1 ? "Source endpoint" : `Source ${index + 1}`}
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="text-[13px] text-[var(--soft)]">Source unavailable</span>
                )}
              </div>
              <p className="mb-0 mt-1.5 text-[13px] text-[var(--muted)]">{freshnessLine}</p>
              {methodologyLines.length > 0 ? (
                <div className="mt-2 grid gap-1">
                  {methodologyLines.map((line, index) => (
                    <p
                      key={`${metric.metric}-${index}-${line}`}
                      className="m-0 text-[13px] leading-[1.45] text-[var(--muted)]"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mb-0 mt-3 text-xs text-[var(--soft)]">
        Report incorrect data on the DefiLlama protocol page for {tenant.displayName}.
      </p>
    </section>
  );
}
