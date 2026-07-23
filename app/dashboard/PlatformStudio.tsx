"use client"

import { useEffect, useMemo, useState } from "react"
import type { Build, Project, ProjectFile, ProjectFramework } from "@/types/platform"

type ProjectPayload = {
  project: Project
}

type ProjectsPayload = {
  projects: Project[]
}

type FilesPayload = {
  files: ProjectFile[]
}

type BuildsPayload = {
  builds: Build[]
}

const frameworks: { value: ProjectFramework; label: string; helper: string }[] = [
  { value: "nextjs", label: "Next.js", helper: "Full app router project" },
  { value: "vite", label: "Vite", helper: "Client-heavy analytics UI" },
  { value: "static", label: "Static", helper: "HTML/CSS/JS export" },
]

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }

  if (!response.ok) {
    throw new Error(data.error || "Request failed.")
  }

  return data
}

export default function PlatformStudio() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [activeContent, setActiveContent] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)

  const selectedProject = useMemo(
    () => projects.find((project) => project.slug === selectedSlug) ?? projects[0],
    [projects, selectedSlug],
  )

  useEffect(() => {
    void loadProjects()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    void Promise.all([loadFiles(selectedProject.slug), loadBuilds(selectedProject.slug)])
  }, [selectedProject?.slug])

  useEffect(() => {
    const file = files.find((item) => item.path === activePath) ?? files[0]
    setActivePath(file?.path ?? null)
    setActiveContent(file?.content ?? "")
  }, [files, activePath])

  async function loadProjects() {
    setIsLoading(true)
    try {
      const data = await requestJson<ProjectsPayload>("/api/projects")
      setProjects(data.projects)
      setSelectedSlug((current) => current ?? data.projects[0]?.slug ?? null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load projects.")
    } finally {
      setIsLoading(false)
    }
  }

  async function loadFiles(slug: string) {
    const data = await requestJson<FilesPayload>(`/api/projects/${slug}/files`)
    setFiles(data.files)
  }

  async function loadBuilds(slug: string) {
    const data = await requestJson<BuildsPayload>(`/api/projects/${slug}/builds`)
    setBuilds(data.builds)
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    const name = String(form.get("name") || "").trim()
    const framework = String(form.get("framework") || "nextjs") as ProjectFramework

    if (!name) return

    setMessage("Creating project...")
    try {
      const data = await requestJson<ProjectPayload>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          framework,
          description: form.get("description"),
        }),
      })
      target.reset()
      setProjects((items) => [data.project, ...items])
      setSelectedSlug(data.project.slug)
      setMessage("Project created with starter files.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create project.")
    }
  }

  async function saveFile() {
    if (!selectedProject || !activePath) return
    setIsSaving(true)
    setMessage("Saving source...")

    const nextFiles = files.map((file) =>
      file.path === activePath ? { path: file.path, content: activeContent } : file,
    )

    try {
      const data = await requestJson<FilesPayload>(`/api/projects/${selectedProject.slug}/files`, {
        method: "PUT",
        body: JSON.stringify({ files: nextFiles }),
      })
      setFiles(data.files)
      setMessage("Source saved.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save source.")
    } finally {
      setIsSaving(false)
    }
  }

  async function queueProjectBuild() {
    if (!selectedProject) return
    setIsBuilding(true)
    setMessage("Queueing build...")

    try {
      const data = await requestJson<{ build: Build }>(`/api/projects/${selectedProject.slug}/builds`, {
        method: "POST",
      })
      setBuilds((items) => [data.build, ...items])
      setMessage("Build queued. Worker integration comes next.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not queue build.")
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">LlamaKit</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">Custom code platform</h1>
        </div>
        <a
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
          href="/"
        >
          Home
        </a>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-8 sm:px-8 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <form
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
            onSubmit={createProject}
          >
            <div className="mb-4">
              <p className="text-sm font-semibold">Create custom project</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Start from source code, then build and deploy to our cluster.</p>
            </div>
            <label className="grid gap-1 text-sm font-medium">
              Project name
              <input
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none transition focus:border-[var(--text)]"
                name="name"
                placeholder="PancakeSwap analytics"
              />
            </label>
            <label className="mt-3 grid gap-1 text-sm font-medium">
              Description
              <textarea
                className="min-h-20 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none transition focus:border-[var(--text)]"
                name="description"
                placeholder="Custom analytics site for a protocol team."
              />
            </label>
            <div className="mt-3 grid gap-2">
              <p className="text-sm font-medium">Framework</p>
              {frameworks.map((framework) => (
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-sm transition hover:border-[var(--border-strong)]"
                  key={framework.value}
                >
                  <input
                    className="mt-1"
                    defaultChecked={framework.value === "nextjs"}
                    name="framework"
                    type="radio"
                    value={framework.value}
                  />
                  <span>
                    <span className="block font-semibold">{framework.label}</span>
                    <span className="text-[var(--muted)]">{framework.helper}</span>
                  </span>
                </label>
              ))}
            </div>
            <button className="mt-4 w-full rounded-lg bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition hover:-translate-y-0.5">
              Create project
            </button>
          </form>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Projects</p>
              <span className="text-xs text-[var(--muted)]">{projects.length}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {isLoading ? (
                <p className="rounded-lg bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
                  Loading projects...
                </p>
              ) : projects.length ? (
                projects.map((project) => (
                  <button
                    className={`rounded-lg border p-3 text-left transition hover:-translate-y-0.5 ${
                      project.slug === selectedProject?.slug
                        ? "border-[var(--text)] bg-[var(--surface-muted)]"
                        : "border-[var(--border)] bg-[var(--bg)]"
                    }`}
                    key={project.id}
                    onClick={() => setSelectedSlug(project.slug)}
                    type="button"
                  >
                    <span className="block font-semibold">{project.name}</span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">/{project.slug}</span>
                    <span className="mt-2 inline-flex rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--muted)]">
                      {project.status}
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-lg bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
                  No old sites imported. Create a fresh custom-code project.
                </p>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {selectedProject ? (
            <div className="grid min-h-[720px] lg:grid-cols-[240px_1fr]">
              <div className="border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Workspace</p>
                <h2 className="mt-2 text-2xl font-semibold">{selectedProject.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{selectedProject.description || "No description yet."}</p>

                <div className="mt-5 grid gap-2">
                  {files.map((file) => (
                    <button
                      className={`rounded-lg border px-3 py-2 text-left font-mono text-xs transition ${
                        file.path === activePath
                          ? "border-[var(--text)] bg-[var(--surface-muted)]"
                          : "border-[var(--border)]"
                      }`}
                      key={file.id}
                      onClick={() => {
                        setActivePath(file.path)
                        setActiveContent(file.content)
                      }}
                      type="button"
                    >
                      {file.path}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-0 p-4">
                <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-xs text-[var(--muted)]">{activePath ?? "No file selected"}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Build command: <span className="font-mono">{selectedProject.buildCommand}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isSaving}
                      onClick={saveFile}
                      type="button"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="rounded-lg bg-[var(--text)] px-3 py-2 text-sm font-semibold text-[var(--bg)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBuilding}
                      onClick={queueProjectBuild}
                      type="button"
                    >
                      {isBuilding ? "Queueing..." : "Queue build"}
                    </button>
                  </div>
                </div>

                <textarea
                  className="mt-4 h-[420px] w-full resize-none rounded-lg border border-[var(--border)] bg-[#0b0d10] p-4 font-mono text-xs leading-6 text-[#e8eef8] outline-none focus:border-[var(--border-strong)]"
                  onChange={(event) => setActiveContent(event.target.value)}
                  spellCheck={false}
                  value={activeContent}
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                    <p className="text-sm font-semibold">Deployment path</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Next: connect builder pods, image registry, namespace deploys, ingress, and custom domain DNS.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                    <p className="text-sm font-semibold">Build queue</p>
                    <div className="mt-2 grid gap-2">
                      {builds.length ? (
                        builds.slice(0, 4).map((build) => (
                          <div className="rounded-md bg-[var(--surface-muted)] p-2 text-xs" key={build.id}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold">{build.status}</span>
                              <span className="text-[var(--muted)]">
                                {new Date(build.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="mt-1 text-[var(--muted)]">{build.logs}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--muted)]">No builds queued yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[520px] place-items-center p-6 text-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Fresh start</p>
                <h2 className="mt-3 text-3xl font-semibold">No legacy analytics sites here.</h2>
                <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">
                  This control plane now starts from custom source projects. Create one to begin the deploy pipeline.
                </p>
              </div>
            </div>
          )}
        </section>
      </section>

      {message ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm shadow-xl">
          {message}
        </div>
      ) : null}
    </main>
  )
}
