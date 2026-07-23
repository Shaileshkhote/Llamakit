import { describe, expect, it, vi } from "vitest"
import { detectProjectSetup } from "../lib/platform/detect"

describe("platform control plane additions", () => {
  it("detects Next.js project setup from imported files", () => {
    const setup = detectProjectSetup([
      {
        path: "package.json",
        content: JSON.stringify({
          packageManager: "pnpm@10.17.0",
          scripts: { build: "next build", start: "next start" },
          dependencies: { next: "16.0.0" },
        }),
      },
    ])

    expect(setup).toEqual({
      framework: "nextjs",
      installCommand: "pnpm install",
      buildCommand: "pnpm build",
      startCommand: "pnpm start",
    })
  })

  it("stores environment variables masked in the public project store API", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.stubEnv("ENV_ENCRYPTION_KEY", "test-key")
    vi.resetModules()
    const store = await import("../lib/platform/store")
    const project = await store.createProject({ name: "Env Test" })

    const saved = await store.upsertProjectEnvironmentVariable({
      projectId: project.id,
      key: "api-key",
      value: "super-secret-value",
      context: "production",
      scope: "runtime",
    })
    const listed = await store.listProjectEnvironmentVariables(project.id)
    const decrypted = await store.getDecryptedProjectEnvironment(project.id, "production")

    expect(saved.key).toBe("API_KEY")
    expect(listed[0].valuePreview).toBe("••••alue")
    expect("encryptedValue" in listed[0]).toBe(false)
    expect(decrypted.API_KEY).toBe("super-secret-value")
  })
})
