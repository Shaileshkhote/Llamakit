import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedProjectBySlug, listProjectFiles, replaceProjectFiles } from "@/lib/platform/store"
import type { ProjectSourceFile } from "@/types/platform"

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

  return NextResponse.json({ files: await listProjectFiles(project.id) })
}

export async function PUT(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const files = Array.isArray(body?.files)
    ? body.files
        .filter((file: Partial<ProjectSourceFile>) => typeof file?.path === "string")
        .map((file: ProjectSourceFile) => ({
          path: file.path,
          content: typeof file.content === "string" ? file.content : "",
        }))
    : []

  if (!files.length) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 })
  }

  return NextResponse.json({ files: await replaceProjectFiles(project.id, files) })
}
