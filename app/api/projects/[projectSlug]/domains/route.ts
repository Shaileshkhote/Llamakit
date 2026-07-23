import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { addCustomDomain, getOwnedProjectBySlug, listProjectDomains } from "@/lib/platform/store"

type Params = {
  params: Promise<{ projectSlug: string }>
}

export async function GET(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  return NextResponse.json({ domains: await listProjectDomains(project.id) })
}

export async function POST(request: Request, context: Params) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectSlug } = await context.params
  const project = await getOwnedProjectBySlug(projectSlug, user.id)
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })
  const body = await request.json().catch(() => null)
  const hostname = String(body?.hostname || "").trim().toLowerCase()
  if (!hostname.includes(".")) return NextResponse.json({ error: "A valid hostname is required." }, { status: 400 })
  return NextResponse.json({ domain: await addCustomDomain(project, hostname) }, { status: 201 })
}
