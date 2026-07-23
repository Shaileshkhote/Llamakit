import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { listGitHubRepositories } from "@/lib/platform/store"

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const url = new URL(request.url)
  const q = url.searchParams.get("q")?.trim().toLowerCase()
  const installationId = Number(url.searchParams.get("installationId") || 0)
  const repositories = (await listGitHubRepositories(user.id)).filter((repo) => {
    if (installationId && repo.installationId !== installationId) return false
    if (q && !repo.fullName.toLowerCase().includes(q)) return false
    return true
  })
  return NextResponse.json({ repositories })
}
