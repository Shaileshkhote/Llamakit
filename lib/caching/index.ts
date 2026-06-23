export * from "./ttl-cache"
export { TtlCache as MemoryTtlCache } from "./ttl-cache"

export function createCache<T = unknown>(options: { ttlMs?: number; defaultTtlMs?: number } = {}) {
  const defaultTtlMs = options.ttlMs ?? options.defaultTtlMs ?? 5 * 60 * 1000
  const entries = new Map<string, { value: T; expiresAt: number }>()

  return {
    get(key: string): T | undefined {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key: string, value: T, writeOptions: { ttlMs?: number } = {}): T {
      entries.set(key, {
        value,
        expiresAt: Date.now() + (writeOptions.ttlMs ?? defaultTtlMs)
      })
      return value
    },
    delete(key: string): boolean {
      return entries.delete(key)
    },
    clear(): void {
      entries.clear()
    }
  }
}
