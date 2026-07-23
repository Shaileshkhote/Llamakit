"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { loadProjectBundle, requestJson, type ProjectBundle, type User } from "./api"
import { useToast } from "./toast"
import { CustomSelect, Panel, Shell, StatusPill } from "./ui"
import type { Deployment, Project } from "@/types/platform"

const tabs = ["Overview", "Deployments", "Build Logs", "Domains", "Environment Variables", "Source", "Settings"] as const
type Tab = (typeof tabs)[number]

export default function ProjectWorkspace({ slug }: { slug: string }) {
  const { notify } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [bundle, setBundle] = useState<ProjectBundle | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("Overview")
  const [confirmDeployment, setConfirmDeployment] = useState<Deployment | null>(null)
  const activeBuild = bundle?.builds.some((build) => ["queued", "running"].includes(build.status))

  useEffect(() => {
    void bootstrap()
  }, [slug])

  useEffect(() => {
    if (!bundle) return
    const interval = window.setInterval(() => void refresh(), activeBuild ? 3000 : 15000)
    return () => window.clearInterval(interval)
  }, [bundle?.project.slug, activeBuild])

  async function bootstrap() {
    try {
      const [userData, projectData, projectBundle] = await Promise.all([
        requestJson<{ user: User }>("/api/auth/me"),
        requestJson<{ projects: Project[] }>("/api/projects"),
        loadProjectBundle(slug),
      ])
      setUser(userData.user)
      setProjects(projectData.projects)
      setBundle(projectBundle)
    } catch (error) {
      notify({ title: "Could not load project", message: error instanceof Error ? error.message : "Refresh and try again.", tone: "error" })
    }
  }

  async function refresh() {
    setBundle(await loadProjectBundle(slug))
  }

  async function queueBuild() {
    await requestJson(`/api/projects/${slug}/builds`, { method: "POST" })
    await refresh()
    notify({ title: "Build queued", tone: "success" })
  }

  async function promote(deployment: Deployment) {
    await requestJson(`/api/projects/${slug}/deployments/${deployment.id}/promote`, { method: "POST" })
    setConfirmDeployment(null)
    await refresh()
    notify({ title: "Production updated", message: deployment.previewHostname ?? undefined, tone: "success" })
  }

  if (!bundle) {
    return (
      <Shell projects={projects} user={user}>
        <div className="h-96 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]" />
      </Shell>
    )
  }

  const latestBuild = bundle.builds[0]
  const production = bundle.deployments.find((deployment) => deployment.environment === "production")

  return (
    <Shell projects={projects} user={user}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm text-[var(--muted)]" href="/dashboard">Projects</Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">{bundle.project.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{bundle.project.defaultDomain}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold" onClick={queueBuild} type="button">Queue Build</button>
          <a className="rounded-md bg-[var(--text)] px-3 py-2 text-sm font-semibold text-[var(--bg)]" href={`https://${bundle.project.defaultDomain}`} rel="noreferrer" target="_blank">Open Site</a>
        </div>
      </div>

      <div className="mb-5 overflow-auto border-b border-[var(--border)]">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button className={`border-b-2 px-3 py-3 text-sm font-medium ${activeTab === tab ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--muted)]"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Overview" ? <Overview bundle={bundle} latestBuild={latestBuild} production={production} /> : null}
      {activeTab === "Deployments" ? <Deployments deployments={bundle.deployments} onPromote={setConfirmDeployment} /> : null}
      {activeTab === "Build Logs" ? <BuildLogs builds={bundle.builds} /> : null}
      {activeTab === "Domains" ? <Domains bundle={bundle} onRefresh={refresh} /> : null}
      {activeTab === "Environment Variables" ? <EnvVars bundle={bundle} onRefresh={refresh} /> : null}
      {activeTab === "Source" ? <Source bundle={bundle} /> : null}
      {activeTab === "Settings" ? <Settings bundle={bundle} onRefresh={refresh} /> : null}

      {confirmDeployment ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <h2 className="text-lg font-semibold">Promote deployment?</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This will update the production alias to this active deployment.</p>
            <p className="mt-3 truncate rounded-md bg-[var(--surface-muted)] p-3 font-mono text-xs">{confirmDeployment.previewHostname}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold" onClick={() => setConfirmDeployment(null)} type="button">Cancel</button>
              <button className="rounded-md bg-[var(--text)] px-3 py-2 text-sm font-semibold text-[var(--bg)]" onClick={() => promote(confirmDeployment)} type="button">Promote</button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  )
}

function Overview({ bundle, latestBuild, production }: { bundle: ProjectBundle; latestBuild?: ProjectBundle["builds"][number]; production?: Deployment }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Production" eyebrow="Current">
        <StatusPill value={production?.status ?? "not deployed"} />
        <p className="mt-3 truncate text-sm text-[var(--muted)]">{production?.previewHostname ?? bundle.project.defaultDomain}</p>
      </Panel>
      <Panel title="Latest build" eyebrow="Status">
        <StatusPill value={latestBuild?.status ?? "none"} />
        <p className="mt-3 truncate font-mono text-xs text-[var(--muted)]">{latestBuild?.id ?? "No build yet"}</p>
      </Panel>
      <Panel title="Domains" eyebrow="Routing">
        <p className="text-2xl font-semibold">{bundle.domains.length}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Default and custom domains</p>
      </Panel>
    </div>
  )
}

function Deployments({ deployments, onPromote }: { deployments: Deployment[]; onPromote: (deployment: Deployment) => void }) {
  return (
    <Panel title="Deployments">
      <div className="grid gap-3">
        {deployments.map((deployment) => (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[var(--surface-muted)] p-4" key={deployment.id}>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><StatusPill value={deployment.environment} /><StatusPill value={deployment.status} /></div>
              <p className="mt-2 truncate font-mono text-xs text-[var(--muted)]">{deployment.previewHostname}</p>
            </div>
            <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold disabled:opacity-50" disabled={deployment.status !== "active"} onClick={() => onPromote(deployment)} type="button">Promote</button>
          </div>
        ))}
        {!deployments.length ? <p className="text-sm text-[var(--muted)]">No successful deployments yet.</p> : null}
      </div>
    </Panel>
  )
}

function BuildLogs({ builds }: { builds: ProjectBundle["builds"] }) {
  const [selectedId, setSelectedId] = useState(builds[0]?.id ?? "")
  const selected = builds.find((build) => build.id === selectedId) ?? builds[0]
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Panel title="Builds">
        <div className="grid gap-2">
          {builds.map((build) => (
            <button className={`rounded-md border p-3 text-left ${selected?.id === build.id ? "border-[var(--text)]" : "border-[var(--border)]"}`} key={build.id} onClick={() => setSelectedId(build.id)} type="button">
              <StatusPill value={build.status} />
              <p className="mt-2 truncate font-mono text-xs text-[var(--muted)]">{build.id}</p>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Logs">
        <pre className="max-h-[620px] overflow-auto rounded-md bg-[#080a0d] p-4 text-xs leading-6 text-[#dbe7ff]">{selected?.logs || "No logs yet."}</pre>
      </Panel>
    </div>
  )
}

function Domains({ bundle, onRefresh }: { bundle: ProjectBundle; onRefresh: () => Promise<void> }) {
  const { notify } = useToast()
  async function addDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const hostname = String(form.get("hostname") || "")
    await requestJson(`/api/projects/${bundle.project.slug}/domains`, { method: "POST", body: JSON.stringify({ hostname }) })
    event.currentTarget.reset()
    await onRefresh()
    notify({ title: "Domain added", message: hostname, tone: "success" })
  }
  return (
    <Panel title="Domains">
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={addDomain}>
        <input className="h-10 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm" name="hostname" placeholder="analytics.protocol.com" />
        <button className="rounded-md bg-[var(--text)] px-3 py-2 text-sm font-semibold text-[var(--bg)]">Add Domain</button>
      </form>
      <div className="grid gap-3">
        {bundle.domains.map((domain) => (
          <div className="rounded-md bg-[var(--surface-muted)] p-4" key={domain.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-medium">{domain.hostname}</span>
              <StatusPill value={domain.status} />
            </div>
            {domain.dnsRecords.map((record) => (
              <div className="mt-3 grid gap-2 rounded-md bg-[var(--surface)] p-3 font-mono text-xs sm:grid-cols-[80px_1fr_1.5fr]" key={`${record.type}-${record.name}-${record.value}`}>
                <span>{record.type}</span><span>{record.name}</span><span className="break-all">{record.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function EnvVars({ bundle, onRefresh }: { bundle: ProjectBundle; onRefresh: () => Promise<void> }) {
  const { notify } = useToast()
  const [context, setContext] = useState("production")
  const [scope, setScope] = useState("runtime")
  async function addEnv(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await requestJson(`/api/projects/${bundle.project.slug}/env`, {
      method: "POST",
      body: JSON.stringify({
        key: form.get("key"),
        value: form.get("value"),
        context: form.get("context"),
        scope: form.get("scope"),
      }),
    })
    event.currentTarget.reset()
    await onRefresh()
    notify({ title: "Variable saved", message: "Redeploy to apply it.", tone: "success" })
  }
  return (
    <Panel title="Environment Variables" eyebrow="Encrypted">
      <form className="mb-4 grid gap-2 md:grid-cols-[1fr_1fr_150px_130px_auto]" onSubmit={addEnv}>
        <input className="h-10 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm" name="key" placeholder="KEY" />
        <input className="h-10 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm" name="value" placeholder="Value" type="password" />
        <CustomSelect
          name="context"
          onChange={setContext}
          options={[{ label: "production", value: "production" }, { label: "preview", value: "preview" }, { label: "development", value: "development" }]}
          value={context}
        />
        <CustomSelect
          name="scope"
          onChange={setScope}
          options={[{ label: "runtime", value: "runtime" }, { label: "build", value: "build" }]}
          value={scope}
        />
        <button className="rounded-md bg-[var(--text)] px-3 py-2 text-sm font-semibold text-[var(--bg)]">Save</button>
      </form>
      <div className="grid gap-2">
        {bundle.env.map((item) => (
          <div className="grid gap-2 rounded-md bg-[var(--surface-muted)] p-3 text-sm md:grid-cols-[1fr_130px_100px_120px]" key={item.id}>
            <span className="font-mono font-semibold">{item.key}</span>
            <span>{item.context}</span>
            <span>{item.scope}</span>
            <span className="text-[var(--muted)]">{item.valuePreview}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Source({ bundle }: { bundle: ProjectBundle }) {
  return (
    <Panel title="Source">
      {bundle.sourceConnection ? (
        <div className="rounded-md bg-[var(--surface-muted)] p-4">
          <p className="font-semibold">{bundle.sourceConnection.fullName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Branch {bundle.sourceConnection.branch} · Root {bundle.sourceConnection.rootDirectory}</p>
        </div>
      ) : <p className="text-sm text-[var(--muted)]">Manual project source snapshot.</p>}
      <div className="mt-4 grid gap-2">
        {bundle.files.slice(0, 12).map((file) => <div className="rounded-md bg-[var(--surface-muted)] p-3 font-mono text-xs" key={file.id}>{file.path}</div>)}
      </div>
    </Panel>
  )
}

function Settings({ bundle, onRefresh }: { bundle: ProjectBundle; onRefresh: () => Promise<void> }) {
  const [framework, setFramework] = useState<string>(bundle.project.framework)
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await requestJson(`/api/projects/${bundle.project.slug}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: form.get("name"),
        framework: form.get("framework"),
        productionBranch: form.get("productionBranch"),
        installCommand: form.get("installCommand"),
        buildCommand: form.get("buildCommand"),
        startCommand: form.get("startCommand"),
      }),
    })
    await onRefresh()
  }
  return (
    <Panel title="Settings">
      <form className="grid max-w-2xl gap-3" onSubmit={save}>
        {(["name", "productionBranch", "installCommand", "buildCommand", "startCommand"] as const).map((key) => (
          <label className="grid gap-1.5 text-sm" key={key}>{key}<input className="h-10 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3" defaultValue={String(bundle.project[key] ?? "")} name={key} /></label>
        ))}
        <CustomSelect
          label="framework"
          name="framework"
          onChange={setFramework}
          options={[{ label: "Next.js", value: "nextjs" }, { label: "Vite", value: "vite" }, { label: "Static", value: "static" }]}
          value={framework}
        />
        <button className="w-fit rounded-md bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)]">Save settings</button>
      </form>
    </Panel>
  )
}
