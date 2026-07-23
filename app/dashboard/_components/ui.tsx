"use client"

import Link from "next/link"
import { useState } from "react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import type { Project } from "@/types/platform"

export function Shell({
  children,
  user,
  projects = [],
}: {
  children: React.ReactNode
  user: { email: string; name: string } | null
  projects?: Project[]
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link className="flex items-center gap-2 font-semibold" href="/dashboard">
            <span className="grid size-7 place-items-center rounded-md bg-[var(--text)] text-xs text-[var(--bg)]">LK</span>
            <span>LlamaKit</span>
          </Link>
          <div className="hidden min-w-0 flex-1 justify-center px-8 md:flex">
            <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)]">
              Search projects, domains, deployments
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link className="rounded-md bg-[var(--text)] px-3 py-2 text-sm font-semibold text-[var(--bg)]" href="/dashboard/new">
              <span className="hidden sm:inline">Create New Project</span>
              <span className="sm:hidden">New</span>
            </Link>
            <a className="hidden rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold sm:inline-flex" href="/api/github/installations/start">
              GitHub
            </a>
            <div className="relative">
              <button
                className="grid size-9 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold"
                onClick={() => setMenuOpen((open) => !open)}
                type="button"
              >
                {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-11 w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
                  <div className="border-b border-[var(--border)] p-3">
                    <p className="font-semibold">{user?.name || "Account"}</p>
                    <p className="mt-1 truncate text-sm text-[var(--muted)]">{user?.email}</p>
                  </div>
                  <Link className="mt-2 flex rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-muted)]" href="/dashboard">Projects</Link>
                  <Link className="flex rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-muted)]" href="/dashboard/new">Create project</Link>
                  <a className="flex rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-muted)]" href="/api/github/installations/start">Install GitHub App</a>
                  <button className="mt-2 flex w-full rounded-md px-3 py-2 text-left text-sm text-[var(--bad)] hover:bg-[var(--surface-muted)]" onClick={logout} type="button">
                    Logout
                  </button>
                  {projects.length ? (
                    <div className="mt-2 border-t border-[var(--border)] pt-2">
                      {projects.slice(0, 3).map((project) => (
                        <Link className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-muted)]" href={`/dashboard/projects/${project.slug}`} key={project.id}>
                          <span className="block truncate font-medium">{project.name}</span>
                          <span className="block truncate text-xs text-[var(--muted)]">{project.defaultDomain}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
    </main>
  )
}

export function Panel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p> : null}
          <h2 className="mt-1 text-base font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function StatusPill({ value }: { value: string }) {
  const good = ["active", "succeeded", "deployed", "production"].includes(value)
  const bad = ["failed", "cancelled"].includes(value)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
      good
        ? "border-[color-mix(in_srgb,var(--good)_30%,var(--border))] text-[var(--good)]"
        : bad
          ? "border-[color-mix(in_srgb,var(--bad)_30%,var(--border))] text-[var(--bad)]"
          : "border-[var(--border)] text-[var(--muted)]"
    }`}>
      <span className="size-1.5 rounded-full bg-current" />
      {value}
    </span>
  )
}

export function EmptyState({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  )
}

export function CustomSelect({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label?: string
  name: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value) ?? options[0]

  return (
    <label className="relative grid gap-1.5 text-sm">
      {label ? <span>{label}</span> : null}
      <input name={name} type="hidden" value={value} />
      <button
        className="flex h-10 items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-left text-sm outline-none transition hover:border-[var(--border-strong)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selected?.label ?? value}</span>
        <span className={`text-[var(--muted)] transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
          {options.map((option) => (
            <button
              className={`flex w-full rounded px-3 py-2 text-left text-sm transition hover:bg-[var(--surface-muted)] ${
                option.value === value ? "bg-[var(--surface-muted)] font-semibold" : ""
              }`}
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  )
}
