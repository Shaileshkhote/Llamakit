import { NextResponse } from "next/server"
import { getDashboardData } from "@/lib/data/dashboard"
import { getTenantBySlugOrHost } from "@/lib/tenancy/store"
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
  { params }: { params: Promise<{ tenant: string; metric: string }> }
) {
  const { tenant: tenantParam, metric } = await params
  const tenant = await getTenantBySlugOrHost(decodeURIComponent(tenantParam))

  if (!tenant || !tenant.published) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  if (!metricKeys.has(metric)) {
    return NextResponse.json({ error: "Metric not currently tracked" }, { status: 404 })
  }

  const data = await getDashboardData(tenant)
  const series = data.metrics[metric as MetricKey]

  if (!series) {
    return NextResponse.json({ error: "Metric not currently tracked" }, { status: 404 })
  }

  return NextResponse.json({ tenant, metric: series })
}
