import type { DashboardData } from "@/types/metrics";
import { formatPercent, formatUsd } from "@/lib/format";

export function OverviewCards({ data }: { data: DashboardData }) {
  const fees = data.metrics.fees?.total30d ?? null;
  const revenue = data.metrics.revenue?.total30d ?? null;
  const retention = fees && revenue ? (revenue / fees) * 100 : null;

  const cards = [
    { label: "TVL", value: formatUsd(data.metrics.tvl?.current), status: data.metrics.tvl?.status },
    {
      label: "DEX Volume 30d",
      value: formatUsd(data.metrics.dexVolume?.total30d),
      status: data.metrics.dexVolume?.status,
    },
    { label: "Fees 30d", value: formatUsd(fees), status: data.metrics.fees?.status },
    { label: "Revenue 30d", value: formatUsd(revenue), status: data.metrics.revenue?.status },
    {
      label: "Revenue Retention",
      value: formatPercent(retention),
      status: data.metrics.revenue?.status,
    },
    {
      label: "Token Price",
      value: formatUsd(data.metrics.tokenPrice?.current),
      status: data.metrics.tokenPrice?.status,
    },
  ].filter((card) => card.status);

  return (
    <section className="grid min-w-0 grid-cols-12 gap-3.5 max-[900px]:grid-cols-6 max-[640px]:grid-cols-2 max-[640px]:gap-2">
      {cards.map((card) => (
        <article
          className="col-span-2 min-h-[124px] min-w-0 border-t border-[var(--border)] py-[18px] max-[900px]:col-span-2 max-[640px]:col-span-1 max-[640px]:min-h-[96px] max-[640px]:rounded-xl max-[640px]:border max-[640px]:bg-[var(--surface)] max-[640px]:p-3"
          key={card.label}
        >
          <span className="text-[13px] text-[var(--muted)]">{card.label}</span>
          <strong className="mt-4 block text-[30px] leading-none max-[640px]:mt-3 max-[640px]:text-[22px]">{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
