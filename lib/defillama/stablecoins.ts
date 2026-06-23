import { createSeries } from "@/lib/normalization/series"
import type { MetricSeries } from "@/types/metrics"
import { fetchJson, safeNumber } from "./client"

type StablecoinResponse = {
  pegType?: string
  chainCirculating?: Record<string, { current?: { circulating?: number } }>
  circulating?: Array<{ date: number; circulating: number }>
}

export async function fetchStablecoinSupplySeries(assetId: string): Promise<MetricSeries> {
  const sourceUrl = `https://stablecoins.llama.fi/stablecoin/${assetId}`
  const payload = await fetchJson<StablecoinResponse>(sourceUrl)
  const currentByChain = Object.fromEntries(
    Object.entries(payload.chainCirculating ?? {}).map(([chain, value]) => [
      chain,
      safeNumber(value.current?.circulating)
    ])
  )
  const currentValues = Object.values(currentByChain).filter((value): value is number => value !== null)

  return createSeries({
    metric: "stablecoinSupply",
    label: "Stablecoin Supply",
    sourceUrl,
    points: payload.circulating?.map((point) => [point.date, point.circulating]),
    current: currentValues.length > 0 ? currentValues.reduce((sum, value) => sum + value, 0) : undefined,
    chainBreakdown: currentByChain
  })
}
