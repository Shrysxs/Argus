interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory TTL cache — single-process only, no persistence.
 * Good enough for free-tier rate-limit protection; replace with
 * Redis or similar when moving to a multi-instance deployment.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Exposed for testing — lets you inspect or clear without poking internals. */
  delete(key: string): void {
    this.store.delete(key);
  }

  get size(): number {
    return this.store.size;
  }
}
