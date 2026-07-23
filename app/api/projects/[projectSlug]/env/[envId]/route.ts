import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  deleteProjectEnvironmentVariable,
  getOwnedProjectBySlug,
  upsertProjectEnvironmentVariable,
} from "@/lib/platform/store"
import type { EnvironmentContext, EnvironmentScope } from "@/types/platform"

type Params = {
  params: Promise<{ projectSlug: string; envId: string }>
}

const contexts = new Set<EnvironmentContext>(["production", "preview", "development"])
const scopes = new Set<EnvironmentScope>(["build", "runtime"])

export async function PATCH(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  const body = await request.json().catch(() => null)
  const key = typeof body?.key === "string" ? body.key : ""
  const value = typeof body?.value === "string" ? body.value : ""
  const envContext = contexts.has(body?.context) ? body.context : "production"
  const scope = scopes.has(body?.scope) ? body.scope : "runtime"
  const item = await upsertProjectEnvironmentVariable({ projectId: project.id, key, value, context: envContext, scope })
  return NextResponse.json({ env: item })
}

export async function DELETE(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug, envId } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  return NextResponse.json({ ok: await deleteProjectEnvironmentVariable(project.id, envId) })
}
