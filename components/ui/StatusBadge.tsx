export function StatusBadge({
  status,
  children,
}: {
  status: "ok" | "stale" | "unsupported" | "error" | "active" | "verifying";
  children: React.ReactNode;
}) {
  const statusClass =
    status === "ok" || status === "active"
      ? "text-[var(--muted)]"
      : status === "stale" || status === "verifying"
        ? "text-[var(--warn)]"
        : "text-[var(--bad)]";

  return (
    <span
      className={`${statusClass} inline-flex items-center gap-1.5 text-xs leading-[1.2] before:size-1.5 before:rounded-full before:bg-current before:content-['']`}
    >
      {children}
    </span>
  );
}
