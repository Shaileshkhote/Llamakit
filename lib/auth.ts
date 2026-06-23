import { createHash, randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import type { NextResponse } from "next/server"
import { createUserSession, deleteUserSession, getUserById, getUserSessionByTokenHash } from "@/lib/tenancy/store"
import type { User } from "@/types/auth"

export const SESSION_COOKIE_NAME = "llamakit_session"
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url")
}

export async function createSession(userId: string) {
  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
  await createUserSession({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  })
  return { token, expiresAt }
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: string, request?: Request) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    expires: new Date(expiresAt),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
  })
}

export function clearSessionCookie(response: NextResponse, request?: Request) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
  })
}

function shouldUseSecureCookies(request?: Request) {
  if (!request) return false
  return new URL(request.url).protocol === "https:"
}

export function getSessionToken(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1)
  return cookie ? decodeURIComponent(cookie) : null
}

export async function getCurrentUser(request: Request): Promise<User | null> {
  const token = getSessionToken(request)
  if (!token) return null

  const session = await getUserSessionByTokenHash(hashSessionToken(token))
  if (!session) return null

  return (await getUserById(session.userId)) ?? null
}

export async function destroyCurrentSession(request: Request) {
  const token = getSessionToken(request)
  if (!token) return
  await deleteUserSession(hashSessionToken(token))
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
