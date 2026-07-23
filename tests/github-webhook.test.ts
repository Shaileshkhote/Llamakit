import { createHmac } from "node:crypto"
import { describe, expect, it, vi } from "vitest"

describe("GitHub webhook verification", () => {
  it("verifies X-Hub-Signature-256 signatures", async () => {
    vi.stubEnv("GITHUB_WEBHOOK_SECRET", "secret")
    vi.resetModules()
    const { verifyGitHubWebhookSignature } = await import("../lib/github/app")
    const payload = JSON.stringify({ ok: true })
    const signature = `sha256=${createHmac("sha256", "secret").update(payload).digest("hex")}`

    expect(verifyGitHubWebhookSignature(payload, signature)).toBe(true)
    expect(verifyGitHubWebhookSignature(payload, "sha256=bad")).toBe(false)
  })
})
