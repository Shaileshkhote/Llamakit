import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedProjectBySlug, listBuilds, queueBuild } from "@/lib/platform/store"

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

  return NextResponse.json({ builds: await listBuilds(project.id) })
}

export async function POST(_request: Request, context: Params) {
  const user = await getCurrentUser(_request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  return NextResponse.json({ build: await queueBuild(project.id) }, { status: 202 })
}
