import { describe, expect, it } from "vitest";
import { normalizeMethodologyText, splitSourceUrls } from "../lib/normalization/methodology";
import { createSeries, normalizePoints } from "../lib/normalization/series";

describe("normalizers", () => {
  it("normalizes DefiLlama-style points into ascending metric points", () => {
    expect(
      normalizePoints([
        { date: 1_719_244_800, totalLiquidityUSD: 3 },
        [1_719_158_400, 1],
        { timestamp: 1_719_331_200, value: null },
        { date: 0, totalLiquidityUSD: 99 },
      ]),
    ).toEqual([
      { timestamp: 1_719_158_400, value: 1 },
      { timestamp: 1_719_244_800, value: 3 },
      { timestamp: 1_719_331_200, value: null },
    ]);
  });

  it("creates an unsupported series when source points and current value are absent", () => {
    expect(
      createSeries({
        metric: "tvl",
        label: "TVL",
        sourceUrl: "https://api.llama.fi/protocol/uniswap",
        points: [],
      }),
    ).toMatchObject({
      metric: "tvl",
      current: null,
      points: [],
      source: "DefiLlama",
      sourceUrl: "https://api.llama.fi/protocol/uniswap",
      status: "unsupported",
    });
  });
});

describe("methodology normalizers", () => {
  it("converts structured methodology into readable lines", () => {
    expect(
      normalizeMethodologyText({
        dailyFees: "Trading fees paid by users.",
        chains: {
          bsc: "BSC deployment.",
          ethereum: "Ethereum deployment.",
        },
      }),
    ).toBe(
      [
        "Daily Fees: Trading fees paid by users.",
        "Chains: Bsc: BSC deployment.",
        "Chains: Ethereum: Ethereum deployment.",
      ].join("\n"),
    );
  });

  it("drops object-stringified methodology instead of showing debug output", () => {
    expect(normalizeMethodologyText("[object Object] [object Object]")).toBeNull();
  });

  it("splits aggregated DefiLlama source endpoints into separate links", () => {
    expect(
      splitSourceUrls(
        "https://api.llama.fi/summary/fees/pancakeswap-amm?dataType=dailyFees, https://api.llama.fi/summary/fees/pancakeswap-amm-v3?dataType=dailyFees",
      ),
    ).toEqual([
      "https://api.llama.fi/summary/fees/pancakeswap-amm?dataType=dailyFees",
      "https://api.llama.fi/summary/fees/pancakeswap-amm-v3?dataType=dailyFees",
    ]);
  });
});
