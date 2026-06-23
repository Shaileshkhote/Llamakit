import { describe, expect, it } from "vitest";
import { TtlCache } from "../lib/caching";
import { isFresh, makeCacheKey, readCache, writeCache } from "../lib/caching/metric-cache";

describe("ttl cache", () => {
  it("stores, expires, and deletes values against an injected clock", () => {
    let now = 1_000;
    const cache = new TtlCache<{ value: number }>({ now: () => now });

    expect(cache.get("tenant:uniswap:tvl")).toBeUndefined();

    cache.set("tenant:uniswap:tvl", { value: 42 }, 100);
    expect(cache.get("tenant:uniswap:tvl")).toEqual({ value: 42 });
    expect(cache.has("tenant:uniswap:tvl")).toBe(true);

    now = 1_101;
    expect(cache.get("tenant:uniswap:tvl")).toBeUndefined();
    expect(cache.has("tenant:uniswap:tvl")).toBe(false);

    cache.set("tenant:uniswap:tvl", { value: 7 }, 100);
    expect(cache.delete("tenant:uniswap:tvl")).toBe(true);
    expect(cache.get("tenant:uniswap:tvl")).toBeUndefined();
  });
});

describe("metric cache", () => {
  it("uses tenant and metric as the cache key boundary", () => {
    expect(makeCacheKey("uniswap", "tvl")).toBe("uniswap:tvl");
    expect(makeCacheKey("aave", "tvl")).toBe("aave:tvl");
  });

  it("wraps cached payloads with source metadata and freshness", () => {
    const key = makeCacheKey("uniswap", "tvl");
    const record = writeCache(key, { current: 123 }, 60, "https://api.llama.fi/protocol/uniswap", 1_719_158_400);

    expect(readCache(key)).toEqual(record);
    expect(record).toMatchObject({
      payload: { current: 123 },
      sourceUrl: "https://api.llama.fi/protocol/uniswap",
      lastDataAt: 1_719_158_400,
      status: "ok",
    });
    expect(isFresh(record)).toBe(true);
  });
});
