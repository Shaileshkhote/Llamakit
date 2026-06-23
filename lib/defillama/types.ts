export type DefiLlamaHost =
  | "api.llama.fi"
  | "yields.llama.fi"
  | "coins.llama.fi"
  | "stablecoins.llama.fi";

export type DefiLlamaFetchResult<T> =
  | {
      ok: true;
      data: T;
      endpoint: string;
      fetchedAt: string;
    }
  | {
      ok: false;
      data: null;
      endpoint: string;
      fetchedAt: string;
      status: number | null;
      error: string;
    };

export type DefiLlamaProtocolSummary = Record<string, unknown> & {
  id?: string | number | null;
  slug?: string | null;
  name?: string | null;
  symbol?: string | null;
  category?: string | null;
  gecko_id?: string | null;
  url?: string | null;
  logo?: string | null;
  chains?: unknown;
  tvl?: number | null;
  mcap?: number | null;
  chainTvls?: unknown;
  change_1h?: number | null;
  change_1d?: number | null;
  change_7d?: number | null;
  dimensions?: unknown;
  stablecoins?: unknown;
};

export type DefiLlamaProtocolDetail = DefiLlamaProtocolSummary & {
  currentChainTvls?: unknown;
  tvl?: unknown;
  tokens?: unknown;
  tokensInUsd?: unknown;
};

export type DefiLlamaYieldPool = Record<string, unknown> & {
  pool?: string | null;
  chain?: string | null;
  project?: string | null;
  symbol?: string | null;
  tvlUsd?: number | null;
  apyBase?: number | null;
  apyReward?: number | null;
  apy?: number | null;
  stablecoin?: boolean | null;
  poolMeta?: string | null;
  underlyingTokens?: unknown;
  rewardTokens?: unknown;
};

export type DefiLlamaStablecoinAsset = Record<string, unknown> & {
  id?: string | number | null;
  name?: string | null;
  symbol?: string | null;
  gecko_id?: string | null;
  pegType?: string | null;
  pegMechanism?: string | null;
  chains?: unknown;
  price?: number | null;
  circulating?: unknown;
  chainCirculating?: unknown;
};

export type DefiLlamaCoinPrice = {
  price?: number | null;
  symbol?: string | null;
  timestamp?: number | null;
  confidence?: number | null;
};

export type DefiLlamaClientOptions = {
  fetch?: typeof fetch;
  ttlMs?: number;
  now?: () => number;
};
