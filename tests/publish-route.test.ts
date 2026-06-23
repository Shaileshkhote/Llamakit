import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AnalyticsSite, AnalyticsSiteDomain } from "../types/site"

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getDomainsBySiteId: vi.fn(),
  getOwnedAnalyticsSiteBySlug: vi.fn(),
  patchAnalyticsSite: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock("@/lib/tenancy/store", () => ({
  getDomainsBySiteId: mocks.getDomainsBySiteId,
  getOwnedAnalyticsSiteBySlug: mocks.getOwnedAnalyticsSiteBySlug,
  patchAnalyticsSite: mocks.patchAnalyticsSite,
}))

const route = await import("../app/api/sites/[siteSlug]/publish/route")

const now = new Date().toISOString()
const site = {
  id: "site-morpho",
  ownerUserId: "user-1",
  slug: "morpho",
  displayName: "Morpho",
  published: false,
  updatedAt: now,
} as AnalyticsSite

function domain(status: AnalyticsSiteDomain["status"], type: AnalyticsSiteDomain["type"] = "custom") {
  return {
    id: `domain-${status}`,
    analyticsSiteId: site.id,
    hostname: "morpho.vibecrypto.fun",
    type,
    status,
    verificationData: null,
    createdAt: now,
    updatedAt: now,
  } satisfies AnalyticsSiteDomain
}

function request() {
  return new Request("http://localhost/api/sites/morpho/publish", { method: "POST" })
}

describe("publish route domain gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "owner@example.com", name: "Owner" })
    mocks.getOwnedAnalyticsSiteBySlug.mockResolvedValue(site)
    mocks.patchAnalyticsSite.mockResolvedValue({ ...site, published: true })
  })

  it("rejects deploy when no custom domain is active", async () => {
    mocks.getDomainsBySiteId.mockResolvedValue([domain("verifying"), domain("active", "subdomain")])

    const response = await route.POST(request(), { params: Promise.resolve({ siteSlug: "morpho" }) })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Verify an active custom domain before deploying.",
    })
    expect(mocks.patchAnalyticsSite).not.toHaveBeenCalled()
  })

  it("publishes when the site has an active custom domain", async () => {
    mocks.getDomainsBySiteId.mockResolvedValue([domain("active")])

    const response = await route.POST(request(), { params: Promise.resolve({ siteSlug: "morpho" }) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      site: { slug: "morpho", published: true },
    })
    expect(mocks.patchAnalyticsSite).toHaveBeenCalledWith("morpho", { published: true }, "user-1")
  })
})
