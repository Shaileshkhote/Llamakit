"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { requestJson, type User } from "./api"
import { EmptyState, Panel, Shell, StatusPill } from "./ui"
import type { Project } from "@/types/platform"

export default function ProjectsHome() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    void Promise.all([
      requestJson<{ user: User }>("/api/auth/me"),
      requestJson<{ projects: Project[] }>("/api/projects"),
    ]).then(([userData, projectData]) => {
      setUser(userData.user)
      setProjects(projectData.projects)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => projects.filter((project) => `${project.name} ${project.slug} ${project.defaultDomain}`.toLowerCase().includes(query.toLowerCase())),
    [projects, query],
  )

  return (
    <Shell projects={projects} user={user}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">Projects</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Your LlamaKit projects</h1>
        </div>
        <Link className="rounded-md bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)]" href="/dashboard/new">
          Create New Project
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          className="h-10 w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--border-strong)]"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects"
          value={query}
        />
        <a className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold" href="/api/github/installations/start">
          Install GitHub App
        </a>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div className="h-44 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]" key={item} />)}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <Link
              className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
              href={`/dashboard/projects/${project.slug}`}
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{project.name}</h2>
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">{project.defaultDomain}</p>
                </div>
                <StatusPill value={project.status} />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[var(--muted)]">Source</p>
                  <p className="mt-1 font-medium">{project.sourceProvider}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Framework</p>
                  <p className="mt-1 font-medium">{project.framework}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[var(--muted)]">Production branch</p>
                  <p className="mt-1 font-mono text-xs">{project.productionBranch}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          action={<Link className="rounded-md bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)]" href="/dashboard/new">Create New Project</Link>}
          copy="Import a GitHub repository or open the AI code workspace preview."
          title="No projects yet"
        />
      )}

      {projects.length ? (
        <div className="mt-6">
          <Panel title="Recent activity" eyebrow="Control plane">
            <div className="grid gap-2 text-sm text-[var(--muted)]">
              {projects.slice(0, 4).map((project) => (
                <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--surface-muted)] p-3" key={project.id}>
                  <span className="truncate">{project.name}</span>
                  <StatusPill value={project.status} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}
    </Shell>
  )
}
