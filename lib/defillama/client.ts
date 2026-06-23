import { TtlCache } from "../caching";
import type {
  DefiLlamaClientOptions,
  DefiLlamaCoinPrice,
  DefiLlamaFetchResult,
  DefiLlamaHost,
  DefiLlamaProtocolDetail,
  DefiLlamaProtocolSummary,
  DefiLlamaStablecoinAsset,
  DefiLlamaYieldPool,
} from "./types";

const ALLOWED_HOSTS = new Set<DefiLlamaHost>([
  "api.llama.fi",
  "yields.llama.fi",
  "coins.llama.fi",
  "stablecoins.llama.fi",
])

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function assertPublicDefiLlamaEndpoint(url: string): URL {
  const parsed = new URL(url)
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname as DefiLlamaHost)) {
    throw new Error(`Unsupported DefiLlama endpoint: ${parsed.origin}`)
  }

  return parsed
}

export function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function compactRecord(value: Record<string, unknown> | null | undefined): Record<string, number> | undefined {
  if (!value) return undefined
  const entries = Object.entries(value)
    .map(([key, item]) => [key, safeNumber(item)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== null)

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const endpoint = assertPublicDefiLlamaEndpoint(url).toString()
  const headers = new Headers(init?.headers)
  headers.set("accept", "application/json")
  const response = await fetch(endpoint, {
    ...init,
    headers
  })

  if (!response.ok) {
    throw new Error(`DefiLlama request failed with HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

export class DefiLlamaClient {
  private readonly fetchImpl: typeof fetch;
  private readonly ttlMs: number;
  private readonly cache: TtlCache<unknown>;

  constructor(options: DefiLlamaClientOptions = {}) {
    if (typeof window !== "undefined") {
      throw new Error("DefiLlamaClient is server-only and cannot run in a browser.");
    }

    this.fetchImpl = options.fetch ?? fetch
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.cache = new TtlCache<unknown>({ now: options.now })
  }

  async getProtocols(): Promise<DefiLlamaFetchResult<DefiLlamaProtocolSummary[]>> {
    return this.getJson<DefiLlamaProtocolSummary[]>("https://api.llama.fi/protocols")
  }

  async getProtocol(slug: string): Promise<DefiLlamaFetchResult<DefiLlamaProtocolDetail>> {
    const safeSlug = encodeURIComponent(slug)
    return this.getJson<DefiLlamaProtocolDetail>(`https://api.llama.fi/protocol/${safeSlug}`)
  }

  async getYieldPools(): Promise<DefiLlamaFetchResult<DefiLlamaYieldPool[]>> {
    const result = await this.getJson<{ status?: string; data?: DefiLlamaYieldPool[] }>(
      "https://yields.llama.fi/pools",
    )

    if (!result.ok) return result

    return {
      ...result,
      data: Array.isArray(result.data.data) ? result.data.data : []
    }
  }

  async getStablecoins(
    options: { includePrices?: boolean } = {},
  ): Promise<DefiLlamaFetchResult<DefiLlamaStablecoinAsset[]>> {
    const includePrices = options.includePrices ?? true
    const result = await this.getJson<{ peggedAssets?: DefiLlamaStablecoinAsset[] }>(
      `https://stablecoins.llama.fi/stablecoins?includePrices=${includePrices ? "true" : "false"}`,
    )

    if (!result.ok) return result

    return {
      ...result,
      data: Array.isArray(result.data.peggedAssets) ? result.data.peggedAssets : []
    }
  }

  async getCoinPrices(
    coinIds: string[],
  ): Promise<DefiLlamaFetchResult<Record<string, DefiLlamaCoinPrice | null>>> {
    const uniqueIds = [...new Set(coinIds.map((coinId) => coinId.trim()).filter(Boolean))]
    if (uniqueIds.length === 0) {
      return {
        ok: true,
        data: {},
        endpoint: "https://coins.llama.fi/prices/current/",
        fetchedAt: new Date().toISOString()
      }
    }

    const ids = uniqueIds.map(encodeURIComponent).join(",")
    const result = await this.getJson<{ coins?: Record<string, DefiLlamaCoinPrice | null> }>(
      `https://coins.llama.fi/prices/current/${ids}`,
    )

    if (!result.ok) return result

    return {
      ...result,
      data: result.data.coins ?? {}
    }
  }

  clearCache(): void {
    this.cache.clear()
  }

  private async getJson<T>(url: string): Promise<DefiLlamaFetchResult<T>> {
    const endpoint = assertPublicDefiLlamaEndpoint(url).toString()
    const cached = this.cache.get(endpoint)
    if (cached !== undefined) {
      return cached as DefiLlamaFetchResult<T>
    }

    const fetchedAt = new Date().toISOString()

    try {
      const response = await this.fetchImpl(endpoint, {
        headers: {
          accept: "application/json",
        },
      })

      if (!response.ok) {
        return this.cache.set(
          endpoint,
          {
            ok: false,
            data: null,
            endpoint,
            fetchedAt,
            status: response.status,
            error: `DefiLlama request failed with HTTP ${response.status}`,
          } satisfies DefiLlamaFetchResult<T>,
          this.ttlMs,
        ) as DefiLlamaFetchResult<T>
      }

      return this.cache.set(
        endpoint,
        {
          ok: true,
          data: (await response.json()) as T,
          endpoint,
          fetchedAt,
        } satisfies DefiLlamaFetchResult<T>,
        this.ttlMs
      ) as DefiLlamaFetchResult<T>
    } catch (error) {
      return {
        ok: false,
        data: null,
        endpoint,
        fetchedAt,
        status: null,
        error: error instanceof Error ? error.message : "Unknown DefiLlama request failure"
      }
    }
  }
}

export function createDefiLlamaClient(options?: DefiLlamaClientOptions): DefiLlamaClient {
  return new DefiLlamaClient(options)
}
