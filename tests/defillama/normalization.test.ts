import { expect, test } from "vitest";

import { assertPublicDefiLlamaEndpoint } from "../../lib/defillama/client";
import {
  detectMetricCapabilities,
  normalizeCoinPrice,
  normalizeProtocol,
  normalizeStablecoin,
  normalizeYieldPool,
} from "../../lib/data/index";

test("normalizers preserve nulls and real zero values", () => {
  const pool = normalizeYieldPool({
    pool: "pool-1",
    project: "aave-v3",
    chain: "Ethereum",
    symbol: "WETH",
    tvlUsd: null,
    apyBase: null,
    apyReward: 0,
    apy: 0,
    stablecoin: false,
  });

  expect(pool.tvlUsd).toBeNull();
  expect(pool.apyBasePct).toBeNull();
  expect(pool.apyRewardPct).toBe(0);
  expect(pool.apyPct).toBe(0);

  const price = normalizeCoinPrice("coingecko:missing", null);
  expect(price.priceUsd).toBeNull();
  expect(price.symbol).toBeNull();
});

test("protocol normalization keeps unsupported metrics null instead of zero", () => {
  const protocol = normalizeProtocol({
    id: "1599",
    slug: "aave-v3",
    name: "Aave V3",
    chains: ["Ethereum"],
    tvl: undefined,
    mcap: null,
    change_1d: null,
    chainTvls: {
      Ethereum: 123,
      Unknown: null,
    },
    dimensions: {
      fees: {
        adapter: "aave-v3",
      },
    },
  });

  expect(protocol.tvlUsd).toBeNull();
  expect(protocol.marketCapUsd).toBeNull();
  expect(protocol.change1dPct).toBeNull();
  expect(protocol.chainTvlsUsd.Ethereum).toBe(123);
  expect(protocol.chainTvlsUsd.Unknown).toBeNull();
  expect(protocol.hasFeeMetadata).toBe(true);
});

test("stablecoin normalization reads pegged USD values without filling absent data", () => {
  const stablecoin = normalizeStablecoin({
    id: "1",
    name: "Tether",
    symbol: "USDT",
    chains: ["Ethereum", "Tron"],
    price: null,
    circulating: {
      peggedUSD: 100,
    },
    chainCirculating: {
      Ethereum: {
        current: {
          peggedUSD: 70,
        },
      },
      Tron: {
        current: {},
      },
    },
  });

  expect(stablecoin.priceUsd).toBeNull();
  expect(stablecoin.circulatingUsd).toBe(100);
  expect(stablecoin.chainCirculatingUsd.Ethereum).toBe(70);
  expect(stablecoin.chainCirculatingUsd.Tron).toBeNull();
});

test("capabilities expose unsupported fee/revenue metadata without claiming data support", () => {
  const protocol = normalizeProtocol({
    slug: "lido",
    tvl: 1,
    chainTvls: {
      Ethereum: 1,
    },
    dimensions: {
      fees: "lido",
    },
  });

  const capabilities = detectMetricCapabilities({
    protocol,
    protocolHistoryCount: 1,
    yieldPools: [],
    stablecoins: [],
    priceCoinIds: [],
  });

  expect(capabilities.find((capability) => capability.metric === "tvl")?.supported).toBe(true);
  expect(capabilities.find((capability) => capability.metric === "fees")?.supported).toBe(false);
  expect(capabilities.find((capability) => capability.metric === "fees")?.reason ?? "").toMatch(/out-of-scope/);
});

test("client only accepts the approved public DefiLlama hosts", () => {
  expect(assertPublicDefiLlamaEndpoint("https://api.llama.fi/protocols").hostname).toBe("api.llama.fi");
  expect(assertPublicDefiLlamaEndpoint("https://yields.llama.fi/pools").hostname).toBe("yields.llama.fi");
  expect(assertPublicDefiLlamaEndpoint("https://coins.llama.fi/prices/current/coingecko:ethereum").hostname).toBe(
    "coins.llama.fi",
  );
  expect(assertPublicDefiLlamaEndpoint("https://stablecoins.llama.fi/stablecoins").hostname).toBe(
    "stablecoins.llama.fi",
  );
  expect(() => assertPublicDefiLlamaEndpoint("https://api.llama.fi.evil.test/protocols")).toThrow();
  expect(() => assertPublicDefiLlamaEndpoint("http://api.llama.fi/protocols")).toThrow();
});
