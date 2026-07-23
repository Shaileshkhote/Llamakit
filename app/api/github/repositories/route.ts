import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { listGitHubRepositories } from "@/lib/platform/store"

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ repositories: await listGitHubRepositories(user.id) })
}
