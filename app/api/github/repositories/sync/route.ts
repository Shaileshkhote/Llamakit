import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { syncGitHubInstallationRepositories } from "@/lib/github/sync"
import { listGitHubInstallations, listGitHubRepositories } from "@/lib/platform/store"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const installations = await listGitHubInstallations(user.id)
  let synced = 0
  for (const installation of installations) {
    synced += await syncGitHubInstallationRepositories({
      userId: user.id,
      installationId: installation.installationId,
    })
  }

  return NextResponse.json({
    synced,
    repositories: await listGitHubRepositories(user.id),
  })
}
