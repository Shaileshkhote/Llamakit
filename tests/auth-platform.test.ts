import { describe, expect, it, vi } from "vitest"

describe("platform auth store", () => {
  it("creates users and session records", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.resetModules()
    const auth = await import("../lib/auth")
    const store = await import("../lib/platform/auth-store")

    const user = await store.createUser({
      email: "demo@example.com",
      name: "Demo",
      passwordHash: await auth.hashPassword("Demo@Test#123"),
    })
    const session = await auth.createSession(user.id)

    expect(await auth.verifyPassword("Demo@Test#123", user.passwordHash ?? "")).toBe(true)
    expect(await store.getUserSessionByTokenHash(auth.hashSessionToken(session.token))).toMatchObject({
      userId: user.id,
    })
  }, 10_000)
})
