export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type TtlCacheOptions = {
  now?: () => number;
};

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly now: () => number;

  constructor(options: TtlCacheOptions = {}) {
    this.now = options.now ?? Date.now;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): T {
    this.entries.set(key, {
      value,
      expiresAt: this.now() + Math.max(0, ttlMs),
    });

    return value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

