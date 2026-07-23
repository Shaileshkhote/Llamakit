import { NextResponse } from "next/server"
import { createSession, normalizeEmail, setSessionCookie } from "@/lib/auth"
import { exchangeGitHubCode, fetchGitHubPrimaryEmail, fetchGitHubUser } from "@/lib/github/oauth"
import { createUser, getOAuthAccount, getUserByEmail, getUserById, upsertOAuthAccount } from "@/lib/platform/auth-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const expectedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("llamakit_github_oauth_state="))
    ?.split("=")[1]

  if (!code || !state || !expectedState || state !== decodeURIComponent(expectedState)) {
    return NextResponse.redirect(new URL("/login?error=invalid_github_state", request.url))
  }

  const accessToken = await exchangeGitHubCode(code, request)
  const githubUser = await fetchGitHubUser(accessToken)
  const email = normalizeEmail(githubUser.email || (await fetchGitHubPrimaryEmail(accessToken)) || `${githubUser.login}@users.noreply.github.com`)
  const existingAccount = await getOAuthAccount("github", String(githubUser.id))
  const user =
    (existingAccount ? await getUserById(existingAccount.userId) : undefined) ??
    (await getUserByEmail(email)) ??
    (await createUser({
      email,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url ?? null,
    }))

  await upsertOAuthAccount({
    userId: user.id,
    provider: "github",
    providerAccountId: String(githubUser.id),
    accessToken,
  })

  const session = await createSession(user.id)
  const response = NextResponse.redirect(new URL("/dashboard", request.url))
  response.cookies.delete("llamakit_github_oauth_state")
  setSessionCookie(response, session.token, session.expiresAt, request)
  return response
}
