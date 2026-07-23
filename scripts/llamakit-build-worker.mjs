#!/usr/bin/env node
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import process from "node:process"
import pg from "pg"

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is required.")
  process.exit(1)
}

const namespace = process.env.LLAMAKIT_PROJECT_NAMESPACE || "llamakit-projects"
const registry = process.env.LLAMAKIT_REGISTRY_URL || "localhost:5000"
const workspaceRoot = process.env.LLAMAKIT_BUILD_WORKSPACE || path.join(os.tmpdir(), "llamakit-builds")
const pollMs = Number(process.env.LLAMAKIT_BUILD_POLL_MS || 5000)
const runOnce = process.argv.includes("--once")
const maxLogBytes = Number(process.env.LLAMAKIT_BUILD_MAX_LOG_BYTES || 240_000)
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "llamapages.dev"

const pool = new Pool({ connectionString: databaseUrl })

function timestamp() {
  return new Date().toISOString()
}

function log(message) {
  console.log(`[${timestamp()}] ${message}`)
}

function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52)
  return slug || `project-${randomUUID().slice(0, 8)}`
}

function k8sName(value) {
  return slugify(value).slice(0, 63).replace(/-+$/g, "") || `lk-${randomUUID().slice(0, 8)}`
}

function previewHostname(project, build) {
  const branch = slugify(build.branch || "preview").slice(0, 28)
  const sha = build.commit_sha ? String(build.commit_sha).slice(0, 8).toLowerCase() : build.id.slice(0, 8)
  return `${project.slug}-git-${branch}-${sha}.${rootDomain}`.toLowerCase()
}

function imageRef(project, build) {
  const tag = (build.commit_sha ? String(build.commit_sha).slice(0, 12) : build.id).toLowerCase()
  return `${registry}/${project.slug}:${tag}`
}

function yamlString(value) {
  return JSON.stringify(String(value))
}

function dockerCommand(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function generatedDockerfile(project) {
  const installCommand = dockerCommand(project.install_command || "pnpm install")
  const buildCommand = dockerCommand(project.build_command || "pnpm build")
  const startCommand = dockerCommand(project.start_command || "pnpm start")

  return `FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache git python3 make g++ libc6-compat
RUN corepack enable && corepack prepare pnpm@10.17.0 --activate
RUN pnpm config set block-exotic-subdeps false || true
COPY . .
RUN printf '\\n# Added by LlamaKit build worker for non-interactive container builds\\ndangerouslyAllowAllBuilds: true\\nneverBuiltDependencies: []\\n' >> pnpm-workspace.yaml
RUN ${installCommand}
RUN ${buildCommand}
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-lc", "${startCommand}"]
`
}

function generatedDockerignore() {
  return `.git
.next/cache
node_modules
npm-debug.log
pnpm-debug.log
yarn-debug.log
Dockerfile.llamakit
`
}

function safeFilePath(root, relativePath) {
  const normalized = String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
  const resolved = path.resolve(root, normalized)
  const rootResolved = path.resolve(root)
  if (!resolved.startsWith(`${rootResolved}${path.sep}`) && resolved !== rootResolved) {
    throw new Error(`Unsafe file path in source snapshot: ${relativePath}`)
  }
  return resolved
}

async function appendBuildLog(buildId, chunk) {
  if (!chunk) return
  const text = chunk.length > maxLogBytes ? chunk.slice(-maxLogBytes) : chunk
  await pool.query(
    `update builds
     set logs = right(coalesce(logs, '') || $2, $3),
         updated_at = now()
     where id = $1`,
    [buildId, text, maxLogBytes],
  )
}

async function run(command, args, options) {
  const cwd = options.cwd || process.cwd()
  const printable = [command, ...args].join(" ")
  await appendBuildLog(options.buildId, `\n$ ${printable}\n`)

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env })
    let tail = ""

    child.stdout.on("data", (data) => {
      const chunk = data.toString()
      process.stdout.write(chunk)
      tail += chunk
    })

    child.stderr.on("data", (data) => {
      const chunk = data.toString()
      process.stderr.write(chunk)
      tail += chunk
    })

    child.on("error", reject)
    child.on("close", async (code) => {
      try {
        await appendBuildLog(options.buildId, tail)
      } catch (error) {
        reject(error)
        return
      }
      if (code === 0) resolve()
      else reject(new Error(`${printable} exited with code ${code}`))
    })
  })
}

