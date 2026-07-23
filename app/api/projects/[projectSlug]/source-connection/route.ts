import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedProjectBySlug, getProjectSourceConnection } from "@/lib/platform/store"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ projectSlug: string }>
}

export async function GET(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  return NextResponse.json({ sourceConnection: await getProjectSourceConnection(project.id) })
}
