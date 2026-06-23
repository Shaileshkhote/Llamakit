import type { MetricKey, MetricSeries } from "@/types/metrics"

type CachePayload<T> = {
  payload: T
  sourceUrl: string
  fetchedAt: number
  lastDataAt: number | null
  expiresAt: number
  status: "ok" | "stale" | "error"
  errorMessage?: string | null
}

const cache = new Map<string, CachePayload<unknown>>()

export const CACHE_TTL_SECONDS = {
  protocolRegistry: 6 * 60 * 60,
  tvl: 60 * 60,
  fees: 60 * 60,
  revenue: 60 * 60,
  holdersRevenue: 60 * 60,
  dexVolume: 60 * 60,
  optionsVolume: 60 * 60,
  yields: 60 * 60,
  tokenPrice: 15 * 60,
  stablecoinSupply: 60 * 60,
  methodology: 24 * 60 * 60
} satisfies Record<string, number>

export function makeCacheKey(tenantId: string, metric: string) {
  return `${tenantId}:${metric}`
}

export function readCache<T>(key: string) {
  return (cache.get(key) as CachePayload<T> | undefined) ?? null
}

export function writeCache<T>(key: string, payload: T, ttlSeconds: number, sourceUrl: string, lastDataAt: number | null) {
  const now = Math.floor(Date.now() / 1000)
  const record: CachePayload<T> = {
    payload,
    sourceUrl,
    fetchedAt: now,
    lastDataAt,
    expiresAt: now + ttlSeconds,
    status: "ok"
  }
  cache.set(key, record)
  return record
}

export function isFresh(record: CachePayload<unknown> | null) {
  if (!record) return false
  return record.expiresAt > Math.floor(Date.now() / 1000)
}

export async function cachedMetricFetch(
  tenantId: string,
  metric: MetricKey,
  ttlSeconds: number,
  fetcher: () => Promise<MetricSeries>
) {
  const key = makeCacheKey(tenantId, metric)
  const existing = readCache<MetricSeries>(key)

  if (isFresh(existing) && existing) {
    return existing.payload
  }

  try {
    const fresh = await fetcher()
    if (fresh.status === "ok") {
      writeCache(key, fresh, ttlSeconds, fresh.sourceUrl, fresh.lastDataAt)
      return fresh
    }

    if (existing) {
      return { ...existing.payload, status: "stale" as const }
    }

    return fresh
  } catch (error) {
    if (existing) {
      return {
        ...existing.payload,
        status: "stale" as const,
        errorMessage: error instanceof Error ? error.message : "Unknown upstream error"
      }
    }

    return {
      metric,
      label: metric,
      current: null,
      points: [],
      source: "DefiLlama",
      sourceUrl: "",
      lastDataAt: null,
      status: "error" as const,
      errorMessage: error instanceof Error ? error.message : "Unknown upstream error"
    }
  }
}
