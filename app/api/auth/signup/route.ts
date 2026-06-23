import { NextResponse } from "next/server"
import { z } from "zod"
import { createSession, hashPassword, normalizeEmail, publicUser, setSessionCookie } from "@/lib/auth"
import { createUser, getUserByEmail } from "@/lib/tenancy/store"

export const runtime = "nodejs"

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
})

export async function POST(request: Request) {
  const { isForm, body, next } = await readAuthBody(request)
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return authError(request, isForm, "Name, valid email, and 8+ character password are required", 400)
  }

  const email = normalizeEmail(parsed.data.email)
  const existing = await getUserByEmail(email)
  if (existing) {
    return authError(request, isForm, "An account with this email already exists", 409)
  }

  try {
    const user = await createUser({
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
    })
    const session = await createSession(user.id)
    const response = isForm
      ? NextResponse.redirect(new URL(next, request.url), 303)
      : NextResponse.json({ user: publicUser(user) }, { status: 201 })
    setSessionCookie(response, session.token, session.expiresAt, request)
    return response
  } catch (error) {
    return authError(request, isForm, (error as Error).message, 400)
  }
}

async function readAuthBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""
  const url = new URL(request.url)
  const nextParam = url.searchParams.get("next") || "/dashboard"
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard"
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    return { isForm: true, next, body: Object.fromEntries(await request.formData()) }
  }
  return { isForm: false, next, body: await request.json().catch(() => null) }
}

function authError(request: Request, isForm: boolean, error: string, status: number) {
  if (!isForm) return NextResponse.json({ error }, { status })
  const url = new URL("/signup", request.url)
  url.searchParams.set("next", new URL(request.url).searchParams.get("next") || "/dashboard")
  url.searchParams.set("error", error)
  return NextResponse.redirect(url, 303)
}
