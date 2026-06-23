export type MetricStatus = "ok" | "stale" | "unsupported" | "error"

export type MetricKey =
  | "tvl"
  | "fees"
  | "revenue"
  | "holdersRevenue"
  | "dexVolume"
  | "optionsVolume"
  | "tokenPrice"
  | "stablecoinSupply"

export type ChartMetricKey =
  | "tvl"
  | "fees"
  | "revenue"
  | "holdersRevenue"
  | "dexVolume"
  | "tokenPrice"

export type ProtocolCapabilities = {
  tvl: boolean
  fees: boolean
  revenue: boolean
  holdersRevenue: boolean
  dexVolume: boolean
  optionsVolume: boolean
  yields: boolean
  tokenPrice: boolean
  stablecoinSupply: boolean
}

export type MetricPoint = {
  timestamp: number
  value: number | null
}

export type MetricSeries = {
  metric: MetricKey
  label: string
  current: number | null
  total24h?: number | null
  total7d?: number | null
  total30d?: number | null
  totalAllTime?: number | null
  points: MetricPoint[]
  chainBreakdown?: Record<string, number>
  methodology?: string | null
  source: string
  sourceUrl: string
  lastDataAt: number | null
  status: MetricStatus
  errorMessage?: string | null
}

export type YieldPool = {
  pool: string
  project: string
  chain: string
  symbol: string
  tvlUsd: number | null
  apyBase: number | null
  apyReward: number | null
  apy: number | null
  stablecoin: boolean | null
}

export type DashboardData = {
  siteSlug: string
  generatedAt: number
  capabilities: ProtocolCapabilities
  metrics: Partial<Record<MetricKey, MetricSeries>>
  yieldPools: YieldPool[]
}

export const EMPTY_CAPABILITIES: ProtocolCapabilities = {
  tvl: false,
  fees: false,
  revenue: false,
  holdersRevenue: false,
  dexVolume: false,
  optionsVolume: false,
  yields: false,
  tokenPrice: false,
  stablecoinSupply: false
}
