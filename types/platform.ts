export type ProjectFramework = "nextjs" | "vite" | "static"
export type ProjectStatus = "draft" | "ready" | "building" | "deployed" | "failed"
export type BuildStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled"
export type DeploymentStatus = "pending" | "deploying" | "active" | "failed"
export type DeploymentEnvironment = "preview" | "production"
export type DomainStatus = "pending" | "verifying" | "active" | "failed"
export type DomainType = "default" | "custom"
export type ClusterStatus = "planned" | "active" | "disabled"
export type SourceProvider = "manual" | "github"

export type Project = {
  id: string
  ownerUserId: string | null
  slug: string
  name: string
  description: string | null
  framework: ProjectFramework
  installCommand: string
  buildCommand: string
  startCommand: string
  rootDirectory: string
  productionBranch: string
  defaultDomain: string | null
  sourceProvider: SourceProvider
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
  branch: string | null
  commitSha: string | null
  createdAt: string
}

export type Build = {
  id: string
  projectId: string
  versionId: string
  status: BuildStatus
  imageRef: string | null
  branch: string | null
  commitSha: string | null
  logs: string
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Deployment = {
  id: string
  projectId: string
  versionId: string | null
  buildId: string | null
  environment: DeploymentEnvironment
  status: DeploymentStatus
  runtimeStatus: DeploymentStatus
  namespace: string
  serviceName: string
  imageRef: string | null
  previewUrl: string | null
  previewHostname: string | null
  branch: string | null
  commitSha: string | null
  deploymentNumber: number
  promotedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectEnvironmentAlias = {
  id: string
  projectId: string
  environment: "production"
  deploymentId: string | null
  hostname: string
  updatedAt: string
}

export type ProjectDomain = {
  id: string
  projectId: string
  hostname: string
  domainType: DomainType
  environment: "production"
  status: DomainStatus
  isPrimary: boolean
  verificationStatus: string | null
  dnsRecords: DnsRecord[]
  lastCheckedAt: string | null
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
  ownerUserId?: string | null
  name: string
  slug?: string
  description?: string | null
  framework?: ProjectFramework
  productionBranch?: string
  sourceProvider?: SourceProvider
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
  productionBranch: string
}>

export type GitHubInstallation = {
  id: string
  userId: string
  installationId: number
  accountLogin: string
  accountType: string | null
  createdAt: string
  updatedAt: string
}

export type GitHubRepository = {
  id: string
  installationId: number
  repositoryId: number
  ownerLogin: string
  name: string
  fullName: string
  defaultBranch: string
  private: boolean
  updatedAt: string
}

export type ProjectSourceConnection = {
  id: string
  projectId: string
  provider: "github"
  installationId: number
  repositoryId: number
  ownerLogin: string
  repoName: string
  fullName: string
  branch: string
  rootDirectory: string
  createdAt: string
  updatedAt: string
}

export type GitHubWebhookDelivery = {
  id: string
  deliveryId: string
  event: string
  action: string | null
  installationId: number | null
  repositoryId: number | null
  status: "accepted" | "ignored" | "rejected" | "processed" | "failed"
  statusMessage: string | null
  receivedAt: string
}
