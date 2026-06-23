import { DefiLlamaClient, type DefiLlamaClientOptions, type DefiLlamaFetchResult } from "../defillama";
import {
  normalizeCoinPrice,
  normalizeProtocol,
  normalizeProtocolHistory,
  normalizeStablecoin,
  normalizeYieldPool,
  type NormalizedCoinPrice,
  type NormalizedProtocol,
  type NormalizedProtocolHistoryPoint,
  type NormalizedStablecoin,
  type NormalizedYieldPool,
} from "../normalization";
import { detectMetricCapabilities, type MetricCapability } from "./capabilities";

export type ProtocolDataSnapshot = {
  protocol: NormalizedProtocol | null;
  tvlHistory: NormalizedProtocolHistoryPoint[];
  yieldPools: NormalizedYieldPool[];
  stablecoins: NormalizedStablecoin[];
  prices: NormalizedCoinPrice[];
  capabilities: MetricCapability[];
  errors: string[];
  fetchedAt: string;
};

export type DefiLlamaDataProviderOptions = DefiLlamaClientOptions & {
  client?: DefiLlamaClient;
};

export class DefiLlamaDataProvider {
  private readonly client: DefiLlamaClient;

  constructor(options: DefiLlamaDataProviderOptions = {}) {
    this.client = options.client ?? new DefiLlamaClient(options);
  }

  async searchProtocols(query: string, limit = 20): Promise<NormalizedProtocol[]> {
    const protocols = await this.client.getProtocols();
    if (!protocols.ok) return [];

    const normalized = protocols.data.map(normalizeProtocol);
    const needle = query.trim().toLowerCase();
    if (!needle) return normalized.slice(0, limit);

    return normalized
      .filter((protocol) =>
        [protocol.name, protocol.slug, protocol.symbol, protocol.category]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle)),
      )
      .slice(0, limit);
  }

  async getProtocolSnapshot(slug: string): Promise<ProtocolDataSnapshot> {
    const [protocols, detail, yields, stablecoins] = await Promise.all([
      this.client.getProtocols(),
      this.client.getProtocol(slug),
      this.client.getYieldPools(),
      this.client.getStablecoins({ includePrices: true }),
    ]);

    const errors = collectErrors([protocols, detail, yields, stablecoins]);
    const protocol = selectProtocol(slug, protocols, detail);
    const history = detail.ok ? normalizeProtocolHistory(detail.data) : [];
    const yieldPools = yields.ok
      ? yields.data
          .map(normalizeYieldPool)
          .filter((pool) => pool.project === slug || pool.project === protocol?.slug)
          .sort((a, b) => (b.tvlUsd ?? -1) - (a.tvlUsd ?? -1))
      : [];
    const normalizedStablecoins = stablecoins.ok
      ? stablecoins.data
          .map(normalizeStablecoin)
          .filter((asset) => protocol?.stablecoinIds.includes(asset.id ?? "") || asset.geckoId === protocol?.slug)
      : [];
    const priceCoinIds = coinIdsForProtocol(protocol);
    const prices = await this.getPrices(priceCoinIds, errors);

    return {
      protocol,
      tvlHistory: history,
      yieldPools,
      stablecoins: normalizedStablecoins,
      prices,
      capabilities: detectMetricCapabilities({
        protocol,
        protocolHistoryCount: history.length,
        yieldPools,
        stablecoins: normalizedStablecoins,
        priceCoinIds,
      }),
      errors,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getPrices(coinIds: string[], errors: string[] = []): Promise<NormalizedCoinPrice[]> {
    const result = await this.client.getCoinPrices(coinIds);
    if (!result.ok) {
      errors.push(result.error);
      return coinIds.map((coinId) => normalizeCoinPrice(coinId, null));
    }

    return coinIds.map((coinId) => normalizeCoinPrice(coinId, result.data[coinId]));
  }
}

export function createDefiLlamaDataProvider(options?: DefiLlamaDataProviderOptions): DefiLlamaDataProvider {
  return new DefiLlamaDataProvider(options);
}

function selectProtocol(
  slug: string,
  protocols: DefiLlamaFetchResult<Record<string, unknown>[]>,
  detail: DefiLlamaFetchResult<Record<string, unknown>>,
): NormalizedProtocol | null {
  if (protocols.ok) {
    const found = protocols.data.find((protocol) => protocol.slug === slug);
    if (found) return normalizeProtocol(found);
  }

  return detail.ok ? normalizeProtocol(detail.data) : null;
}

function collectErrors(results: DefiLlamaFetchResult<unknown>[]): string[] {
  return results.flatMap((result) => (result.ok ? [] : [result.error]));
}

function coinIdsForProtocol(protocol: NormalizedProtocol | null): string[] {
  if (!protocol?.geckoId) return []
  return [`coingecko:${protocol.geckoId}`]
}
