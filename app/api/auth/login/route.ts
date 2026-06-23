import { NextResponse } from "next/server"
import { z } from "zod"
import { createSession, normalizeEmail, publicUser, setSessionCookie, verifyPassword } from "@/lib/auth"
import { getUserByEmail } from "@/lib/tenancy/store"

export const runtime = "nodejs"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const { isForm, body, next } = await readAuthBody(request)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return authError(request, isForm, "Email and password are required", 400)
  }

  const user = await getUserByEmail(normalizeEmail(parsed.data.email))
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return authError(request, isForm, "Invalid email or password", 401)
  }

  const session = await createSession(user.id)
  const response = isForm
    ? NextResponse.redirect(new URL(next, request.url), 303)
    : NextResponse.json({ user: publicUser(user) })
  setSessionCookie(response, session.token, session.expiresAt, request)
  return response
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
  const url = new URL("/login", request.url)
  url.searchParams.set("next", new URL(request.url).searchParams.get("next") || "/dashboard")
  url.searchParams.set("error", error)
  return NextResponse.redirect(url, 303)
}
