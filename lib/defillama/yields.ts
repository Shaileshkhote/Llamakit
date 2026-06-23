import type { YieldPool } from "@/types/metrics"
import { fetchJson, safeNumber } from "./client"

type RawPool = {
  pool: string
  project: string
  chain: string
  symbol: string
  tvlUsd?: number
  apyBase?: number
  apyReward?: number
  apy?: number
  stablecoin?: boolean
}

type PoolsResponse = {
  data: RawPool[]
}

export async function fetchYieldPools(projects: string[]): Promise<YieldPool[]> {
  if (projects.length === 0) return []
  const payload = await fetchJson<PoolsResponse>("https://yields.llama.fi/pools")
  const projectSet = new Set(projects.map((project) => project.toLowerCase()))

  return payload.data
    .filter((pool) => projectSet.has(pool.project.toLowerCase()))
    .map((pool) => ({
      pool: pool.pool,
      project: pool.project,
      chain: pool.chain,
      symbol: pool.symbol,
      tvlUsd: safeNumber(pool.tvlUsd),
      apyBase: safeNumber(pool.apyBase),
      apyReward: safeNumber(pool.apyReward),
      apy: safeNumber(pool.apy),
      stablecoin: typeof pool.stablecoin === "boolean" ? pool.stablecoin : null
    }))
    .sort((a, b) => (b.tvlUsd ?? Number.NEGATIVE_INFINITY) - (a.tvlUsd ?? Number.NEGATIVE_INFINITY))
    .slice(0, 50)
}
