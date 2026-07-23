import { describe, expect, it, vi } from "vitest"

describe("deployment versioning and domains", () => {
  it("creates a default domain and promotes production branch deployments", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "llamakit.test")
    vi.resetModules()
    const store = await import("../lib/platform/store")

    const project = await store.createProject({
      ownerUserId: "user-1",
      name: "Acme Analytics",
      productionBranch: "main",
    })
    const build = await store.queueBuild(project.id, { branch: "main", commitSha: "abcdef123456" })
    const deployment = await store.createDeployment(project, build)
    const alias = await store.getProductionAlias(project.id)
    const domains = await store.listProjectDomains(project.id)

    expect(deployment.previewHostname).toContain("acme-analytics-git-main-abcdef12")
    expect(alias?.deploymentId).toBe(deployment.id)
    expect(domains.find((domain) => domain.domainType === "default")).toMatchObject({
      hostname: "acme-analytics.llamakit.test",
      status: "active",
    })
  })

  it("allows custom domains while preserving the default domain", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "llamakit.test")
    vi.resetModules()
    const store = await import("../lib/platform/store")

    const project = await store.createProject({ ownerUserId: "user-1", name: "Domain Test" })
    await store.addCustomDomain(project, "analytics.example.com")
    expect(await store.deleteCustomDomain(project.id, project.defaultDomain ?? "")).toBe(false)
    expect((await store.listProjectDomains(project.id)).map((domain) => domain.hostname)).toContain(
      "domain-test.llamakit.test",
    )
  })
})
