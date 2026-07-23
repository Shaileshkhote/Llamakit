import { NextResponse } from "next/server"
import { createSession, hashPassword, normalizeEmail, publicUser, setSessionCookie } from "@/lib/auth"
import { createUser, getUserByEmail } from "@/lib/platform/auth-store"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = normalizeEmail(String(body?.email || ""))
  const password = String(body?.password || "")
  const name = String(body?.name || "").trim() || email.split("@")[0]

  if (!email || password.length < 8) {
    return NextResponse.json({ error: "Email and an 8+ character password are required." }, { status: 400 })
  }
  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 })
  }

  const user = await createUser({ email, name, passwordHash: await hashPassword(password) })
  const session = await createSession(user.id)
  const response = NextResponse.json({ user: publicUser(user) }, { status: 201 })
  setSessionCookie(response, session.token, session.expiresAt, request)
  return response
}
