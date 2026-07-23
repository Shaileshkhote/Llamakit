import type {
  Build,
  Deployment,
  GitHubRepository,
  Project,
  ProjectDomain,
  ProjectEnvironmentVariable,
  ProjectFile,
  ProjectFramework,
  ProjectSourceConnection,
} from "@/types/platform"

export type User = { id: string; email: string; name: string }
export type Payload<T> = T & { error?: string }

export const frameworks: { value: ProjectFramework; label: string }[] = [
  { value: "nextjs", label: "Next.js" },
  { value: "vite", label: "Vite" },
  { value: "static", label: "Static" },
]

export async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  })
  const data = (await response.json().catch(() => ({}))) as Payload<T>
  if (!response.ok) throw new Error(data.error || "Request failed.")
  return data
}

export type ProjectBundle = {
  project: Project
  files: ProjectFile[]
  builds: Build[]
  deployments: Deployment[]
  domains: ProjectDomain[]
  env: ProjectEnvironmentVariable[]
  sourceConnection: ProjectSourceConnection | null
}

export async function loadProjectBundle(slug: string): Promise<ProjectBundle> {
  const [projectData, filesData, buildData, deploymentData, domainData, envData, sourceData] =
    await Promise.all([
      requestJson<{ project: Project }>(`/api/projects/${slug}`),
      requestJson<{ files: ProjectFile[] }>(`/api/projects/${slug}/files`),
      requestJson<{ builds: Build[] }>(`/api/projects/${slug}/builds`),
      requestJson<{ deployments: Deployment[] }>(`/api/projects/${slug}/deployments`),
      requestJson<{ domains: ProjectDomain[] }>(`/api/projects/${slug}/domains`),
      requestJson<{ env: ProjectEnvironmentVariable[] }>(`/api/projects/${slug}/env`),
      requestJson<{ sourceConnection: ProjectSourceConnection | null }>(`/api/projects/${slug}/source-connection`),
    ])
  return {
    project: projectData.project,
    files: filesData.files,
    builds: buildData.builds,
    deployments: deploymentData.deployments,
    domains: domainData.domains,
    env: envData.env,
    sourceConnection: sourceData.sourceConnection,
  }
}

export async function loadRepositories(q = "") {
  const params = q ? `?q=${encodeURIComponent(q)}` : ""
  return requestJson<{ repositories: GitHubRepository[] }>(`/api/github/repositories${params}`)
}
