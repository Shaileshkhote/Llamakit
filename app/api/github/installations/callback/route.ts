import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { fetchInstallationRepositories } from "@/lib/github/app"
import { getAppRedirectUrl } from "@/lib/github/oauth"
import { upsertGitHubInstallation, upsertGitHubRepository } from "@/lib/platform/store"
import { randomUUID } from "node:crypto"

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.redirect(getAppRedirectUrl(request, "/login"))
  const url = new URL(request.url)
  const installationId = Number(url.searchParams.get("installation_id"))
  if (!installationId) return NextResponse.redirect(getAppRedirectUrl(request, "/dashboard?github=missing_installation"))

  const repos = await fetchInstallationRepositories(installationId)
  const first = repos[0]
  await upsertGitHubInstallation({
    userId: user.id,
    installationId,
    accountLogin: first?.owner.login ?? "github",
    accountType: null,
  })
  for (const repo of repos) {
    await upsertGitHubRepository({
      id: randomUUID(),
      installationId,
      repositoryId: repo.id,
      ownerLogin: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      private: repo.private,
      updatedAt: new Date().toISOString(),
    })
  }

  return NextResponse.redirect(getAppRedirectUrl(request, "/dashboard?github=installed"))
}
