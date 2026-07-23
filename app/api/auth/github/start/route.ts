import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getAppUrl, requireGitHubOAuthEnv } from "@/lib/github/oauth"

export async function GET(request: Request) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?error=github_not_configured", request.url))
  }
  const { clientId } = requireGitHubOAuthEnv()
  const url = new URL("https://github.com/login/oauth/authorize")
  const state = randomBytes(16).toString("base64url")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", `${getAppUrl(request)}/api/auth/github/callback`)
  url.searchParams.set("scope", "read:user user:email")
  url.searchParams.set("state", state)

  const response = NextResponse.redirect(url)
  response.cookies.set("llamakit_github_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    maxAge: 600,
    path: "/",
  })
  return response
}
