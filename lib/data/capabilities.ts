import type { NormalizedProtocol, NormalizedStablecoin, NormalizedYieldPool } from "../normalization";

export type MetricCapabilityName =
  | "tvl"
  | "chain-tvl"
  | "historical-tvl"
  | "yield"
  | "stablecoin-supply"
  | "price"
  | "fees"
  | "revenue";

export type MetricCapability = {
  metric: MetricCapabilityName;
  supported: boolean;
  source: "api.llama.fi" | "yields.llama.fi" | "coins.llama.fi" | "stablecoins.llama.fi" | null;
  reason: string | null;
};

export type CapabilityInput = {
  protocol: NormalizedProtocol | null;
  protocolHistoryCount?: number;
  yieldPools?: NormalizedYieldPool[];
  stablecoins?: NormalizedStablecoin[];
  priceCoinIds?: string[];
};

export function detectMetricCapabilities(input: CapabilityInput): MetricCapability[] {
  const protocol = input.protocol;
  const hasProtocol = protocol !== null;
  const hasYield = (input.yieldPools ?? []).length > 0;
  const hasStablecoin = (input.stablecoins ?? []).length > 0;
  const hasPriceIds = (input.priceCoinIds ?? []).length > 0;

  return [
    {
      metric: "tvl",
      supported: hasProtocol && protocol.tvlUsd !== null,
      source: hasProtocol ? "api.llama.fi" : null,
      reason: hasProtocol ? null : "protocol-not-found",
    },
    {
      metric: "chain-tvl",
      supported: hasProtocol && Object.keys(protocol.chainTvlsUsd).length > 0,
      source: hasProtocol ? "api.llama.fi" : null,
      reason: hasProtocol ? null : "protocol-not-found",
    },
    {
      metric: "historical-tvl",
      supported: (input.protocolHistoryCount ?? 0) > 0,
      source: hasProtocol ? "api.llama.fi" : null,
      reason: hasProtocol ? null : "protocol-not-found",
    },
    {
      metric: "yield",
      supported: hasYield,
      source: "yields.llama.fi",
      reason: hasYield ? null : "no-matching-yield-pools",
    },
    {
      metric: "stablecoin-supply",
      supported: hasStablecoin,
      source: "stablecoins.llama.fi",
      reason: hasStablecoin ? null : "no-matching-stablecoin-assets",
    },
    {
      metric: "price",
      supported: hasPriceIds,
      source: "coins.llama.fi",
      reason: hasPriceIds ? null : "no-supported-coin-ids",
    },
    {
      metric: "fees",
      supported: false,
      source: hasProtocol && protocol.hasFeeMetadata ? "api.llama.fi" : null,
      reason: protocol?.hasFeeMetadata
        ? "fee-metadata-detected-but-fee-timeseries-endpoint-is-out-of-scope"
        : "no-fee-metadata",
    },
    {
      metric: "revenue",
      supported: false,
      source: hasProtocol && protocol.hasFeeMetadata ? "api.llama.fi" : null,
      reason: protocol?.hasFeeMetadata
        ? "fee-metadata-detected-but-revenue-timeseries-endpoint-is-out-of-scope"
        : "no-revenue-metadata",
    },
  ];
}

export function detectCapabilities(input: {
  tenant?: { modules?: Array<{ capabilities?: string[]; metrics?: string[] }> } | null;
  sources?: unknown[];
  metrics?: string[];
}) {
  const modules = input.tenant?.modules ?? []
  const moduleCapabilities = new Set(modules.flatMap((module) => module.capabilities ?? []))
  const metrics = new Set([...(input.metrics ?? []), ...modules.flatMap((module) => module.metrics ?? [])])
  const hasProtocolSource = JSON.stringify(input.sources ?? modules).toLowerCase().includes("defillama")

  return {
    charts: moduleCapabilities.has("charts") || metrics.size > 0,
    historical: moduleCapabilities.has("historical"),
    protocol: moduleCapabilities.has("protocol-summary") || hasProtocolSource,
    chainBreakdown: moduleCapabilities.has("chain-breakdown"),
    metrics: [...metrics]
  }
}
