import type {
  DefiLlamaCoinPrice,
  DefiLlamaProtocolDetail,
  DefiLlamaProtocolSummary,
  DefiLlamaStablecoinAsset,
  DefiLlamaYieldPool,
} from "../defillama";

export type NullableNumber = number | null;

export type NormalizedProtocol = {
  id: string | null;
  slug: string | null;
  name: string | null;
  symbol: string | null;
  category: string | null;
  geckoId: string | null;
  url: string | null;
  logo: string | null;
  chains: string[];
  tvlUsd: NullableNumber;
  marketCapUsd: NullableNumber;
  change1hPct: NullableNumber;
  change1dPct: NullableNumber;
  change7dPct: NullableNumber;
  chainTvlsUsd: Record<string, NullableNumber>;
  stablecoinIds: string[];
  hasFeeMetadata: boolean;
};

export type NormalizedProtocolHistoryPoint = {
  date: number | null;
  tvlUsd: NullableNumber;
};

export type NormalizedYieldPool = {
  pool: string | null;
  project: string | null;
  chain: string | null;
  symbol: string | null;
  tvlUsd: NullableNumber;
  apyBasePct: NullableNumber;
  apyRewardPct: NullableNumber;
  apyPct: NullableNumber;
  stablecoin: boolean | null;
  poolMeta: string | null;
  underlyingTokens: string[];
  rewardTokens: string[];
};

export type NormalizedStablecoin = {
  id: string | null;
  name: string | null;
  symbol: string | null;
  geckoId: string | null;
  pegType: string | null;
  pegMechanism: string | null;
  chains: string[];
  priceUsd: NullableNumber;
  circulatingUsd: NullableNumber;
  chainCirculatingUsd: Record<string, NullableNumber>;
};

export type NormalizedCoinPrice = {
  coinId: string;
  priceUsd: NullableNumber;
  symbol: string | null;
  timestamp: number | null;
  confidence: NullableNumber;
};

export function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function nullableNumber(value: unknown): NullableNumber {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function numberRecord(value: unknown): Record<string, NullableNumber> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, nullableNumber(item)]),
  );
}

export function normalizeProtocol(raw: DefiLlamaProtocolSummary): NormalizedProtocol {
  return {
    id: raw.id == null ? null : String(raw.id),
    slug: nullableString(raw.slug),
    name: nullableString(raw.name),
    symbol: nullableString(raw.symbol),
    category: nullableString(raw.category),
    geckoId: nullableString(raw.gecko_id),
    url: nullableString(raw.url),
    logo: nullableString(raw.logo),
    chains: stringArray(raw.chains),
    tvlUsd: nullableNumber(raw.tvl),
    marketCapUsd: nullableNumber(raw.mcap),
    change1hPct: nullableNumber(raw.change_1h),
    change1dPct: nullableNumber(raw.change_1d),
    change7dPct: nullableNumber(raw.change_7d),
    chainTvlsUsd: numberRecord(raw.chainTvls),
    stablecoinIds: stringArray(raw.stablecoins),
    hasFeeMetadata: hasNestedKey(raw.dimensions, "fees"),
  };
}

export function normalizeMetricPoint(
  item: unknown,
  context: { tenantId?: string; metric?: string; source?: string } = {},
) {
  const raw = (Array.isArray(item)
    ? { timestamp: item[0], value: item[1] }
    : (item ?? {})) as Record<string, unknown>

  return {
    tenantId: context.tenantId ?? null,
    metric: context.metric ?? null,
    source: context.source ?? null,
    timestamp: nullableNumber(raw.date ?? raw.timestamp),
    value: nullableNumber(raw.totalLiquidityUSD ?? raw.value)
  }
}

export const normalizeChartPoint = normalizeMetricPoint
export const normalizeDefiLlamaPoint = normalizeMetricPoint

export function normalizeProtocolHistory(raw: DefiLlamaProtocolDetail): NormalizedProtocolHistoryPoint[] {
  if (!Array.isArray(raw.tvl)) return [];

  return raw.tvl
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      date: typeof item.date === "number" && Number.isFinite(item.date) ? item.date : null,
      tvlUsd: nullableNumber(item.totalLiquidityUSD),
    }));
}

export function normalizeYieldPool(raw: DefiLlamaYieldPool): NormalizedYieldPool {
  return {
    pool: nullableString(raw.pool),
    project: nullableString(raw.project),
    chain: nullableString(raw.chain),
    symbol: nullableString(raw.symbol),
    tvlUsd: nullableNumber(raw.tvlUsd),
    apyBasePct: nullableNumber(raw.apyBase),
    apyRewardPct: nullableNumber(raw.apyReward),
    apyPct: nullableNumber(raw.apy),
    stablecoin: typeof raw.stablecoin === "boolean" ? raw.stablecoin : null,
    poolMeta: nullableString(raw.poolMeta),
    underlyingTokens: stringArray(raw.underlyingTokens),
    rewardTokens: stringArray(raw.rewardTokens),
  };
}

export function normalizeStablecoin(raw: DefiLlamaStablecoinAsset): NormalizedStablecoin {
  return {
    id: raw.id == null ? null : String(raw.id),
    name: nullableString(raw.name),
    symbol: nullableString(raw.symbol),
    geckoId: nullableString(raw.gecko_id),
    pegType: nullableString(raw.pegType),
    pegMechanism: nullableString(raw.pegMechanism),
    chains: stringArray(raw.chains),
    priceUsd: nullableNumber(raw.price),
    circulatingUsd: peggedUsdValue(raw.circulating),
    chainCirculatingUsd: normalizeChainCirculating(raw.chainCirculating),
  };
}

export function normalizeCoinPrice(coinId: string, raw: DefiLlamaCoinPrice | null | undefined): NormalizedCoinPrice {
  return {
    coinId,
    priceUsd: nullableNumber(raw?.price),
    symbol: nullableString(raw?.symbol),
    timestamp: typeof raw?.timestamp === "number" && Number.isFinite(raw.timestamp) ? raw.timestamp : null,
    confidence: nullableNumber(raw?.confidence),
  };
}

function peggedUsdValue(value: unknown): NullableNumber {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return nullableNumber((value as Record<string, unknown>).peggedUSD);
}

function normalizeChainCirculating(value: unknown): Record<string, NullableNumber> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([chain, chainValue]) => {
      if (!chainValue || typeof chainValue !== "object" || Array.isArray(chainValue)) return [chain, null];
      return [chain, peggedUsdValue((chainValue as Record<string, unknown>).current)];
    }),
  );
}

function hasNestedKey(value: unknown, key: string): boolean {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && key in value);
}
