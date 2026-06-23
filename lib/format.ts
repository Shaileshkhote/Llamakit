import dayjs from "dayjs"

export function formatUsd(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "Not currently tracked"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  if (abs >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(4)}`
}

export function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "Not currently tracked"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "Not currently tracked"
  return `${value.toFixed(2)}%`
}

export function formatTimestamp(timestamp: number | null | undefined) {
  if (!timestamp) return "Unknown"
  return dayjs(timestamp * 1000).format("DD MMM YYYY, HH:mm [UTC]")
}

export function getLatestTimestamp(points: Array<{ timestamp: number; value: number | null }>) {
  return points
    .filter((point) => point.value != null)
    .reduce((latest, point) => Math.max(latest, point.timestamp), 0)
}

export function getUtcDayStart(timestampMs = Date.now()) {
  const date = new Date(timestampMs)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000
}

export function isCompletedUtcDay(timestamp: number, nowMs = Date.now()) {
  return timestamp < getUtcDayStart(nowMs)
}
