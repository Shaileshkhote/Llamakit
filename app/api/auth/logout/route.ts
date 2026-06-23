import { NextResponse } from "next/server"
import { clearSessionCookie, destroyCurrentSession } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  await destroyCurrentSession(request)
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response, request)
  return response
}
