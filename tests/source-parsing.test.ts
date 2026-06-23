import { describe, expect, it } from "vitest";
import { assertPublicDefiLlamaEndpoint } from "../lib/defillama/client";

describe("source parsing", () => {
  it("accepts only approved public DefiLlama hosts", () => {
    expect(assertPublicDefiLlamaEndpoint("https://api.llama.fi/protocol/uniswap").hostname).toBe("api.llama.fi");
    expect(assertPublicDefiLlamaEndpoint("https://yields.llama.fi/pools").hostname).toBe("yields.llama.fi");
    expect(assertPublicDefiLlamaEndpoint("https://coins.llama.fi/prices/current/coingecko:uniswap").hostname).toBe(
      "coins.llama.fi",
    );
    expect(assertPublicDefiLlamaEndpoint("https://stablecoins.llama.fi/stablecoins").hostname).toBe(
      "stablecoins.llama.fi",
    );
  });

  it("rejects lookalike hosts and insecure protocols", () => {
    expect(() => assertPublicDefiLlamaEndpoint("https://api.llama.fi.evil.test/protocols")).toThrow(
      /Unsupported DefiLlama endpoint/,
    );
    expect(() => assertPublicDefiLlamaEndpoint("http://api.llama.fi/protocols")).toThrow(
      /Unsupported DefiLlama endpoint/,
    );
  });
});
