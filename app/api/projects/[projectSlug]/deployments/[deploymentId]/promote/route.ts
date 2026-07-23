import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedProjectBySlug, promoteDeployment } from "@/lib/platform/store"

type Params = {
  params: Promise<{ projectSlug: string; deploymentId: string }>
}

export async function POST(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug, deploymentId } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  const alias = await promoteDeployment(project, deploymentId)
  if (!alias) return NextResponse.json({ error: "Deployment cannot be promoted." }, { status: 400 })
  return NextResponse.json({ alias })
}
