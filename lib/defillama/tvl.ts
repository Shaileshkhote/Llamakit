import { createSeries } from "@/lib/normalization/series"
import type { MetricSeries } from "@/types/metrics"
import { fetchJson } from "./client"

type ProtocolResponse = {
  tvl?: Array<{ date: number; totalLiquidityUSD: number }>
  currentChainTvls?: Record<string, number>
  methodology?: string
  name?: string
}

export async function fetchTvlSeries(protocol: string): Promise<MetricSeries> {
  const sourceUrl = `https://api.llama.fi/protocol/${protocol}`
  const payload = await fetchJson<ProtocolResponse>(sourceUrl)
  const points = payload.tvl ?? []

  return createSeries({
    metric: "tvl",
    label: "TVL",
    sourceUrl,
    points,
    current: points.at(-1)?.totalLiquidityUSD,
    chainBreakdown: payload.currentChainTvls,
    methodology: payload.methodology ?? null
  })
}
