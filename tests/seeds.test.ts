import { describe, expect, it } from "vitest";
import { seedTenants } from "../lib/seeds";

describe("seed tenants", () => {
  it("includes the initial protocol tenants", () => {
    expect(seedTenants.map((tenant) => tenant.slug).sort()).toEqual(["aave", "lido", "uniswap"]);
  });

  it("keeps tenant ids, slugs, and metric sources unique", () => {
    const tenantIds = new Set<string>();
    const slugs = new Set<string>();

    for (const tenant of seedTenants) {
      expect(tenant.id).toMatch(/^tenant-[a-z0-9-]+$/);
      expect(tenant.slug).toMatch(/^[a-z0-9-]+$/);
      expect(tenantIds.has(tenant.id)).toBe(false);
      expect(slugs.has(tenant.slug)).toBe(false);
      tenantIds.add(tenant.id);
      slugs.add(tenant.slug);

      expect(tenant.displayName).toBeTruthy();
      expect(tenant.metricSources.tvlProtocol).toBe(tenant.slug);
      expect(tenant.metricSources.yieldProjects.length).toBeGreaterThan(0);
      expect(tenant.capabilities.tvl).toBe(true);
      expect(tenant.enabledModules.overview).toBe(true);
    }
  });

  it("maps protocol-specific DefiLlama sources", () => {
    const bySlug = new Map(seedTenants.map((tenant) => [tenant.slug, tenant]));

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
