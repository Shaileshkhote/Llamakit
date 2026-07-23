import { randomUUID } from "node:crypto"
import { ensureDatabase, getPool, hasDatabase } from "@/lib/db"
import { env } from "@/lib/env"
import type {
  Build,
  CreateProjectInput,
  Deployment,
  GitHubInstallation,
  GitHubRepository,
  GitHubWebhookDelivery,
  Project,
  ProjectDomain,
  ProjectEnvironmentAlias,
  ProjectFile,
  ProjectFramework,
  ProjectSourceFile,
  ProjectSourceConnection,
  ProjectStatus,
  ProjectVersion,
  UpdateProjectInput,
} from "@/types/platform"

type ProjectRow = {
  id: string
  owner_user_id: string | null
  slug: string
  name: string
  description: string | null
  framework: ProjectFramework
  install_command: string
  build_command: string
  start_command: string
  root_directory: string
  production_branch: string
  default_domain: string | null
  source_provider: Project["sourceProvider"]
  status: ProjectStatus
  created_at: Date | string
  updated_at: Date | string
}

type ProjectFileRow = {
  id: string
  project_id: string
  path: string
  content: string
  created_at: Date | string
  updated_at: Date | string
}

type ProjectVersionRow = {
  id: string
  project_id: string
  version_number: number
  source_snapshot: ProjectSourceFile[] | string
  branch: string | null
  commit_sha: string | null
  created_at: Date | string
}

