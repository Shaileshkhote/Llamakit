import { createSeries } from "@/lib/normalization/series"
import type { MetricSeries } from "@/types/metrics"
import { fetchJson, safeNumber } from "./client"

type CurrentPriceResponse = {
  coins: Record<string, { price?: number; timestamp?: number }>
}

type ChartResponse = {
  coins?: Record<string, { prices?: Array<{ timestamp: number; price: number }> }>
}

export async function fetchTokenPriceSeries(priceId: string): Promise<MetricSeries> {
  const currentUrl = `https://coins.llama.fi/prices/current/${priceId}`
  const current = await fetchJson<CurrentPriceResponse>(currentUrl)
  const currentCoin = current.coins[priceId]
  const start = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60
  const chartUrl = `https://coins.llama.fi/chart/${priceId}?start=${start}&period=1d`

  let points: Array<[number, number]> = []
  try {
    const chart = await fetchJson<ChartResponse>(chartUrl)
    points =
      chart.coins?.[priceId]?.prices?.map((point) => [point.timestamp, point.price] as [number, number]) ??
      []
  } catch {
    if (currentCoin?.timestamp && currentCoin.price != null) {
      points = [[currentCoin.timestamp, currentCoin.price]]
    }
  }

  return createSeries({
    metric: "tokenPrice",
    label: "Token Price",
    sourceUrl: currentUrl,
    points,
    current: safeNumber(currentCoin?.price)
  })
}
