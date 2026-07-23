import { env } from "@/lib/env"

export function getAppUrl(request: Request) {
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export function requireGitHubOAuthEnv() {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error("GitHub OAuth is not configured.")
  }
  return {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  }
}

export async function exchangeGitHubCode(code: string, request: Request) {
  const { clientId, clientSecret } = requireGitHubOAuthEnv()
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${getAppUrl(request)}/api/auth/github/callback`,
    }),
  })
  const data = (await response.json()) as { access_token?: string; error_description?: string }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Could not exchange GitHub OAuth code.")
  }
  return data.access_token
}

export async function fetchGitHubUser(accessToken: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${accessToken}`,
      "x-github-api-version": "2022-11-28",
    },
  })
  if (!response.ok) throw new Error("Could not fetch GitHub user.")
  return (await response.json()) as {
    id: number
    login: string
    name?: string | null
    avatar_url?: string | null
    email?: string | null
  }
}

export async function fetchGitHubPrimaryEmail(accessToken: string) {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${accessToken}`,
      "x-github-api-version": "2022-11-28",
    },
  })
  if (!response.ok) return null
  const emails = (await response.json()) as Array<{ email: string; primary: boolean; verified: boolean }>
  return emails.find((email) => email.primary && email.verified)?.email ?? emails.find((email) => email.verified)?.email ?? null
}