type BuildRow = {
  id: string
  project_id: string
  version_id: string
  status: Build["status"]
  image_ref: string | null
  branch: string | null
  commit_sha: string | null
  logs: string
  started_at: Date | string | null
  finished_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

type DeploymentRow = {
  id: string
  project_id: string
  version_id: string | null
  build_id: string | null
  environment: Deployment["environment"]
  status: Deployment["status"]
  runtime_status: Deployment["runtimeStatus"]
  namespace: string
  service_name: string
  image_ref: string | null
  preview_url: string | null
  preview_hostname: string | null
  branch: string | null
  commit_sha: string | null
  deployment_number: number
  promoted_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

type AliasRow = {
  id: string
  project_id: string
  environment: "production"
  deployment_id: string | null
  hostname: string
  updated_at: Date | string
}

type DomainRow = {
  id: string
  project_id: string
  hostname: string
  domain_type: ProjectDomain["domainType"]
  environment: "production"
  status: ProjectDomain["status"]
  is_primary: boolean
  verification_status: string | null
  dns_records: ProjectDomain["dnsRecords"] | string
  last_checked_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

type GitHubInstallationRow = {
  id: string
  user_id: string
  installation_id: string | number
  account_login: string
  account_type: string | null
  created_at: Date | string
  updated_at: Date | string
}

type GitHubRepositoryRow = {
  id: string
  installation_id: string | number
  repository_id: string | number
  owner_login: string
  name: string
  full_name: string
  default_branch: string
  private: boolean
  updated_at: Date | string
}

type SourceConnectionRow = {
  id: string
  project_id: string
  provider: "github"
  installation_id: string | number
  repository_id: string | number
  owner_login: string
  repo_name: string
  full_name: string
  branch: string
  root_directory: string
  created_at: Date | string
  updated_at: Date | string
}

type DeliveryRow = {
  id: string
  delivery_id: string
  event: string
  action: string | null
  installation_id: string | number | null
  repository_id: string | number | null
  status: GitHubWebhookDelivery["status"]
  status_message: string | null
  received_at: Date | string
}

const now = () => new Date().toISOString()

const memory = {
  projects: new Map<string, Project>(),
  files: new Map<string, ProjectFile[]>(),
  versions: new Map<string, ProjectVersion[]>(),
  builds: new Map<string, Build[]>(),
  deployments: new Map<string, Deployment[]>(),
  aliases: new Map<string, ProjectEnvironmentAlias>(),
  domains: new Map<string, ProjectDomain[]>(),
  installations: new Map<number, GitHubInstallation>(),
  repositories: new Map<number, GitHubRepository>(),
  sourceConnections: new Map<string, ProjectSourceConnection>(),
  deliveries: new Map<string, GitHubWebhookDelivery>(),
}

function iso(value: Date | string | null) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    framework: row.framework,
    installCommand: row.install_command,
    buildCommand: row.build_command,
    startCommand: row.start_command,
    rootDirectory: row.root_directory,
    productionBranch: row.production_branch ?? "main",
    defaultDomain: row.default_domain,
    sourceProvider: row.source_provider ?? "manual",
    status: row.status,
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function fileFromRow(row: ProjectFileRow): ProjectFile {
  return {
    id: row.id,
    projectId: row.project_id,
    path: row.path,
    content: row.content,
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function versionFromRow(row: ProjectVersionRow): ProjectVersion {
  return {
    id: row.id,
    projectId: row.project_id,
    versionNumber: row.version_number,
    sourceSnapshot:
      typeof row.source_snapshot === "string" ? JSON.parse(row.source_snapshot) : row.source_snapshot,
    branch: row.branch,
    commitSha: row.commit_sha,
    createdAt: iso(row.created_at) ?? now(),
  }
}

function buildFromRow(row: BuildRow): Build {
  return {
    id: row.id,
    projectId: row.project_id,
    versionId: row.version_id,
    status: row.status,
    imageRef: row.image_ref,
    branch: row.branch,
    commitSha: row.commit_sha,
    logs: row.logs,
    startedAt: iso(row.started_at),
    finishedAt: iso(row.finished_at),
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function deploymentFromRow(row: DeploymentRow): Deployment {
  return {
    id: row.id,
    projectId: row.project_id,
    versionId: row.version_id,
    buildId: row.build_id,
    environment: row.environment,
    status: row.status,
    runtimeStatus: row.runtime_status,
    namespace: row.namespace,
    serviceName: row.service_name,
    imageRef: row.image_ref,
    previewUrl: row.preview_url,
    previewHostname: row.preview_hostname,
    branch: row.branch,
    commitSha: row.commit_sha,
    deploymentNumber: row.deployment_number,
    promotedAt: iso(row.promoted_at),
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function aliasFromRow(row: AliasRow): ProjectEnvironmentAlias {
  return {
    id: row.id,
    projectId: row.project_id,
    environment: row.environment,
    deploymentId: row.deployment_id,
    hostname: row.hostname,
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function domainFromRow(row: DomainRow): ProjectDomain {
  return {
    id: row.id,
    projectId: row.project_id,
    hostname: row.hostname,
    domainType: row.domain_type,
    environment: row.environment,
    status: row.status,
    isPrimary: row.is_primary,
    verificationStatus: row.verification_status,
    dnsRecords: typeof row.dns_records === "string" ? JSON.parse(row.dns_records) : row.dns_records,
    lastCheckedAt: iso(row.last_checked_at),
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function githubInstallationFromRow(row: GitHubInstallationRow): GitHubInstallation {
  return {
    id: row.id,
    userId: row.user_id,
    installationId: Number(row.installation_id),
    accountLogin: row.account_login,
    accountType: row.account_type,
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function githubRepositoryFromRow(row: GitHubRepositoryRow): GitHubRepository {
  return {
    id: row.id,
    installationId: Number(row.installation_id),
    repositoryId: Number(row.repository_id),
    ownerLogin: row.owner_login,
    name: row.name,
    fullName: row.full_name,
    defaultBranch: row.default_branch,
    private: row.private,
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function sourceConnectionFromRow(row: SourceConnectionRow): ProjectSourceConnection {
  return {
    id: row.id,
    projectId: row.project_id,
    provider: row.provider,
    installationId: Number(row.installation_id),
    repositoryId: Number(row.repository_id),
    ownerLogin: row.owner_login,
    repoName: row.repo_name,
    fullName: row.full_name,
    branch: row.branch,
    rootDirectory: row.root_directory,
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
  }
}

function deliveryFromRow(row: DeliveryRow): GitHubWebhookDelivery {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    event: row.event,
    action: row.action,
    installationId: row.installation_id === null ? null : Number(row.installation_id),
    repositoryId: row.repository_id === null ? null : Number(row.repository_id),
    status: row.status,
    statusMessage: row.status_message,
    receivedAt: iso(row.received_at) ?? now(),
  }
}

async function withDatabase<T>(operation: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (!hasDatabase()) return fallback()

  try {
    await ensureDatabase()
    return await operation()
  } catch (error) {
    console.warn("Falling back to in-memory platform store", error)
    return fallback()
  }
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return slug || `project-${randomUUID().slice(0, 8)}`
}

export function defaultDomainForSlug(slug: string) {
  return `${slug}.${env.NEXT_PUBLIC_ROOT_DOMAIN}`.toLowerCase()
}

export function previewHostnameFor(project: Project, branch?: string | null, commitSha?: string | null) {
  const branchPart = slugify(branch || "preview").slice(0, 32)
  const shaPart = commitSha ? commitSha.slice(0, 8).toLowerCase() : randomUUID().slice(0, 8)
  return `${project.slug}-git-${branchPart}-${shaPart}.${env.NEXT_PUBLIC_ROOT_DOMAIN}`.toLowerCase()
}

export function normalizeFilePath(value: string) {
  const normalized = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\.\.(\/|$)/g, "")
    .slice(0, 240)

  return normalized || "README.md"
}

function starterFiles(project: Project): ProjectSourceFile[] {
  return [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
          },
          dependencies: {
            "@types/node": "latest",
            "@types/react": "latest",
            "@types/react-dom": "latest",
            next: "latest",
            react: "latest",
            "react-dom": "latest",
            typescript: "latest",
          },
          devDependencies: {},
        },
        null,
        2,
      ),
    },
    {
      path: "app/page.tsx",
      content: `export default function Page() {
  return (
    <main style={{ minHeight: "100vh", padding: 48, fontFamily: "Inter, system-ui, sans-serif" }}>
      <p style={{ color: "#666", margin: 0 }}>LlamaKit project</p>
      <h1 style={{ fontSize: 56, letterSpacing: 0, margin: "12px 0" }}>${project.name}</h1>
      <p style={{ maxWidth: 620, lineHeight: 1.6 }}>
        ${project.description ?? "Start coding your custom analytics experience here."}
      </p>
    </main>
  )
}
`,
    },
  ]
}

export async function listProjects(ownerUserId?: string | null) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return []
      const result = ownerUserId
        ? await pool.query<ProjectRow>(
            "select * from projects where owner_user_id = $1 order by updated_at desc limit 100",
            [ownerUserId],
          )
        : await pool.query<ProjectRow>("select * from projects order by updated_at desc limit 100")
      return result.rows.map(projectFromRow)
    },
    () =>
      [...memory.projects.values()]
        .filter((project) => !ownerUserId || project.ownerUserId === ownerUserId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )
}

export async function getProjectBySlug(slug: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const result = await pool.query<ProjectRow>("select * from projects where slug = $1 limit 1", [
        slug,
      ])
      return result.rows[0] ? projectFromRow(result.rows[0]) : undefined
    },
    () => [...memory.projects.values()].find((project) => project.slug === slug),
  )
}

export async function getProjectById(id: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const result = await pool.query<ProjectRow>("select * from projects where id = $1 limit 1", [id])
      return result.rows[0] ? projectFromRow(result.rows[0]) : undefined
    },
    () => memory.projects.get(id),
  )
}

export async function getOwnedProjectBySlug(slug: string, ownerUserId: string) {
  const project = await getProjectBySlug(slug)
  return project?.ownerUserId === ownerUserId ? project : undefined
}

export async function createProject(input: CreateProjectInput) {
  const timestamp = now()
  const slug = slugify(input.slug || input.name)
  const project: Project = {
    id: randomUUID(),
    ownerUserId: input.ownerUserId ?? null,
    slug,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    framework: input.framework ?? "nextjs",
    installCommand: "pnpm install",
    buildCommand: "pnpm build",
    startCommand: "pnpm start",
    rootDirectory: ".",
    productionBranch: input.productionBranch || "main",
    defaultDomain: defaultDomainForSlug(slug),
    sourceProvider: input.sourceProvider ?? "manual",
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return project
      const result = await pool.query<ProjectRow>(
        `insert into projects (
          id, owner_user_id, slug, name, description, framework, install_command, build_command,
          start_command, root_directory, production_branch, default_domain, source_provider,
          status, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        returning *`,
        [
          project.id,
          project.ownerUserId,
          project.slug,
          project.name,
          project.description,
          project.framework,
          project.installCommand,
          project.buildCommand,
          project.startCommand,
          project.rootDirectory,
          project.productionBranch,
          project.defaultDomain,
          project.sourceProvider,
          project.status,
          project.createdAt,
          project.updatedAt,
        ],
      )
      const created = projectFromRow(result.rows[0])
      await replaceProjectFiles(created.id, starterFiles(created))
      await ensureDefaultDomain(created)
      return created
    },
    () => {
      memory.projects.set(project.id, project)
      memory.files.set(
        project.id,
        starterFiles(project).map((file) => ({
          id: randomUUID(),
          projectId: project.id,
          path: normalizeFilePath(file.path),
          content: file.content,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      )
      void ensureDefaultDomain(project)
      return project
    },
  )
}

export async function patchProject(slug: string, input: UpdateProjectInput) {
  const project = await getProjectBySlug(slug)
  if (!project) return undefined

  const next: Project = {
    ...project,
    ...input,
    description: input.description === undefined ? project.description : input.description,
    productionBranch: input.productionBranch ?? project.productionBranch,
    updatedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return next
      const result = await pool.query<ProjectRow>(
        `update projects set
          name = $2,
          description = $3,
          framework = $4,
          install_command = $5,
          build_command = $6,
          start_command = $7,
          root_directory = $8,
          production_branch = $9,
          status = $10,
          updated_at = $11
        where slug = $1
        returning *`,
        [
          slug,
          next.name,
          next.description,
          next.framework,
          next.installCommand,
          next.buildCommand,
          next.startCommand,
          next.rootDirectory,
          next.productionBranch,
          next.status,
          next.updatedAt,
        ],
      )
      return result.rows[0] ? projectFromRow(result.rows[0]) : undefined
    },
    () => {
      memory.projects.set(project.id, next)
      return next
    },
  )
}

export async function deleteProject(slug: string) {
  const project = await getProjectBySlug(slug)
  if (!project) return false

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return false
      const result = await pool.query("delete from projects where slug = $1", [slug])
      return (result.rowCount ?? 0) > 0
    },
    () => {
      memory.projects.delete(project.id)
      memory.files.delete(project.id)
      memory.versions.delete(project.id)
      memory.builds.delete(project.id)
      return true
    },
  )
}

export async function listProjectFiles(projectId: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return []
      const result = await pool.query<ProjectFileRow>(
        "select * from project_files where project_id = $1 order by path asc",
        [projectId],
      )
      return result.rows.map(fileFromRow)
    },
    () => [...(memory.files.get(projectId) ?? [])].sort((a, b) => a.path.localeCompare(b.path)),
  )
}

export async function replaceProjectFiles(projectId: string, files: ProjectSourceFile[]) {
  const timestamp = now()
  const normalized = files.map((file) => ({
    id: randomUUID(),
    projectId,
    path: normalizeFilePath(file.path),
    content: file.content,
    createdAt: timestamp,
    updatedAt: timestamp,
  }))

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return normalized
      const client = await pool.connect()
      try {
        await client.query("begin")
        await client.query("delete from project_files where project_id = $1", [projectId])
        for (const file of normalized) {
          await client.query(
            `insert into project_files (id, project_id, path, content, created_at, updated_at)
             values ($1, $2, $3, $4, $5, $6)`,
            [file.id, file.projectId, file.path, file.content, file.createdAt, file.updatedAt],
          )
        }
        await client.query("commit")
        return normalized
      } catch (error) {
        await client.query("rollback")
        throw error
      } finally {
        client.release()
      }
    },
    () => {
      memory.files.set(projectId, normalized)
      return normalized
    },
  )
}

