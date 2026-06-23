import { notFound } from "next/navigation"
import { EmbedChart } from "@/components/dashboard/EmbedChart"
import { getDashboardData } from "@/lib/data/dashboard"
import { formatTimestamp } from "@/lib/format"
import { getAnalyticsSiteBySlugOrHost } from "@/lib/tenancy/store"
import type { MetricKey } from "@/types/metrics"

const moduleToMetric: Record<string, MetricKey> = {
  tvl: "tvl",
  revenue: "revenue",
  volume: "dexVolume",
  fees: "fees"
}

export const dynamic = "force-dynamic"

export default async function EmbedPage({
  params,
  searchParams
}: {
  params: Promise<{ siteSlug: string; module: string }>
  searchParams: Promise<{ theme?: string }>
}) {
  const [{ siteSlug, module }, { theme: themeParam }] = await Promise.all([params, searchParams])
  const site = await getAnalyticsSiteBySlugOrHost(decodeURIComponent(siteSlug))
  const metricKey = moduleToMetric[module]

  if (!site || !site.published || !metricKey) notFound()

  const data = await getDashboardData(site)
  const metric = data.metrics[metricKey]
  if (!metric) notFound()

  const theme = themeParam === "dark" ? "dark" : "light"
  const dark = theme === "dark"

  return (
    <main
      className={[
        "min-h-screen p-3 font-sans",
        dark ? "bg-[#101827] text-[#f7f8fb]" : "bg-white text-[#101827]"
      ].join(" ")}
    >
      <div className="mb-2 flex justify-between gap-2">
        <strong>
          {site.displayName} {metric.label}
        </strong>
        <span className={`text-xs ${dark ? "text-[#aab7c8]" : "text-[#5c6b7d]"}`}>
          {formatTimestamp(metric.lastDataAt)}
        </span>
      </div>
      <EmbedChart metric={metric} accentColor={site.accentColor} theme={theme} />
      <footer className={`text-[11px] ${dark ? "text-[#aab7c8]" : "text-[#8a98aa]"}`}>
        Unofficial LlamaKit prototype. Data provided by DefiLlama.
      </footer>
    </main>
  )
}
