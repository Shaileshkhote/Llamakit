export type ProjectFramework = "nextjs" | "vite" | "static"
export type ProjectStatus = "draft" | "ready" | "building" | "deployed" | "failed"
export type BuildStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled"
export type DeploymentStatus = "pending" | "deploying" | "active" | "failed"
export type DomainStatus = "pending" | "verifying" | "active" | "failed"
export type ClusterStatus = "planned" | "active" | "disabled"

export type Project = {
  id: string
  slug: string
  name: string
  description: string | null
  framework: ProjectFramework
  installCommand: string
  buildCommand: string
  startCommand: string
  rootDirectory: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export type ProjectFile = {
  id: string
  projectId: string
  path: string
  content: string
  createdAt: string
  updatedAt: string
}

export type ProjectVersion = {
  id: string
  projectId: string
  versionNumber: number
  sourceSnapshot: ProjectSourceFile[]
  createdAt: string
}

export type Build = {
  id: string
  projectId: string
  versionId: string
  status: BuildStatus
  imageRef: string | null
  logs: string
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Deployment = {
  id: string
  projectId: string
  buildId: string | null
  status: DeploymentStatus
  namespace: string
  serviceName: string
  imageRef: string | null
  previewUrl: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectDomain = {
  id: string
  projectId: string
  hostname: string
  status: DomainStatus
  dnsRecords: DnsRecord[]
  createdAt: string
  updatedAt: string
}

export type DnsRecord = {
  type: "A" | "AAAA" | "CNAME" | "TXT"
  name: string
  value: string
}

export type ClusterTarget = {
  id: string
  name: string
  apiServer: string | null
  registryUrl: string | null
  ingressClass: string
  status: ClusterStatus
  createdAt: string
  updatedAt: string
}

export type ProjectSourceFile = {
  path: string
  content: string
}

export type CreateProjectInput = {
  name: string
  slug?: string
  description?: string | null
  framework?: ProjectFramework
}

export type UpdateProjectInput = Partial<{
  name: string
  description: string | null
  framework: ProjectFramework
  installCommand: string
  buildCommand: string
  startCommand: string
  rootDirectory: string
  status: ProjectStatus
}>