export async function createProjectVersion(
  projectId: string,
  options: { branch?: string | null; commitSha?: string | null } = {},
) {
  const files = await listProjectFiles(projectId)
  const sourceSnapshot = files.map(({ path, content }) => ({ path, content }))

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) {
        return createMemoryVersion(projectId, sourceSnapshot)
      }
      const latest = await pool.query<{ max: number | null }>(
        "select max(version_number)::int as max from project_versions where project_id = $1",
        [projectId],
      )
      const versionNumber = (latest.rows[0]?.max ?? 0) + 1
      const result = await pool.query<ProjectVersionRow>(
        `insert into project_versions (id, project_id, version_number, source_snapshot, branch, commit_sha)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [
          randomUUID(),
          projectId,
          versionNumber,
          JSON.stringify(sourceSnapshot),
          options.branch ?? null,
          options.commitSha ?? null,
        ],
      )
      return versionFromRow(result.rows[0])
    },
    () => createMemoryVersion(projectId, sourceSnapshot, options),
  )
}

function createMemoryVersion(
  projectId: string,
  sourceSnapshot: ProjectSourceFile[],
  options: { branch?: string | null; commitSha?: string | null } = {},
) {
  const versions = memory.versions.get(projectId) ?? []
  const version: ProjectVersion = {
    id: randomUUID(),
    projectId,
    versionNumber: versions.length + 1,
    sourceSnapshot,
    branch: options.branch ?? null,
    commitSha: options.commitSha ?? null,
    createdAt: now(),
  }
  memory.versions.set(projectId, [version, ...versions])
  return version
}

export async function listBuilds(projectId: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return []
      const result = await pool.query<BuildRow>(
        "select * from builds where project_id = $1 order by created_at desc limit 30",
        [projectId],
      )
      return result.rows.map(buildFromRow)
    },
    () => memory.builds.get(projectId) ?? [],
  )
}

export async function queueBuild(
  projectId: string,
  options: { branch?: string | null; commitSha?: string | null; versionId?: string } = {},
) {
  const version =
    options.versionId
      ? { id: options.versionId, branch: options.branch ?? null, commitSha: options.commitSha ?? null }
      : await createProjectVersion(projectId, options)
  const build: Build = {
    id: randomUUID(),
    projectId,
    versionId: version.id,
    status: "queued",
    imageRef: null,
    branch: version.branch,
    commitSha: version.commitSha,
    logs: "Build queued. Waiting for the LlamaKit build worker.",
    startedAt: null,
    finishedAt: null,
    createdAt: now(),
    updatedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return build
      const result = await pool.query<BuildRow>(
        `insert into builds (
          id, project_id, version_id, status, image_ref, branch, commit_sha, logs,
          started_at, finished_at, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        returning *`,
        [
          build.id,
          build.projectId,
          build.versionId,
          build.status,
          build.imageRef,
          build.branch,
          build.commitSha,
          build.logs,
          build.startedAt,
          build.finishedAt,
          build.createdAt,
          build.updatedAt,
        ],
      )
      return buildFromRow(result.rows[0])
    },
    () => {
      const builds = memory.builds.get(projectId) ?? []
      memory.builds.set(projectId, [build, ...builds])
      return build
    },
  )
}

export async function listDeployments(projectId: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return []
      const result = await pool.query<DeploymentRow>(
        "select * from deployments where project_id = $1 order by created_at desc limit 50",
        [projectId],
      )
      return result.rows.map(deploymentFromRow)
    },
    () => memory.deployments.get(projectId) ?? [],
  )
}

export async function createDeployment(
  project: Project,
  build: Build,
  options: { status?: Deployment["status"]; imageRef?: string | null } = {},
) {
  const deployments = await listDeployments(project.id)
  const deploymentNumber = deployments.length + 1
  const previewHostname = previewHostnameFor(project, build.branch, build.commitSha)
  const deployment: Deployment = {
    id: randomUUID(),
    projectId: project.id,
    versionId: build.versionId,
    buildId: build.id,
    environment: "preview",
    status: options.status ?? "active",
    runtimeStatus: options.status ?? "active",
    namespace: "llamakit-projects",
    serviceName: `project-${project.slug}-${deploymentNumber}`,
    imageRef: options.imageRef ?? build.imageRef ?? `localhost:5000/${project.slug}:${build.commitSha ?? build.id}`,
    previewUrl: `https://${previewHostname}`,
    previewHostname,
    branch: build.branch,
    commitSha: build.commitSha,
    deploymentNumber,
    promotedAt: null,
    createdAt: now(),
    updatedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return deployment
      const result = await pool.query<DeploymentRow>(
        `insert into deployments (
          id, project_id, version_id, build_id, environment, status, runtime_status, namespace,
          service_name, image_ref, preview_url, preview_hostname, branch, commit_sha, deployment_number,
          promoted_at, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        returning *`,
        [
          deployment.id,
          deployment.projectId,
          deployment.versionId,
          deployment.buildId,
          deployment.environment,
          deployment.status,
          deployment.runtimeStatus,
          deployment.namespace,
          deployment.serviceName,
          deployment.imageRef,
          deployment.previewUrl,
          deployment.previewHostname,
          deployment.branch,
          deployment.commitSha,
          deployment.deploymentNumber,
          deployment.promotedAt,
          deployment.createdAt,
          deployment.updatedAt,
        ],
      )
      const created = deploymentFromRow(result.rows[0])
      if (created.branch === project.productionBranch && created.status === "active") {
        await promoteDeployment(project, created.id)
      }
      return created
    },
    async () => {
      memory.deployments.set(project.id, [deployment, ...deployments])
      if (deployment.branch === project.productionBranch && deployment.status === "active") {
        await promoteDeployment(project, deployment.id)
      }
      return deployment
    },
  )
}

