import { NextResponse } from "next/server"
import { createProjectVersion, getProjectBySlug } from "@/lib/platform/store"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ projectSlug: string }>
}

export async function POST(_request: Request, context: Params) {
  const { projectSlug } = await context.params
  const project = await getProjectBySlug(projectSlug)

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  return NextResponse.json({ version: await createProjectVersion(project.id) }, { status: 201 })
}
