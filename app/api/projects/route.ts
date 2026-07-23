import { NextResponse } from "next/server"
import { createProject, listProjects } from "@/lib/platform/store"
import type { ProjectFramework } from "@/types/platform"

export const dynamic = "force-dynamic"

const frameworks = new Set<ProjectFramework>(["nextjs", "vite", "static"])

export async function GET() {
  return NextResponse.json({ projects: await listProjects() })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 })
  }

  const framework = frameworks.has(body?.framework) ? body.framework : "nextjs"

  try {
    const project = await createProject({
      name,
      slug: typeof body?.slug === "string" ? body.slug : undefined,
      description: typeof body?.description === "string" ? body.description : null,
      framework,
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Could not create project." }, { status: 500 })
  }
}