async function claimBuild() {
  const client = await pool.connect()
  try {
    await client.query("begin")
    const result = await client.query(
      `select
         b.*,
         p.slug,
         p.name,
         p.install_command,
         p.build_command,
         p.start_command,
         p.root_directory,
         p.production_branch,
         p.default_domain,
         v.source_snapshot
       from builds b
       join projects p on p.id = b.project_id
       join project_versions v on v.id = b.version_id
       where b.status = 'queued'
       order by b.created_at asc
       for update of b skip locked
       limit 1`,
    )

    const row = result.rows[0]
    if (!row) {
      await client.query("commit")
      return null
    }

    await client.query(
      `update builds
       set status = 'running',
           started_at = coalesce(started_at, now()),
           updated_at = now(),
           logs = right(coalesce(logs, '') || $2, $3)
       where id = $1`,
      [row.id, `\n[${timestamp()}] Picked up by LlamaKit build worker.\n`, maxLogBytes],
    )
    await client.query("update projects set status = 'building', updated_at = now() where id = $1", [
      row.project_id,
    ])
    await client.query("commit")
    return row
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    client.release()
  }
}

async function restoreSource(build) {
  const workspace = path.join(workspaceRoot, build.id)
  await fs.rm(workspace, { recursive: true, force: true })
  await fs.mkdir(workspace, { recursive: true })

  const snapshot =
    typeof build.source_snapshot === "string" ? JSON.parse(build.source_snapshot) : build.source_snapshot
  for (const file of snapshot || []) {
    const target = safeFilePath(workspace, file.path)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, file.content ?? "", "utf8")
  }

  const dockerfile = safeFilePath(workspace, "Dockerfile.llamakit")
  await fs.writeFile(dockerfile, generatedDockerfile(build), "utf8")

  const dockerignore = safeFilePath(workspace, ".dockerignore")
  try {
    await fs.access(dockerignore)
  } catch {
    await fs.writeFile(dockerignore, generatedDockerignore(), "utf8")
  }

  return { workspace, dockerfile }
}

function deploymentManifest(project, build, deployment, image) {
  const appName = deployment.service_name || deployment.serviceName
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  namespace: ${namespace}
  labels:
    app: ${appName}
    llamakit.dev/project: ${yamlString(project.slug)}
    llamakit.dev/build-id: ${yamlString(build.id)}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
        llamakit.dev/project: ${yamlString(project.slug)}
        llamakit.dev/build-id: ${yamlString(build.id)}
    spec:
      containers:
        - name: app
          image: ${yamlString(image)}
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          env:
            - name: PORT
              value: "3000"
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 6
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: "1"
              memory: 768Mi
---
apiVersion: v1
kind: Service
metadata:
  name: ${appName}
  namespace: ${namespace}
  labels:
    app: ${appName}
spec:
  selector:
    app: ${appName}
  ports:
    - name: http
      port: 80
      targetPort: 3000
  type: ClusterIP
`
}

async function applyManifest(buildId, manifest) {
  const tempFile = path.join(os.tmpdir(), `llamakit-${buildId}.yaml`)
  await fs.writeFile(tempFile, manifest, "utf8")
  try {
    await run("kubectl", ["apply", "-f", tempFile], { buildId })
  } finally {
    await fs.rm(tempFile, { force: true })
  }
}

async function createDeploymentRecord(project, build, image) {
  const count = await pool.query("select count(*)::int as count from deployments where project_id = $1", [
    project.project_id,
  ])
  const deploymentNumber = Number(count.rows[0]?.count ?? 0) + 1
  const preview = previewHostname(project, build)
  const deployment = {
    id: randomUUID(),
    serviceName: k8sName(`project-${project.slug}-${deploymentNumber}`),
    deploymentNumber,
    previewHostname: preview,
    previewUrl: `https://${preview}`,
  }

  const result = await pool.query(
    `insert into deployments (
      id, project_id, version_id, build_id, environment, status, runtime_status, namespace,
      service_name, image_ref, preview_url, preview_hostname, branch, commit_sha, deployment_number,
      promoted_at, created_at, updated_at
    ) values ($1,$2,$3,$4,'preview','deploying','deploying',$5,$6,$7,$8,$9,$10,$11,$12,null,now(),now())
    returning *`,
    [
      deployment.id,
      project.project_id,
      build.version_id,
      build.id,
      namespace,
      deployment.serviceName,
      image,
      deployment.previewUrl,
      deployment.previewHostname,
      build.branch,
      build.commit_sha,
      deployment.deploymentNumber,
    ],
  )

  return result.rows[0]
}

