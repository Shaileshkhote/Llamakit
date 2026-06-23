"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, type FormEvent } from "react";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const shellClass =
  "mx-auto grid min-h-dvh w-[min(520px,calc(100vw-40px))] content-center py-10 max-[760px]:w-[min(520px,calc(100vw-24px))]";
const cardClass = "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6";
const inputClass =
  "min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 text-sm text-[var(--text)] outline-none";
const buttonClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--text)] bg-[var(--text)] px-[18px] text-sm font-bold text-[var(--surface)]";
const secondaryLinkClass =
  "inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-[14px] text-sm font-bold text-[var(--text)]";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const error = searchParams.get("error");
  const isSignup = mode === "signup";

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  function submit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (isSignup && password !== confirmPassword) {
      event.preventDefault();
      toast.error("Passwords do not match");
    }
  }

  return (
    <main className={shellClass}>
      <nav className="mb-5 flex items-center justify-between">
        <Link className="inline-flex items-center gap-2.5 text-[15px] font-bold" href="/">
          <span className="grid size-[30px] place-items-center rounded-full border border-[var(--border)] bg-[var(--text)] text-xs text-[var(--surface)]">
            DL
          </span>
          <span>DefiLlama</span>
        </Link>
        <ThemeToggle />
      </nav>

      <section className={cardClass}>
        <p className="m-0 text-[13px] font-semibold text-[var(--muted)]">LlamaKit</p>
        <h1 className="mb-0 mt-2 text-[34px] leading-none">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-3 text-sm leading-[1.55] text-[var(--muted)]">
          {isSignup
            ? "Create analytics sites powered by DefiLlama data."
            : "Log in to manage your analytics sites and domains."}
        </p>

        <form
          action={`/api/auth/${mode}?next=${encodeURIComponent(next)}`}
          className="mt-5 grid gap-3"
          method="post"
          onSubmit={submit}
        >
          {isSignup ? (
            <label className="grid gap-1.5 text-sm text-[var(--muted)]">
              Name
              <input className={inputClass} name="name" required />
            </label>
          ) : null}
          <label className="grid gap-1.5 text-sm text-[var(--muted)]">
            Email
            <input className={inputClass} name="email" required type="email" />
          </label>
          <label className="grid gap-1.5 text-sm text-[var(--muted)]">
            Password
            <input className={inputClass} minLength={8} name="password" required type="password" />
          </label>
          {isSignup ? (
            <label className="grid gap-1.5 text-sm text-[var(--muted)]">
              Confirm password
              <input className={inputClass} minLength={8} name="confirmPassword" required type="password" />
            </label>
          ) : null}
          <button className={buttonClass} type="submit">
            {isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-[var(--muted)]">
            {isSignup ? "Already have an account?" : "New to LlamaKit?"}
          </span>
          <Link className={secondaryLinkClass} href={isSignup ? `/login?next=${encodeURIComponent(next)}` : `/signup?next=${encodeURIComponent(next)}`}>
            {isSignup ? "Log in" : "Sign up"}
          </Link>
        </div>
      </section>
    </main>
  );
}
