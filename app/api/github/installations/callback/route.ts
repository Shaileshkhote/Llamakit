import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getAppRedirectUrl } from "@/lib/github/oauth"
import { syncGitHubInstallationRepositories } from "@/lib/github/sync"

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.redirect(getAppRedirectUrl(request, "/login"))
  const url = new URL(request.url)
  const installationId = Number(url.searchParams.get("installation_id"))
  if (!installationId) return NextResponse.redirect(getAppRedirectUrl(request, "/dashboard?github=missing_installation"))

  await syncGitHubInstallationRepositories({ userId: user.id, installationId })

  return NextResponse.redirect(getAppRedirectUrl(request, "/dashboard/new/github?installed=1"))
}
