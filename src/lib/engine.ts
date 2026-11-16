import * as Comlink from 'comlink';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EngineApi } from '../workers/engine.worker';

export type Engine = Comlink.Remote<EngineApi>;

function spawn(): { api: Engine; worker: Worker } {
  const worker = new Worker(new URL('../workers/engine.worker.ts', import.meta.url), { type: 'module' });
  return { api: Comlink.wrap<EngineApi>(worker), worker };
}

let shared: Engine | null = null;
/** Long-lived worker for small background numbers in lessons. Never cancelled. */
export function sharedEngine(): Engine {
  if (!shared) shared = spawn().api;
  return shared;
}

export type JobStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface Job<T> {
  status: JobStatus;
  progress: number;
  result: T | null;
  error: string | null;
  run: (fn: (api: Engine, onProgress: (f: number) => void) => Promise<T>) => void;
  cancel: () => void;
}

/**
 * Runs one engine call in its own worker. Starting a new run or calling cancel
 * terminates the worker, which is the only reliable way to stop a tight loop.
 */
export function useJob<T>(): Job<T> {
  const [status, setStatus] = useState<JobStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<Worker | null>(null);
  const token = useRef(0);

  const kill = useCallback(() => {
    current.current?.terminate();
    current.current = null;
  }, []);

  const cancel = useCallback(() => {
    token.current++;
    kill();
    setStatus((s) => (s === 'running' ? 'cancelled' : s));
  }, [kill]);

  const run = useCallback<Job<T>['run']>(
    (fn) => {
      kill();
      const my = ++token.current;
      const { api, worker } = spawn();
      current.current = worker;
      setStatus('running');
      setProgress(0);
      setError(null);
      fn(
        api,
        Comlink.proxy((f: number) => {
          if (token.current === my) setProgress(f);
        }),
      )
        .then((r) => {
          if (token.current !== my) return;
          setResult(r);
          setProgress(1);
          setStatus('done');
        })
        .catch((e: unknown) => {
          if (token.current !== my) return;
          setError(e instanceof Error ? e.message : String(e));
          setStatus('error');
        })
        .finally(() => {
          if (current.current === worker) {
            worker.terminate();
            current.current = null;
          }
        });
    },
    [kill],
  );

  useEffect(() => () => kill(), [kill]);
  return { status, progress, result, error, run, cancel };
}

const cache = new Map<string, Promise<unknown>>();
/** Memoized call on the shared worker, keyed by a string. */
export function cached<T>(key: string, fn: (api: Engine) => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fn(sharedEngine());
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

export function useCached<T>(key: string, fn: (api: Engine) => Promise<T>): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null }>({ key, data: null, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let live = true;
    cached(key, (api) => fnRef.current(api))
      .then((data) => live && setState({ key, data, error: null }))
      .catch((e: unknown) => live && setState({ key, data: null, error: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [key]);
  return state.key === key ? { data: state.data, error: state.error } : { data: null, error: null };
}
