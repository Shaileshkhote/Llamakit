import { describe, expect, it, vi } from "vitest"
import { EMPTY_CAPABILITIES } from "../types/metrics"
import type { AnalyticsSite } from "../types/site"

function site(slug: string, ownerUserId: string, published = false): AnalyticsSite {
  const now = new Date().toISOString()
  return {
    id: `site-test-${slug}`,
    ownerUserId,
    slug,
    displayName: slug,
    protocolDescription: `${slug} description`,
    logoUrl: null,
    websiteUrl: null,
    twitterUrl: null,
    primaryColor: "#111111",
    accentColor: "#222222",
    backgroundStyle: "light",
    metricSources: {
      tvlProtocol: slug,
      tvlProtocols: [slug],
      feesProtocol: slug,
      feesProtocols: [slug],
      dexProtocol: null,
      dexProtocols: [],
      optionsProtocol: null,
      optionsProtocols: [],
      yieldProjects: [slug],
      priceId: null,
      stablecoinAssetId: null,
      parentProtocol: null,
      childProtocols: [slug],
    },
    capabilities: { ...EMPTY_CAPABILITIES, tvl: true },
    enabledModules: {
      overview: true,
      performance: true,
      chains: true,
      economics: true,
      yields: true,
      methodology: true,
    },
    published,
    publishedAt: published ? now : null,
    createdAt: now,
    updatedAt: now,
  }
}

describe("analytics site store", () => {
  it("scopes owned site reads by owner", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.resetModules()
    const store = await import("../lib/tenancy/store")

    await store.upsertAnalyticsSite(site("owner-a-site", "user-a"))
    await store.upsertAnalyticsSite(site("owner-b-site", "user-b"))

    expect(await store.getOwnedAnalyticsSiteBySlug("owner-a-site", "user-a")).toMatchObject({
      slug: "owner-a-site",
    })
    expect(await store.getOwnedAnalyticsSiteBySlug("owner-a-site", "user-b")).toBeUndefined()
    expect((await store.getAnalyticsSitesByOwner("user-a")).map((item) => item.slug)).toContain(
      "owner-a-site",
    )
  })

  it("public explorer returns published sites without owner or source internals", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.resetModules()
    const store = await import("../lib/tenancy/store")

    await store.upsertAnalyticsSite(site("public-site", "user-a", true))
    await store.upsertAnalyticsSite(site("draft-site", "user-a", false))

    const result = await store.getPublishedPublicAnalyticsSites({ q: "public-site" })
    expect(result.sites.map((item) => item.slug)).toContain("public-site")
    expect(result.sites.map((item) => item.slug)).not.toContain("draft-site")
    expect(result.sites[0]).not.toHaveProperty("ownerUserId")
    expect(result.sites[0]).not.toHaveProperty("metricSources")
  })
})
