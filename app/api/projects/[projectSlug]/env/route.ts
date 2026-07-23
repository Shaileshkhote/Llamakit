import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  getOwnedProjectBySlug,
  listProjectEnvironmentVariables,
  upsertProjectEnvironmentVariable,
} from "@/lib/platform/store"
import type { EnvironmentContext, EnvironmentScope } from "@/types/platform"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ projectSlug: string }>
}

const contexts = new Set<EnvironmentContext>(["production", "preview", "development"])
const scopes = new Set<EnvironmentScope>(["build", "runtime"])

export async function GET(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  return NextResponse.json({ env: await listProjectEnvironmentVariables(project.id) })
}

export async function POST(request: Request, context: Params) {
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
  if (!key.trim()) return NextResponse.json({ error: "Key is required." }, { status: 400 })

  try {
    const item = await upsertProjectEnvironmentVariable({
      projectId: project.id,
      key,
      value,
      context: envContext,
      scope,
    })
    return NextResponse.json({ env: item }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save variable." }, { status: 400 })
  }
}
