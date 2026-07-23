"use client"

import Link from "next/link"
import { useState } from "react"

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    })
    const data = await response.json().catch(() => ({}))
    setLoading(false)
    if (!response.ok) {
      setError(data.error || "Authentication failed.")
      return
    }
    window.location.href = "/dashboard"
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5 text-[var(--text)]">
      <form className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6" onSubmit={submit}>
        <Link className="text-sm font-bold" href="/">LlamaKit</Link>
        <h1 className="mt-6 text-3xl font-semibold">{mode === "login" ? "Log in" : "Create account"}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Deploy custom analytics sites with GitHub imports and production domains.</p>
        <a className="mt-6 flex h-11 items-center justify-center rounded-lg border border-[var(--border)] font-semibold" href="/api/auth/github/start">
          Continue with GitHub
        </a>
        <div className="my-5 h-px bg-[var(--border)]" />
        {mode === "signup" ? (
          <input className="mb-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="name" placeholder="Name" />
        ) : null}
        <input className="mb-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="email" placeholder="Email" type="email" />
        <input className="mb-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" name="password" placeholder="Password" type="password" />
        {error ? <p className="mb-3 text-sm text-[var(--bad)]">{error}</p> : null}
        <button className="h-11 w-full rounded-lg bg-[var(--text)] font-semibold text-[var(--bg)]" disabled={loading}>
          {loading ? "Working..." : mode === "login" ? "Log in" : "Sign up"}
        </button>
        <p className="mt-4 text-sm text-[var(--muted)]">
          {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
          <Link className="font-semibold text-[var(--text)]" href={mode === "login" ? "/signup" : "/login"}>
            {mode === "login" ? "Sign up" : "Log in"}
          </Link>
        </p>
      </form>
    </main>
  )
}
