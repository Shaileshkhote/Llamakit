import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createProject, createProjectPrompt } from "@/lib/platform/store"
import type { ProjectFramework } from "@/types/platform"

export const dynamic = "force-dynamic"

const frameworks = new Set<ProjectFramework>(["nextjs", "vite", "static"])

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "AI analytics project"
  const framework = frameworks.has(body?.framework) ? body.framework : "nextjs"

  if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 })

  const project = await createProject({
    ownerUserId: user.id,
    name,
    slug: typeof body?.slug === "string" ? body.slug : undefined,
    description: "Draft created from an AI project prompt.",
    framework,
    sourceProvider: "manual",
  })
  const projectPrompt = await createProjectPrompt(project.id, prompt)

  return NextResponse.json({ project, prompt: projectPrompt, comingSoon: true }, { status: 201 })
}
