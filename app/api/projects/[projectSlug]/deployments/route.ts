import { NextResponse } from "next/server"
import { getProjectBySlug } from "@/lib/platform/store"

export const dynamic = "force-dynamic"

type Params = {
  params: Promise<{ projectSlug: string }>
}

export async function GET(_request: Request, context: Params) {
  const { projectSlug } = await context.params
  const project = await getProjectBySlug(projectSlug)

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  return NextResponse.json({ deployments: [] })
}

export async function POST(_request: Request, context: Params) {
  const { projectSlug } = await context.params
  const project = await getProjectBySlug(projectSlug)

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 })
  }

  return NextResponse.json(
    {
      error: "Kubernetes deployer is not connected yet.",
      next: "Wire image builds, registry push, namespace/service creation, ingress, and domain verification.",
    },
    { status: 501 },
  )
}
