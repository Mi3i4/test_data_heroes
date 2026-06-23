export function createTtlCache<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let cached: { value: T; cachedAt: number } | null = null;

  return async (): Promise<T> => {
    if (cached && Date.now() - cached.cachedAt <= ttlMs) {
      return cached.value;
    }

    const value = await load();
    cached = { value, cachedAt: Date.now() };
    return value;
  };
}