export async function getProductionAlias(projectId: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const result = await pool.query<AliasRow>(
        "select * from project_environment_aliases where project_id = $1 and environment = 'production' limit 1",
        [projectId],
      )
      return result.rows[0] ? aliasFromRow(result.rows[0]) : undefined
    },
    () => memory.aliases.get(projectId),
  )
}

export async function promoteDeployment(project: Project, deploymentId: string) {
  const deployment = (await listDeployments(project.id)).find((item) => item.id === deploymentId)
  if (!deployment || deployment.status !== "active") return undefined

  const promotedAt = now()
  const alias: ProjectEnvironmentAlias = {
    id: randomUUID(),
    projectId: project.id,
    environment: "production",
    deploymentId,
    hostname: project.defaultDomain ?? defaultDomainForSlug(project.slug),
    updatedAt: promotedAt,
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return alias
      const client = await pool.connect()
      try {
        await client.query("begin")
        await client.query(
          `update deployments set environment = 'production', promoted_at = $2, updated_at = $2 where id = $1`,
          [deploymentId, promotedAt],
        )
        const result = await client.query<AliasRow>(
          `insert into project_environment_aliases (id, project_id, environment, deployment_id, hostname, updated_at)
           values ($1, $2, 'production', $3, $4, $5)
           on conflict (project_id, environment) do update set
             deployment_id = excluded.deployment_id,
             hostname = excluded.hostname,
             updated_at = excluded.updated_at
           returning *`,
          [alias.id, project.id, deploymentId, alias.hostname, alias.updatedAt],
        )
        await client.query("commit")
        await markDefaultDomainActive(project)
        return aliasFromRow(result.rows[0])
      } catch (error) {
        await client.query("rollback")
        throw error
      } finally {
        client.release()
      }
    },
    async () => {
      memory.aliases.set(project.id, alias)
      memory.deployments.set(
        project.id,
        (memory.deployments.get(project.id) ?? []).map((item) =>
          item.id === deploymentId
            ? { ...item, environment: "production", promotedAt, updatedAt: promotedAt }
            : item,
        ),
      )
      await markDefaultDomainActive(project)
      return alias
    },
  )
}

