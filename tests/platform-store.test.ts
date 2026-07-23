import { describe, expect, it, vi } from "vitest"

describe("platform project store", () => {
  it("creates a fresh project with starter files", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.resetModules()
    const store = await import("../lib/platform/store")

    const project = await store.createProject({
      name: "Custom Analytics",
      description: "Protocol-owned analytics site",
    })

    expect(project.slug).toBe("custom-analytics")
    expect(project.status).toBe("draft")
    expect((await store.listProjectFiles(project.id)).map((file) => file.path)).toEqual([
      "app/page.tsx",
      "package.json",
    ])
  })

  it("normalizes and replaces source files", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.resetModules()
    const store = await import("../lib/platform/store")
    const project = await store.createProject({ name: "Source Replace Test" })

    const files = await store.replaceProjectFiles(project.id, [
      { path: "/app//page.tsx", content: "export default function Page() { return null }" },
      { path: "../README.md", content: "hello" },
    ])

    expect(files.map((file) => file.path)).toEqual(["app/page.tsx", "README.md"])
  })

  it("creates version snapshots when queueing builds", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.resetModules()
    const store = await import("../lib/platform/store")
    const project = await store.createProject({ name: "Build Queue Test" })

    const build = await store.queueBuild(project.id)
    const builds = await store.listBuilds(project.id)

    expect(build.status).toBe("queued")
    expect(build.logs).toContain("LlamaKit build worker")
    expect(builds[0].versionId).toBe(build.versionId)
  })

  it("deletes a project and its in-memory records", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.resetModules()
    const store = await import("../lib/platform/store")
    const project = await store.createProject({ name: "Delete Me" })

    expect(await store.deleteProject(project.slug)).toBe(true)
    expect(await store.getProjectBySlug(project.slug)).toBeUndefined()
    expect(await store.listProjectFiles(project.id)).toEqual([])
  })
})
