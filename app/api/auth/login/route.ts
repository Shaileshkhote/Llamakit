import { NextResponse } from "next/server"
import { createSession, normalizeEmail, publicUser, setSessionCookie, verifyPassword } from "@/lib/auth"
import { getUserByEmail } from "@/lib/platform/auth-store"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = normalizeEmail(String(body?.email || ""))
  const password = String(body?.password || "")
  const user = email ? await getUserByEmail(email) : undefined

  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
  }

  const session = await createSession(user.id)
  const response = NextResponse.json({ user: publicUser(user) })
  setSessionCookie(response, session.token, session.expiresAt, request)
  return response
}