export async function listProjectDomains(projectId: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return []
      const result = await pool.query<DomainRow>(
        "select * from project_domains where project_id = $1 order by domain_type asc, created_at asc",
        [projectId],
      )
      return result.rows.map(domainFromRow)
    },
    () => memory.domains.get(projectId) ?? [],
  )
}

export async function ensureDefaultDomain(project: Project) {
  const hostname = project.defaultDomain ?? defaultDomainForSlug(project.slug)
  const domain: ProjectDomain = {
    id: randomUUID(),
    projectId: project.id,
    hostname,
    domainType: "default",
    environment: "production",
    status: "pending",
    isPrimary: true,
    verificationStatus: null,
    dnsRecords: [],
    lastCheckedAt: null,
    createdAt: now(),
    updatedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return domain
      const result = await pool.query<DomainRow>(
        `insert into project_domains (
          id, project_id, hostname, domain_type, environment, status, is_primary, dns_records, created_at, updated_at
        ) values ($1,$2,$3,'default','production',$4,true,'[]',$5,$6)
        on conflict (hostname) do update set updated_at = excluded.updated_at
        returning *`,
        [domain.id, project.id, hostname, domain.status, domain.createdAt, domain.updatedAt],
      )
      return domainFromRow(result.rows[0])
    },
    () => {
      const domains = memory.domains.get(project.id) ?? []
      if (!domains.some((item) => item.hostname === hostname)) {
        memory.domains.set(project.id, [domain, ...domains])
      }
      return domain
    },
  )
}

