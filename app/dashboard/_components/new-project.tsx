"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { requestJson, type User } from "./api"
import { Shell } from "./ui"
import type { Project } from "@/types/platform"

export function NewProjectChooser() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    void Promise.all([
      requestJson<{ user: User }>("/api/auth/me"),
      requestJson<{ projects: Project[] }>("/api/projects"),
    ]).then(([userData, projectData]) => {
      setUser(userData.user)
      setProjects(projectData.projects)
    }).catch(() => undefined)
  }, [])

  return (
    <Shell projects={projects} user={user}>
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-[var(--muted)]">New Project</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal">How do you want to start?</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]" href="/dashboard/new/ai">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-md bg-[var(--surface-muted)] font-semibold">AI</span>
              <span className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">Coming soon</span>
            </div>
            <h2 className="mt-8 text-2xl font-semibold">AI Code</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Describe the analytics site and work side-by-side with a file explorer, editor, and live preview.</p>
          </Link>
          <Link className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]" href="/dashboard/new/github">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-md bg-[var(--text)] font-semibold text-[var(--bg)]">GH</span>
              <span className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">Deploy now</span>
            </div>
            <h2 className="mt-8 text-2xl font-semibold">Import from GitHub</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Select a repository, confirm detected build settings, add secrets, and deploy on LlamaKit.</p>
          </Link>
        </div>
      </div>
    </Shell>
  )
}

export function AiComingSoon() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    void Promise.all([
      requestJson<{ user: User }>("/api/auth/me"),
      requestJson<{ projects: Project[] }>("/api/projects"),
    ]).then(([userData, projectData]) => {
      setUser(userData.user)
      setProjects(projectData.projects)
    }).catch(() => undefined)
  }, [])

  return (
    <Shell projects={projects} user={user}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">AI Code</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Editor preview</h1>
        </div>
        <span className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">Coming soon</span>
      </div>
      <div className="grid min-h-[620px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] lg:grid-cols-[240px_1fr_360px]">
        <aside className="border-b border-[var(--border)] bg-[var(--surface-muted)] p-4 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Files</p>
          {["app/page.tsx", "components/chart.tsx", "lib/data.ts", "package.json"].map((file, index) => (
            <div className={`mt-3 rounded-md px-3 py-2 font-mono text-xs ${index === 0 ? "bg-[var(--surface)]" : ""}`} key={file}>{file}</div>
          ))}
        </aside>
        <section className="grid grid-rows-[1fr_auto]">
          <pre className="m-0 overflow-auto bg-[#0b0d10] p-5 text-xs leading-6 text-[#dbe7ff]">{`export default function AnalyticsSite() {
  return (
    <main>
      <h1>Protocol analytics</h1>
      <MetricGrid />
      <LiveChart />
    </main>
  )
}`}</pre>
          <div className="border-t border-[var(--border)] p-3">
            <div className="flex gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] p-2">
              <input className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" disabled placeholder="Ask LlamaKit to build a protocol analytics page" />
              <button className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted)]" disabled type="button">Coming soon</button>
            </div>
          </div>
        </section>
        <aside className="border-t border-[var(--border)] p-4 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Live preview</p>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <p className="text-sm text-[var(--muted)]">analytics.protocol.com</p>
            <h2 className="mt-4 text-2xl font-semibold">Protocol analytics</h2>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {["TVL", "Fees", "Volume", "Revenue"].map((item) => <div className="rounded-md bg-[var(--surface-muted)] p-3 text-sm" key={item}>{item}<p className="mt-2 font-semibold">$--</p></div>)}
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  )
}
