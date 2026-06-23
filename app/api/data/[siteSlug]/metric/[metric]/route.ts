import { NextResponse } from "next/server"
import { getDashboardData } from "@/lib/data/dashboard"
import { getAnalyticsSiteBySlugOrHost } from "@/lib/tenancy/store"
import type { MetricKey } from "@/types/metrics"

const metricKeys = new Set<string>([
  "tvl",
  "fees",
  "revenue",
  "holdersRevenue",
  "dexVolume",
  "optionsVolume",
  "tokenPrice",
  "stablecoinSupply"
])

export async function GET(
  _: Request,
  { params }: { params: Promise<{ siteSlug: string; metric: string }> }
) {
  const { siteSlug, metric } = await params
  const site = await getAnalyticsSiteBySlugOrHost(decodeURIComponent(siteSlug))

  if (!site || !site.published) {
    return NextResponse.json({ error: "Analytics site not found" }, { status: 404 })
  }

  if (!metricKeys.has(metric)) {
    return NextResponse.json({ error: "Metric not currently tracked" }, { status: 404 })
  }

  const data = await getDashboardData(site)
  const series = data.metrics[metric as MetricKey]

  if (!series) {
    return NextResponse.json({ error: "Metric not currently tracked" }, { status: 404 })
  }

  return NextResponse.json({ site, metric: series })
}
