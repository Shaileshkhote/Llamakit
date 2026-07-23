import { randomUUID } from "node:crypto"
import { ensureDatabase, getPool, hasDatabase } from "@/lib/db"
import type {
  Build,
  CreateProjectInput,
  Project,
  ProjectFile,
  ProjectFramework,
  ProjectSourceFile,
  ProjectStatus,
  ProjectVersion,
  UpdateProjectInput,
} from "@/types/platform"

type ProjectRow = {
  id: string
  slug: string
  name: string
  description: string | null
  framework: ProjectFramework
  install_command: string
  build_command: string
  start_command: string
  root_directory: string
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
  created_at: Date | string
}

type BuildRow = {
  id: string
  project_id: string
  version_id: string
  status: Build["status"]
  image_ref: string | null
  logs: string
  started_at: Date | string | null
  finished_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

const now = () => new Date().toISOString()

const memory = {
  projects: new Map<string, Project>(),
  files: new Map<string, ProjectFile[]>(),
  versions: new Map<string, ProjectVersion[]>(),
  builds: new Map<string, Build[]>(),
}

function iso(value: Date | string | null) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    framework: row.framework,
    installCommand: row.install_command,
    buildCommand: row.build_command,
    startCommand: row.start_command,
    rootDirectory: row.root_directory,
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
    logs: row.logs,
    startedAt: iso(row.started_at),
    finishedAt: iso(row.finished_at),
    createdAt: iso(row.created_at) ?? now(),
    updatedAt: iso(row.updated_at) ?? now(),
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

export async function listProjects() {
  return withDatabase(
    async () => {
      const pool = getPool()
      if (!pool) return []
      const result = await pool.query<ProjectRow>(
        "select * from projects order by updated_at desc limit 100",
      )
      return result.rows.map(projectFromRow)
    },
    () => [...memory.projects.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
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

export async function createProject(input: CreateProjectInput) {
  const timestamp = now()
  const project: Project = {
    id: randomUUID(),
    slug: slugify(input.slug || input.name),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    framework: input.framework ?? "nextjs",
    installCommand: "pnpm install",
    buildCommand: "pnpm build",
    startCommand: "pnpm start",
    rootDirectory: ".",
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
          id, slug, name, description, framework, install_command, build_command,
          start_command, root_directory, status, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        returning *`,
        [
          project.id,
          project.slug,
          project.name,
          project.description,
          project.framework,
          project.installCommand,
          project.buildCommand,
          project.startCommand,
          project.rootDirectory,
          project.status,
          project.createdAt,
          project.updatedAt,
        ],
      )
      const created = projectFromRow(result.rows[0])
      await replaceProjectFiles(created.id, starterFiles(created))
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
          status = $9,
          updated_at = $10
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

export async function createProjectVersion(projectId: string) {
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
        `insert into project_versions (id, project_id, version_number, source_snapshot)
         values ($1, $2, $3, $4)
         returning *`,
        [randomUUID(), projectId, versionNumber, JSON.stringify(sourceSnapshot)],
      )
      return versionFromRow(result.rows[0])
    },
    () => createMemoryVersion(projectId, sourceSnapshot),
  )
}

function createMemoryVersion(projectId: string, sourceSnapshot: ProjectSourceFile[]) {
  const versions = memory.versions.get(projectId) ?? []
  const version: ProjectVersion = {
    id: randomUUID(),
    projectId,
    versionNumber: versions.length + 1,
    sourceSnapshot,
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

export async function queueBuild(projectId: string) {
  const version = await createProjectVersion(projectId)
  const build: Build = {
    id: randomUUID(),
    projectId,
    versionId: version.id,
    status: "queued",
    imageRef: null,
    logs: "Build queued. Kubernetes build worker is not connected yet.",
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
          id, project_id, version_id, status, image_ref, logs, started_at, finished_at, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        returning *`,
        [
          build.id,
          build.projectId,
          build.versionId,
          build.status,
          build.imageRef,
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
