import type { MetricKey, MetricPoint, MetricSeries } from "@/types/metrics"
import { getLatestTimestamp } from "@/lib/format"
import { compactRecord, safeNumber } from "@/lib/defillama/client"

export function normalizePoints(input: unknown): MetricPoint[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      if (Array.isArray(item)) {
        return { timestamp: Number(item[0]), value: safeNumber(item[1]) }
      }

      const obj = item as Record<string, unknown>
      return {
        timestamp: Number(obj.date ?? obj.timestamp ?? 0),
        value: safeNumber(obj.totalLiquidityUSD ?? obj.value)
      }
    })
    .filter((point) => Number.isFinite(point.timestamp) && point.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function createSeries(args: {
  metric: MetricKey
  label: string
  sourceUrl: string
  current?: unknown
  total24h?: unknown
  total7d?: unknown
  total30d?: unknown
  totalAllTime?: unknown
  points?: unknown
  chainBreakdown?: Record<string, unknown> | null
  methodology?: string | null
}): MetricSeries {
  const points = normalizePoints(args.points)
  const current = safeNumber(args.current) ?? points.at(-1)?.value ?? null

  return {
    metric: args.metric,
    label: args.label,
    current,
    total24h: safeNumber(args.total24h),
    total7d: safeNumber(args.total7d),
    total30d: safeNumber(args.total30d),
    totalAllTime: safeNumber(args.totalAllTime),
    points,
    chainBreakdown: compactRecord(args.chainBreakdown),
    methodology: args.methodology ?? null,
    source: "DefiLlama",
    sourceUrl: args.sourceUrl,
    lastDataAt: getLatestTimestamp(points) || null,
    status: points.length > 0 || current != null ? "ok" : "unsupported"
  }
}
