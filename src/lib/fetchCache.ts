const cache = new Map<string, { data: any; timestamp: number }>();

export async function cachedFetch(url: string, ttl = 3000) {
  const now = Date.now();
  const cached = cache.get(url);
  
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data;
  }
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.statusText}`);
  }
  const data = await res.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}

/**
 * Fire-and-forget prefetch — starts the request immediately and stores
 * the result in cache. Subsequent cachedFetch calls for the same URL
 * within the TTL window return instantly from cache.
 */
export function prefetchUrl(url: string, ttl = 30000) {
  const now = Date.now();
  const cached = cache.get(url);
  // Skip if already fresh
  if (cached && (now - cached.timestamp) < ttl) return;

  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      cache.set(url, { data, timestamp: Date.now() });
    })
    .catch(() => {/* silent — cachedFetch will retry if needed */});
}

export function clearFetchCache(url?: string) {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}
