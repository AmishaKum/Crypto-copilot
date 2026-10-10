// In-memory TTL cache with stale fallback, to respect free-tier API limits.
// Concurrent callers for the same key share one in-flight request.
const store = new Map();
const inflight = new Map();

/**
 * Returns { value, fetchedAt, stale }. If the refresh fails and an older value exists,
 * that value is returned with stale: true and the error message; otherwise the error is thrown.
 */
export async function cached(key, ttlMs, fn) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.fetchedAt < ttlMs) return { value: hit.value, fetchedAt: hit.fetchedAt, stale: false };
  if (!inflight.has(key)) {
    inflight.set(
      key,
      fn()
        .then((value) => {
          store.set(key, { value, fetchedAt: Date.now() });
          return store.get(key);
        })
        .finally(() => inflight.delete(key))
    );
  }
  try {
    const fresh = await inflight.get(key);
    return { value: fresh.value, fetchedAt: fresh.fetchedAt, stale: false };
  } catch (err) {
    if (hit) return { value: hit.value, fetchedAt: hit.fetchedAt, stale: true, staleReason: err.message };
    throw err;
  }
}

export const clearCache = () => store.clear();
