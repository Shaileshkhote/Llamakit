import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createDeployment, getOwnedProjectBySlug, listBuilds, listDeployments } from "@/lib/platform/store"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ projectSlug: string }>
}

export async function GET(_request: Request, context: Params) {
  const user = await getCurrentUser(_request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  return NextResponse.json({ deployments: await listDeployments(project.id) })
}

export async function POST(_request: Request, context: Params) {
  const user = await getCurrentUser(_request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  const build = (await listBuilds(project.id))[0]
  if (!build || build.status === "failed" || build.status === "cancelled") {
    return NextResponse.json({ error: "A successful or queued build is required before deployment." }, { status: 400 })
  }
  return NextResponse.json({ deployment: await createDeployment(project, build) }, { status: 201 })
}
