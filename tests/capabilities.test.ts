import { describe, expect, it } from "vitest";
import { detectMetricCapabilities } from "../lib/data/capabilities";
import { normalizeProtocol } from "../lib/normalization";

describe("capability detection", () => {
  it("marks TVL, chain TVL, history, and related source hosts when protocol data exists", () => {
    const protocol = normalizeProtocol({
      id: "1",
      slug: "uniswap",
      name: "Uniswap",
      tvl: 100,
      chains: ["Ethereum", "Arbitrum"],
      chainTvls: {
        Ethereum: 60,
        Arbitrum: 40,
      },
      dimensions: {
        fees: {
          adapter: "uniswap",
        },
      },
    });

    const result = detectMetricCapabilities({
      protocol,
      protocolHistoryCount: 2,
      yieldPools: [{ pool: "pool-1", project: "uniswap", chain: "Ethereum", symbol: "ETH-USDC", tvlUsd: 1, apyBasePct: 0, apyRewardPct: 0, apyPct: 0, stablecoin: false, poolMeta: null, underlyingTokens: [], rewardTokens: [] }],
      stablecoins: [],
      priceCoinIds: ["coingecko:uniswap"],
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "tvl", supported: true, source: "api.llama.fi" }),
        expect.objectContaining({ metric: "chain-tvl", supported: true, source: "api.llama.fi" }),
        expect.objectContaining({ metric: "historical-tvl", supported: true, source: "api.llama.fi" }),
        expect.objectContaining({ metric: "yield", supported: true, source: "yields.llama.fi" }),
        expect.objectContaining({ metric: "price", supported: true, source: "coins.llama.fi" }),
      ]),
    );
  });

  it("does not claim fee or revenue time series from metadata alone", () => {
    const protocol = normalizeProtocol({
      slug: "lido",
      tvl: 1,
      dimensions: {
        fees: "lido",
      },
    });

    const result = detectMetricCapabilities({ protocol });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "fees",
          supported: false,
          source: "api.llama.fi",
          reason: expect.stringContaining("out-of-scope"),
        }),
        expect.objectContaining({
          metric: "revenue",
          supported: false,
          source: "api.llama.fi",
          reason: expect.stringContaining("out-of-scope"),
        }),
      ]),
    );
  });
});