async function ensureNamespace(buildId) {
  try {
    await run("kubectl", ["get", "namespace", namespace], { buildId })
  } catch {
    await run("kubectl", ["create", "namespace", namespace], { buildId })
  }
}

async function markDeploymentActive(project, deployment) {
  await pool.query(
    "update deployments set status = 'active', runtime_status = 'active', updated_at = now() where id = $1",
    [deployment.id],
  )

  if (deployment.branch === project.production_branch) {
    await pool.query("update deployments set environment = 'production', promoted_at = now(), updated_at = now() where id = $1", [
      deployment.id,
    ])
    await pool.query(
      `insert into project_environment_aliases (id, project_id, environment, deployment_id, hostname, updated_at)
       values ($1, $2, 'production', $3, $4, now())
       on conflict (project_id, environment) do update set
         deployment_id = excluded.deployment_id,
         hostname = excluded.hostname,
         updated_at = excluded.updated_at`,
      [randomUUID(), project.project_id, deployment.id, project.default_domain || `${project.slug}.${rootDomain}`],
    )
    await pool.query(
      "update project_domains set status = 'active', verification_status = 'default-domain', updated_at = now(), last_checked_at = now() where project_id = $1 and domain_type = 'default'",
      [project.project_id],
    )
  }
}

async function markBuildSuccess(build, image) {
  await pool.query(
    `update builds
     set status = 'succeeded',
         image_ref = $2,
         finished_at = now(),
         updated_at = now(),
         logs = right(coalesce(logs, '') || $3, $4)
     where id = $1`,
    [build.id, image, `\n[${timestamp()}] Build succeeded: ${image}\n`, maxLogBytes],
  )
  await pool.query("update projects set status = 'deployed', updated_at = now() where id = $1", [
    build.project_id,
  ])
}

async function markBuildFailed(build, error) {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  await pool.query(
    `update builds
     set status = 'failed',
         finished_at = now(),
         updated_at = now(),
         logs = right(coalesce(logs, '') || $2, $3)
     where id = $1`,
    [build.id, `\n[${timestamp()}] Build failed.\n${message}\n`, maxLogBytes],
  )
  await pool.query("update projects set status = 'failed', updated_at = now() where id = $1", [
    build.project_id,
  ])
}

async function processBuild(build) {
  const project = build
  const image = imageRef(project, build)
  log(`building ${project.slug}/${build.id}`)

  const { workspace, dockerfile } = await restoreSource(build)
  await appendBuildLog(build.id, `[${timestamp()}] Restored source into ${workspace}.\n`)
  await run("docker", ["build", "-f", dockerfile, "-t", image, workspace], { buildId: build.id })
  await run("docker", ["push", image], { buildId: build.id })

  const deployment = await createDeploymentRecord(project, build, image)
  await ensureNamespace(build.id)
  const manifest = deploymentManifest(project, build, deployment, image)
  await applyManifest(build.id, manifest)
  await run("kubectl", ["rollout", "status", `deployment/${deployment.service_name}`, "-n", namespace, "--timeout=180s"], {
    buildId: build.id,
  })
  await markDeploymentActive(project, deployment)
  await markBuildSuccess(build, image)
  log(`build succeeded ${project.slug}/${build.id}`)
}

async function tick() {
  const build = await claimBuild()
  if (!build) return false

  try {
    await processBuild(build)
  } catch (error) {
    console.error(error)
    await markBuildFailed(build, error)
  }
  return true
}

async function main() {
  await fs.mkdir(workspaceRoot, { recursive: true })
  log(`LlamaKit build worker started. namespace=${namespace} registry=${registry}`)
  do {
    const didWork = await tick()
    if (runOnce) break
    if (!didWork) await new Promise((resolve) => setTimeout(resolve, pollMs))
  } while (true)
}

process.on("SIGTERM", async () => {
  log("received SIGTERM")
  await pool.end()
  process.exit(0)
})

main()
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