export async function markDefaultDomainActive(project: Project) {
  await ensureDefaultDomain(project)
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const result = await pool.query<DomainRow>(
        `update project_domains set status = 'active', verification_status = 'active', updated_at = now()
         where project_id = $1 and domain_type = 'default'
         returning *`,
        [project.id],
      )
      return result.rows[0] ? domainFromRow(result.rows[0]) : undefined
    },
    () => {
      const domains = memory.domains.get(project.id) ?? []
      const next = domains.map((domain) =>
        domain.domainType === "default"
          ? { ...domain, status: "active" as const, verificationStatus: "active", updatedAt: now() }
          : domain,
      )
      memory.domains.set(project.id, next)
      return next.find((domain) => domain.domainType === "default")
    },
  )
}

export async function addCustomDomain(project: Project, hostname: string) {
  const cleanHostname = hostname.trim().toLowerCase()
  const domain: ProjectDomain = {
    id: randomUUID(),
    projectId: project.id,
    hostname: cleanHostname,
    domainType: "custom",
    environment: "production",
    status: "verifying",
    isPrimary: false,
    verificationStatus: "pending_dns",
    dnsRecords: [{ type: "CNAME", name: cleanHostname.split(".")[0] ?? "@", value: project.defaultDomain ?? defaultDomainForSlug(project.slug) }],
    lastCheckedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return domain
      const result = await pool.query<DomainRow>(
        `insert into project_domains (
          id, project_id, hostname, domain_type, environment, status, is_primary,
          verification_status, dns_records, last_checked_at, created_at, updated_at
        ) values ($1,$2,$3,'custom','production',$4,false,$5,$6,$7,$8,$9)
        returning *`,
        [
          domain.id,
          domain.projectId,
          domain.hostname,
          domain.status,
          domain.verificationStatus,
          JSON.stringify(domain.dnsRecords),
          domain.lastCheckedAt,
          domain.createdAt,
          domain.updatedAt,
        ],
      )
      return domainFromRow(result.rows[0])
    },
    () => {
      const domains = memory.domains.get(project.id) ?? []
      memory.domains.set(project.id, [domain, ...domains])
      return domain
    },
  )
}

