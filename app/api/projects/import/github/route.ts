import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { fetchRepositoryFiles } from "@/lib/github/app"
import { detectProjectSetup } from "@/lib/platform/detect"
import {
  createProject,
  createSourceConnection,
  listGitHubRepositories,
  patchProject,
  queueBuild,
  replaceProjectFiles,
} from "@/lib/platform/store"
import type { ProjectFramework } from "@/types/platform"

const frameworks = new Set<ProjectFramework>(["nextjs", "vite", "static"])

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const repositoryId = Number(body?.repositoryId)
  const repositories = await listGitHubRepositories(user.id)
  const repo = repositories.find((item) => item.repositoryId === repositoryId)
  if (!repo) return NextResponse.json({ error: "Repository is not available to this user." }, { status: 404 })

  const branch = String(body?.branch || repo.defaultBranch || "main")
  const rootDirectory = String(body?.rootDirectory || ".")
  const files = await fetchRepositoryFiles({
    installationId: repo.installationId,
    owner: repo.ownerLogin,
    repo: repo.name,
    branch,
    rootDirectory,
  })
  if (!files.length) return NextResponse.json({ error: "No importable files found in repository." }, { status: 400 })
  const detected = detectProjectSetup(files)
  const framework = frameworks.has(body?.framework) ? body.framework : detected.framework

  const project = await createProject({
    ownerUserId: user.id,
    name: String(body?.name || repo.name),
    slug: String(body?.slug || repo.name),
    description: `Imported from ${repo.fullName}`,
    framework,
    productionBranch: branch,
    sourceProvider: "github",
  })
  await replaceProjectFiles(project.id, files)
  const configuredProject = await patchProject(project.slug, {
    framework,
    installCommand:
      typeof body?.installCommand === "string" && body.installCommand.trim()
        ? body.installCommand.trim()
        : detected.installCommand,
    buildCommand:
      typeof body?.buildCommand === "string" && body.buildCommand.trim()
        ? body.buildCommand.trim()
        : detected.buildCommand,
    startCommand:
      typeof body?.startCommand === "string" && body.startCommand.trim()
        ? body.startCommand.trim()
        : detected.startCommand,
    rootDirectory,
    productionBranch: branch,
  })
  await createSourceConnection({
    projectId: project.id,
    provider: "github",
    installationId: repo.installationId,
    repositoryId: repo.repositoryId,
    ownerLogin: repo.ownerLogin,
    repoName: repo.name,
    fullName: repo.fullName,
    branch,
    rootDirectory,
  })
  const build = await queueBuild(project.id, { branch })
  return NextResponse.json({ project: configuredProject ?? project, build, detected }, { status: 201 })
}
