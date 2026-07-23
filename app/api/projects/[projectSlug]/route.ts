import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { deleteProject, getOwnedProjectBySlug, patchProject } from "@/lib/platform/store"
import type { ProjectFramework } from "@/types/platform"

export const dynamic = "force-dynamic"

const frameworks = new Set<ProjectFramework>(["nextjs", "vite", "static"])

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

  return NextResponse.json({ project })
}

export async function PATCH(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const existing = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  const body = await request.json().catch(() => null)
  const project = await patchProject(projectSlug, {
    name: typeof body?.name === "string" ? body.name.trim() : undefined,
    description:
      typeof body?.description === "string"
        ? body.description.trim() || null
        : body?.description === null
          ? null
          : undefined,
    installCommand: typeof body?.installCommand === "string" ? body.installCommand.trim() : undefined,
    buildCommand: typeof body?.buildCommand === "string" ? body.buildCommand.trim() : undefined,
    startCommand: typeof body?.startCommand === "string" ? body.startCommand.trim() : undefined,
    rootDirectory: typeof body?.rootDirectory === "string" ? body.rootDirectory.trim() : undefined,
    productionBranch: typeof body?.productionBranch === "string" ? body.productionBranch.trim() : undefined,
    framework: frameworks.has(body?.framework) ? body.framework : undefined,
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  return NextResponse.json({ project })
}

export async function DELETE(_request: Request, context: Params) {
  const user = await getCurrentUser(_request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const existing = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  const deleted = await deleteProject(projectSlug)

  if (!deleted) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