export async function setPrimaryDomain(projectId: string, hostname: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return undefined
      const client = await pool.connect()
      try {
        await client.query("begin")
        await client.query("update project_domains set is_primary = false where project_id = $1", [projectId])
        const result = await client.query<DomainRow>(
          `update project_domains set is_primary = true, updated_at = now()
           where project_id = $1 and hostname = $2 and status = 'active'
           returning *`,
          [projectId, hostname],
        )
        await client.query("commit")
        return result.rows[0] ? domainFromRow(result.rows[0]) : undefined
      } catch (error) {
        await client.query("rollback")
        throw error
      } finally {
        client.release()
      }
    },
    () => {
      const domains = memory.domains.get(projectId) ?? []
      const next = domains.map((domain) => ({
        ...domain,
        isPrimary: domain.hostname === hostname && domain.status === "active",
      }))
      memory.domains.set(projectId, next)
      return next.find((domain) => domain.hostname === hostname && domain.status === "active")
    },
  )
}

export async function deleteCustomDomain(projectId: string, hostname: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return false
      const result = await pool.query(
        "delete from project_domains where project_id = $1 and hostname = $2 and domain_type = 'custom'",
        [projectId, hostname],
      )
      return (result.rowCount ?? 0) > 0
    },
    () => {
      const domains = memory.domains.get(projectId) ?? []
      const next = domains.filter((domain) => !(domain.hostname === hostname && domain.domainType === "custom"))
      memory.domains.set(projectId, next)
      return next.length !== domains.length
    },
  )
}

export async function upsertGitHubInstallation(input: {
  userId: string
  installationId: number
  accountLogin: string
  accountType?: string | null
}) {
  const installation: GitHubInstallation = {
    id: randomUUID(),
    userId: input.userId,
    installationId: input.installationId,
    accountLogin: input.accountLogin,
    accountType: input.accountType ?? null,
    createdAt: now(),
    updatedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return installation
      const result = await pool.query<GitHubInstallationRow>(
        `insert into github_installations (id, user_id, installation_id, account_login, account_type, created_at, updated_at)
         values ($1,$2,$3,$4,$5,now(),now())
         on conflict (installation_id) do update set
           user_id = excluded.user_id,
           account_login = excluded.account_login,
           account_type = excluded.account_type,
           updated_at = now()
         returning *`,
        [installation.id, installation.userId, installation.installationId, installation.accountLogin, installation.accountType],
      )
      return githubInstallationFromRow(result.rows[0])
    },
    () => {
      memory.installations.set(installation.installationId, installation)
      return installation
    },
  )
}

