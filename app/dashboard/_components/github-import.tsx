"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { frameworks, loadRepositories, requestJson, type User } from "./api"
import { useToast } from "./toast"
import { CustomSelect, Shell, StatusPill } from "./ui"
import type { GitHubRepository, Project } from "@/types/platform"

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
}

function defaultCommands(framework: string) {
  if (framework === "vite") return { installCommand: "pnpm install", buildCommand: "pnpm build", startCommand: "pnpm preview -- --host 0.0.0.0 --port 3000" }
  if (framework === "static") return { installCommand: "true", buildCommand: "true", startCommand: "npx serve . -l 3000" }
  return { installCommand: "pnpm install", buildCommand: "pnpm build", startCommand: "pnpm start" }
}

export default function GitHubImportPageClient() {
  const { notify } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<GitHubRepository | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [framework, setFramework] = useState("nextjs")

  useEffect(() => {
    void bootstrap()
  }, [])

  async function bootstrap() {
    try {
      const [userData, projectData, repoData] = await Promise.all([
        requestJson<{ user: User }>("/api/auth/me"),
        requestJson<{ projects: Project[] }>("/api/projects"),
        loadRepositories(),
      ])
      setUser(userData.user)
      setProjects(projectData.projects)
      setRepositories(repoData.repositories)
    } catch (error) {
      notify({ title: "Dashboard data unavailable", message: error instanceof Error ? error.message : "Refresh and try again.", tone: "error" })
    } finally {
      setLoading(false)
    }
  }

  async function syncRepos() {
    setSyncing(true)
    try {
      const data = await requestJson<{ repositories: GitHubRepository[]; synced: number }>("/api/github/repositories/sync", { method: "POST" })
      setRepositories(data.repositories)
      notify({ title: "Repositories refreshed", message: `${data.synced} repositories synced.`, tone: "success" })
    } catch (error) {
      notify({ title: "Could not refresh repositories", message: error instanceof Error ? error.message : "Try installing the app again.", tone: "error" })
    } finally {
      setSyncing(false)
    }
  }

  const filtered = useMemo(
    () => repositories.filter((repo) => repo.fullName.toLowerCase().includes(query.toLowerCase())),
    [repositories, query],
  )

  async function importRepo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    try {
      const data = await requestJson<{ project: Project }>("/api/projects/import/github", {
        method: "POST",
        body: JSON.stringify({
          repositoryId: selected.repositoryId,
          name: form.get("name"),
          slug: form.get("slug"),
          branch: form.get("branch"),
          rootDirectory: form.get("rootDirectory") || ".",
          framework: form.get("framework"),
          installCommand: form.get("installCommand"),
          buildCommand: form.get("buildCommand"),
          startCommand: form.get("startCommand"),
        }),
      })
      notify({ title: "Project imported", message: "Build queued. Opening project workspace.", tone: "success" })
      window.location.href = `/dashboard/projects/${data.project.slug}`
    } catch (error) {
      notify({ title: "Import failed", message: error instanceof Error ? error.message : "Could not import repository.", tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const commands = defaultCommands(framework)

  return (
    <Shell projects={projects} user={user}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">New Project</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Import GitHub repository</h1>
        </div>
        <a className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold" href="/api/github/installations/start">Install GitHub App</a>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--border-strong)]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search repositories"
              value={query}
            />
            <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold disabled:opacity-60" disabled={syncing} onClick={syncRepos} type="button">
              {syncing ? "Refreshing..." : "Refresh repositories"}
            </button>
          </div>
          <div className="max-h-[620px] overflow-auto p-2">
            {loading ? <p className="p-4 text-sm text-[var(--muted)]">Loading repositories...</p> : null}
            {!loading && !repositories.length ? (
              <div className="p-8 text-center">
                <h2 className="text-xl font-semibold">Install the GitHub App</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">Connect GitHub to list repositories you can deploy.</p>
                <a className="mt-5 inline-flex rounded-md bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)]" href="/api/github/installations/start">Install GitHub App</a>
              </div>
            ) : null}
            {filtered.map((repo) => (
              <button
                className={`mb-2 flex w-full items-center justify-between gap-4 rounded-md border p-4 text-left transition hover:border-[var(--border-strong)] ${
                  selected?.repositoryId === repo.repositoryId ? "border-[var(--text)] bg-[var(--surface-muted)]" : "border-[var(--border)]"
                }`}
                key={repo.repositoryId}
                onClick={() => setSelected(repo)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{repo.fullName}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">Default branch: {repo.defaultBranch} · {repo.private ? "Private" : "Public"}</span>
                </span>
                <StatusPill value={repo.private ? "private" : "public"} />
              </button>
            ))}
          </div>
        </section>

        <form className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5" onSubmit={importRepo}>
          <h2 className="text-lg font-semibold">Project setup</h2>
          {selected ? (
            <p className="mt-1 text-sm text-[var(--muted)]">Deploying {selected.fullName}</p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">Select a repository to prefill project settings.</p>
          )}
          <div className="mt-5 grid gap-3">
            <Field defaultValue={selected?.name ?? ""} label="Project name" name="name" />
            <Field defaultValue={selected ? slugify(selected.name) : ""} label="Slug" name="slug" />
            <Field defaultValue={selected?.defaultBranch ?? "main"} label="Production branch" name="branch" />
            <Field defaultValue="." label="Root directory" name="rootDirectory" />
            <CustomSelect label="Framework" name="framework" onChange={setFramework} options={frameworks} value={framework} />
            <Field defaultValue={commands.installCommand} label="Install command" name="installCommand" />
            <Field defaultValue={commands.buildCommand} label="Build command" name="buildCommand" />
            <Field defaultValue={commands.startCommand} label="Start command" name="startCommand" />
          </div>
          <button className="mt-5 w-full rounded-md bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] disabled:opacity-50" disabled={!selected || submitting} type="submit">
            {submitting ? "Importing..." : "Import and Deploy"}
          </button>
          <Link className="mt-3 block text-center text-sm text-[var(--muted)]" href="/dashboard/new">Back to options</Link>
        </form>
      </div>
    </Shell>
  )
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <input className="h-10 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 outline-none focus:border-[var(--border-strong)]" defaultValue={defaultValue} key={`${name}-${defaultValue}`} name={name} />
    </label>
  )
}
