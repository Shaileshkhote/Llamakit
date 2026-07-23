import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { deleteCustomDomain, getOwnedProjectBySlug, setPrimaryDomain } from "@/lib/platform/store"

type Params = {
  params: Promise<{ projectSlug: string; domain: string }>
}

export async function PATCH(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug, domain } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (body?.primary === true) {
    const updated = await setPrimaryDomain(project.id, decodeURIComponent(domain))
    if (!updated) return NextResponse.json({ error: "Only active domains can be primary." }, { status: 400 })
    return NextResponse.json({ domain: updated })
  }
  return NextResponse.json({ error: "Unsupported domain update." }, { status: 400 })
}

export async function DELETE(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug, domain } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  if (decodeURIComponent(domain) === project.defaultDomain) {
    return NextResponse.json({ error: "Default domain cannot be deleted." }, { status: 400 })
  }
  const deleted = await deleteCustomDomain(project.id, decodeURIComponent(domain))
  return NextResponse.json({ ok: deleted })
}