export async function listGitHubRepositories(userId: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return []
      const result = await pool.query<GitHubRepositoryRow>(
        `select r.* from github_repositories r
         join github_installations i on i.installation_id = r.installation_id
         where i.user_id = $1
         order by r.full_name asc`,
        [userId],
      )
      return result.rows.map(githubRepositoryFromRow)
    },
    () => {
      const installationIds = new Set(
        [...memory.installations.values()]
          .filter((installation) => installation.userId === userId)
          .map((installation) => installation.installationId),
      )
      return [...memory.repositories.values()].filter((repo) => installationIds.has(repo.installationId))
    },
  )
}

export async function upsertGitHubRepository(repo: GitHubRepository) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return repo
      const result = await pool.query<GitHubRepositoryRow>(
        `insert into github_repositories (
          id, installation_id, repository_id, owner_login, name, full_name, default_branch, private, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,now())
        on conflict (repository_id) do update set
          installation_id = excluded.installation_id,
          owner_login = excluded.owner_login,
          name = excluded.name,
          full_name = excluded.full_name,
          default_branch = excluded.default_branch,
          private = excluded.private,
          updated_at = now()
        returning *`,
        [repo.id, repo.installationId, repo.repositoryId, repo.ownerLogin, repo.name, repo.fullName, repo.defaultBranch, repo.private],
      )
      return githubRepositoryFromRow(result.rows[0])
    },
    () => {
      memory.repositories.set(repo.repositoryId, repo)
      return repo
    },
  )
}

export async function createSourceConnection(input: Omit<ProjectSourceConnection, "id" | "createdAt" | "updatedAt">) {
  const connection: ProjectSourceConnection = {
    id: randomUUID(),
    createdAt: now(),
    updatedAt: now(),
    ...input,
  }
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return connection
      const result = await pool.query<SourceConnectionRow>(
        `insert into project_source_connections (
          id, project_id, provider, installation_id, repository_id, owner_login, repo_name,
          full_name, branch, root_directory, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
        on conflict (project_id, provider) do update set
          installation_id = excluded.installation_id,
          repository_id = excluded.repository_id,
          owner_login = excluded.owner_login,
          repo_name = excluded.repo_name,
          full_name = excluded.full_name,
          branch = excluded.branch,
          root_directory = excluded.root_directory,
          updated_at = now()
        returning *`,
        [
          connection.id,
          connection.projectId,
          connection.provider,
          connection.installationId,
          connection.repositoryId,
          connection.ownerLogin,
          connection.repoName,
          connection.fullName,
          connection.branch,
          connection.rootDirectory,
        ],
      )
      return sourceConnectionFromRow(result.rows[0])
    },
    () => {
      memory.sourceConnections.set(connection.projectId, connection)
      return connection
    },
  )
}

export async function findSourceConnectionsByRepo(repositoryId: number, branch: string) {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return []
      const result = await pool.query<SourceConnectionRow>(
        "select * from project_source_connections where repository_id = $1 and branch = $2",
        [repositoryId, branch],
      )
      return result.rows.map(sourceConnectionFromRow)
    },
    () =>
      [...memory.sourceConnections.values()].filter(
        (connection) => connection.repositoryId === repositoryId && connection.branch === branch,
      ),
  )
}

export async function recordGitHubDelivery(input: Omit<GitHubWebhookDelivery, "id" | "receivedAt"> & { payload?: unknown }) {
  const delivery: GitHubWebhookDelivery = {
    id: randomUUID(),
    deliveryId: input.deliveryId,
    event: input.event,
    action: input.action,
    installationId: input.installationId,
    repositoryId: input.repositoryId,
    status: input.status,
    statusMessage: input.statusMessage,
    receivedAt: now(),
  }

  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return delivery
      const result = await pool.query<DeliveryRow>(
        `insert into github_webhook_deliveries (
          id, delivery_id, event, action, installation_id, repository_id, status, status_message, payload, received_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
        on conflict (delivery_id) do nothing
        returning *`,
        [
          delivery.id,
          delivery.deliveryId,
          delivery.event,
          delivery.action,
          delivery.installationId,
          delivery.repositoryId,
          delivery.status,
          delivery.statusMessage,
          JSON.stringify(input.payload ?? {}),
        ],
      )
      return result.rows[0] ? deliveryFromRow(result.rows[0]) : undefined
    },
    () => {
      if (memory.deliveries.has(delivery.deliveryId)) return undefined
      memory.deliveries.set(delivery.deliveryId, delivery)
      return delivery
    },
  )
}
