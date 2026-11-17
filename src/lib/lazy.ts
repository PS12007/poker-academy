import { lazy, type ComponentType } from 'react';

const KEY = 'poker-academy:chunk-reload';

/**
 * After a new deploy, files from the previous build are deleted. A tab that was
 * opened before the deploy still references them, so navigating to a page that
 * has not loaded yet fails to fetch its chunk. Reloading picks up the new build.
 * The timestamp guard stops a reload loop if the failure has another cause.
 */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 15_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Storage blocked: reload anyway, the guard is best effort.
  }
  window.location.reload();
  return true;
}

export function isChunkError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch|error loading dynamically/i.test(msg);
}

/** React.lazy that reloads the page once when a chunk from an old deploy is missing. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRetry<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load().catch((e: unknown) => {
      if (isChunkError(e) && reloadForNewVersion()) return new Promise<{ default: T }>(() => undefined);
      throw e;
    }),
  );
}

/** Vite fires this when a preloaded dependency of a chunk fails. */
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });
}
