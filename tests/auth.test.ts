import { describe, expect, it } from "vitest"
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "../lib/auth"

describe("auth helpers", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct horse battery staple")

    expect(hash).not.toBe("correct horse battery staple")
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true)
    expect(await verifyPassword("wrong password", hash)).toBe(false)
  })

  it("hashes opaque session tokens deterministically without storing the raw token", () => {
    const token = createSessionToken()
    const hash = hashSessionToken(token)

    expect(token).not.toBe(hash)
    expect(hash).toHaveLength(64)
    expect(hashSessionToken(token)).toBe(hash)
  })
})
