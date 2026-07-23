"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { Build, Deployment, GitHubRepository, Project, ProjectDomain, ProjectFile, ProjectFramework } from "@/types/platform"

type User = { id: string; email: string; name: string }
type Payload<T> = T & { error?: string }

const frameworks: { value: ProjectFramework; label: string }[] = [
  { value: "nextjs", label: "Next.js" },
  { value: "vite", label: "Vite" },
  { value: "static", label: "Static" },
]

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  })
  const data = (await response.json().catch(() => ({}))) as Payload<T>
  if (!response.ok) throw new Error(data.error || "Request failed.")
  return data
}

export default function PlatformStudio() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [domains, setDomains] = useState<ProjectDomain[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [activeContent, setActiveContent] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const selectedProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) ?? projects[0],
    [projects, selectedSlug],
  )

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    void refreshProject(selectedProject.slug)
  }, [selectedProject?.slug])

  useEffect(() => {
    const file = files.find((item) => item.path === activePath) ?? files[0]
    setActivePath(file?.path ?? null)
    setActiveContent(file?.content ?? "")
  }, [files, activePath])

  async function bootstrap() {
    try {
      const [{ user: currentUser }, { projects: ownedProjects }, repoResult] = await Promise.all([
        requestJson<{ user: User }>("/api/auth/me"),
        requestJson<{ projects: Project[] }>("/api/projects"),
        requestJson<{ repositories: GitHubRepository[] }>("/api/github/repositories").catch(() => ({ repositories: [] })),
      ])
      setUser(currentUser)
      setProjects(ownedProjects)
      setRepositories(repoResult.repositories)
      setSelectedSlug((current) => current ?? ownedProjects[0]?.slug ?? null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load dashboard.")
    }
  }

  async function refreshProject(slug: string) {
    const [fileData, buildData, deploymentData, domainData] = await Promise.all([
      requestJson<{ files: ProjectFile[] }>(`/api/projects/${slug}/files`),
      requestJson<{ builds: Build[] }>(`/api/projects/${slug}/builds`),
      requestJson<{ deployments: Deployment[] }>(`/api/projects/${slug}/deployments`),
      requestJson<{ domains: ProjectDomain[] }>(`/api/projects/${slug}/domains`),
    ])
    setFiles(fileData.files)
    setBuilds(buildData.builds)
    setDeployments(deploymentData.deployments)
    setDomains(domainData.domains)
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    const name = String(form.get("name") || "").trim()
    if (!name) return
    setLoading(true)
    try {
      const data = await requestJson<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          framework: form.get("framework"),
          description: form.get("description"),
        }),
      })
      target.reset()
      setProjects((items) => [data.project, ...items])
      setSelectedSlug(data.project.slug)
      setMessage(`Created ${data.project.defaultDomain}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create project.")
    } finally {
      setLoading(false)
    }
  }

  async function importRepo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    const repositoryId = Number(form.get("repositoryId"))
    if (!repositoryId) return
    setLoading(true)
    try {
      const data = await requestJson<{ project: Project }>("/api/projects/import/github", {
        method: "POST",
        body: JSON.stringify({
          repositoryId,
          branch: form.get("branch") || undefined,
          rootDirectory: form.get("rootDirectory") || ".",
          framework: form.get("framework"),
        }),
      })
      setProjects((items) => [data.project, ...items])
      setSelectedSlug(data.project.slug)
      setMessage("Repository imported and build queued.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import repository.")
    } finally {
      setLoading(false)
    }
  }

  async function saveFile() {
    if (!selectedProject || !activePath) return
    const nextFiles = files.map((file) => (file.path === activePath ? { path: file.path, content: activeContent } : file))
    await requestJson(`/api/projects/${selectedProject.slug}/files`, {
      method: "PUT",
      body: JSON.stringify({ files: nextFiles }),
    })
    await refreshProject(selectedProject.slug)
    setMessage("Source saved.")
  }

  async function queueBuild() {
    if (!selectedProject) return
    await requestJson(`/api/projects/${selectedProject.slug}/builds`, { method: "POST" })
    await refreshProject(selectedProject.slug)
    setMessage("Build queued.")
  }

  async function createDeployment() {
    if (!selectedProject) return
    await requestJson(`/api/projects/${selectedProject.slug}/deployments`, { method: "POST" })
    await refreshProject(selectedProject.slug)
    setMessage("Preview deployment created.")
  }

  async function promote(deploymentId: string) {
    if (!selectedProject) return
    await requestJson(`/api/projects/${selectedProject.slug}/deployments/${deploymentId}/promote`, { method: "POST" })
    await refreshProject(selectedProject.slug)
    setMessage("Production alias updated.")
  }

  async function addDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProject) return
    const target = event.currentTarget
    const hostname = String(new FormData(target).get("hostname") || "")
    await requestJson(`/api/projects/${selectedProject.slug}/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname }),
    })
    target.reset()
    await refreshProject(selectedProject.slug)
    setMessage("Custom domain added.")
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">LlamaKit</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">Deployments</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">{user?.email}</span>
          <Link className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold" href="/">Home</Link>
          <button className="rounded-lg bg-[var(--text)] px-3 py-2 text-sm font-semibold text-[var(--bg)]" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-8 sm:px-8 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <form className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" onSubmit={createProject}>
            <p className="font-semibold">Create manual project</p>
            <input className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="name" placeholder="Project name" />
            <textarea className="mt-3 min-h-20 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="description" placeholder="Description" />
            <select className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="framework">
              {frameworks.map((framework) => <option key={framework.value} value={framework.value}>{framework.label}</option>)}
            </select>
            <button className="mt-3 w-full rounded-lg bg-[var(--text)] px-4 py-2.5 font-semibold text-[var(--bg)]" disabled={loading}>Create</button>
          </form>

          <form className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" onSubmit={importRepo}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Import GitHub repo</p>
              <a className="text-sm font-semibold text-[var(--muted)]" href="/api/github/installations/start">Install App</a>
            </div>
            <select className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="repositoryId">
              <option value="">Select repository</option>
              {repositories.map((repo) => <option key={repo.repositoryId} value={repo.repositoryId}>{repo.fullName}</option>)}
            </select>
            <input className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="branch" placeholder="Branch, defaults to repo default" />
            <input className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="rootDirectory" placeholder="Root directory, e.g. ." />
            <select className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="framework">
              {frameworks.map((framework) => <option key={framework.value} value={framework.value}>{framework.label}</option>)}
            </select>
            <button className="mt-3 w-full rounded-lg bg-[var(--text)] px-4 py-2.5 font-semibold text-[var(--bg)]" disabled={loading}>Import and build</button>
          </form>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-semibold">Projects</p>
            <div className="mt-3 grid gap-2">
              {projects.map((project) => (
                <button className={`rounded-lg border p-3 text-left ${project.slug === selectedProject?.slug ? "border-[var(--text)]" : "border-[var(--border)]"}`} key={project.id} onClick={() => setSelectedSlug(project.slug)}>
                  <span className="block font-semibold">{project.name}</span>
                  <span className="text-xs text-[var(--muted)]">{project.defaultDomain}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          {selectedProject ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedProject.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Production branch: {selectedProject.productionBranch}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Default domain: {selectedProject.defaultDomain}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold" onClick={queueBuild}>Queue build</button>
                  <button className="rounded-lg bg-[var(--text)] px-3 py-2 text-sm font-semibold text-[var(--bg)]" onClick={createDeployment}>Create preview</button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="grid content-start gap-2">
                  {files.map((file) => (
                    <button className={`rounded-lg border px-3 py-2 text-left font-mono text-xs ${file.path === activePath ? "border-[var(--text)]" : "border-[var(--border)]"}`} key={file.id} onClick={() => { setActivePath(file.path); setActiveContent(file.content) }}>
                      {file.path}
                    </button>
                  ))}
                </div>
                <div>
                  <textarea className="h-[360px] w-full resize-none rounded-lg border border-[var(--border)] bg-[#0b0d10] p-4 font-mono text-xs leading-6 text-[#e8eef8]" onChange={(event) => setActiveContent(event.target.value)} value={activeContent} />
                  <button className="mt-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold" onClick={saveFile}>Save source</button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Panel title="Builds">
                  {builds.slice(0, 5).map((build) => <Row key={build.id} left={build.status} right={build.branch ?? "manual"} />)}
                </Panel>
                <Panel title="Deployments">
                  {deployments.slice(0, 6).map((deployment) => (
                    <div className="rounded-lg bg-[var(--surface-muted)] p-3 text-sm" key={deployment.id}>
                      <div className="flex justify-between gap-3"><span className="font-semibold">{deployment.environment}</span><span>{deployment.status}</span></div>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">{deployment.previewHostname}</p>
                      {deployment.status === "active" ? <button className="mt-2 text-xs font-semibold" onClick={() => promote(deployment.id)}>Promote</button> : null}
                    </div>
                  ))}
                </Panel>
                <Panel title="Domains">
                  <form className="mb-3 flex gap-2" onSubmit={addDomain}>
                    <input className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" name="hostname" placeholder="analytics.protocol.com" />
                    <button className="rounded-lg border border-[var(--border)] px-3 text-sm font-semibold">Add</button>
                  </form>
                  {domains.map((domain) => <Row key={domain.id} left={domain.hostname} right={`${domain.domainType} · ${domain.status}`} />)}
                </Panel>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[460px] place-items-center text-center">
              <div>
                <h2 className="text-3xl font-semibold">Create or import your first project</h2>
                <p className="mt-2 text-[var(--muted)]">GitHub imports, preview deployments, production aliases, and domains live here.</p>
              </div>
            </div>
          )}
        </section>
      </section>

      {message ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm shadow-xl">{message}</div> : null}
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"><p className="mb-3 font-semibold">{title}</p><div className="grid gap-2">{children}</div></div>
}

function Row({ left, right }: { left: string; right: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-muted)] p-3 text-sm"><span className="min-w-0 truncate">{left}</span><span className="shrink-0 text-xs text-[var(--muted)]">{right}</span></div>
}
