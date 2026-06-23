import { describe, expect, it } from "vitest";
import { seedAnalyticsSites } from "../lib/seeds";

describe("seed analytics sites", () => {
  it("includes the initial protocol analytics sites", () => {
    expect(seedAnalyticsSites.map((site) => site.slug).sort()).toEqual(["aave", "lido", "uniswap"]);
  });

  it("keeps site ids, slugs, and metric sources unique", () => {
    const siteIds = new Set<string>();
    const slugs = new Set<string>();

    for (const site of seedAnalyticsSites) {
      expect(site.id).toMatch(/^site-[a-z0-9-]+$/);
      expect(site.ownerUserId).toBeNull();
      expect(site.slug).toMatch(/^[a-z0-9-]+$/);
      expect(siteIds.has(site.id)).toBe(false);
      expect(slugs.has(site.slug)).toBe(false);
      siteIds.add(site.id);
      slugs.add(site.slug);

      expect(site.displayName).toBeTruthy();
      expect(site.metricSources.tvlProtocol).toBe(site.slug);
      expect(site.metricSources.yieldProjects.length).toBeGreaterThan(0);
      expect(site.capabilities.tvl).toBe(true);
      expect(site.enabledModules.overview).toBe(true);
    }
  });

  it("maps protocol-specific DefiLlama sources", () => {
    const bySlug = new Map(seedAnalyticsSites.map((site) => [site.slug, site]));

    expect(bySlug.get("uniswap")?.metricSources).toMatchObject({
      tvlProtocol: "uniswap",
      feesProtocol: "uniswap",
      dexProtocol: "uniswap",
      priceId: "coingecko:uniswap",
    });
    expect(bySlug.get("aave")?.metricSources).toMatchObject({
      tvlProtocol: "aave",
      feesProtocol: "aave",
      dexProtocol: null,
      priceId: "coingecko:aave",
    });
    expect(bySlug.get("lido")?.metricSources).toMatchObject({
      tvlProtocol: "lido",
      feesProtocol: "lido",
      dexProtocol: null,
      priceId: "coingecko:lido-dao",
    });
  });
});
