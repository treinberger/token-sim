import { browser } from '$app/environment';
import { get } from 'svelte/store';
import type { DualConfig } from './schema.js';
import { dualConfig, output } from './stores.js';
import type {
  SimulateRequest,
  WorkerOutbound
} from '$lib/engine/worker.js';

let worker: Worker | null = null;
let runId = 0;
let debounceTimer: number | undefined;

function ensureWorker(): Worker | null {
  if (!browser) return null;
  if (worker) return worker;
  worker = new Worker(
    new URL('$lib/engine/worker.ts', import.meta.url),
    { type: 'module' }
  );
  worker.addEventListener('message', (ev: MessageEvent<WorkerOutbound>) => {
    const msg = ev.data;
    if (msg.type === 'progress') {
      output.update((o) => ({
        ...o,
        progress: {
          ...o.progress,
          [msg.which]: msg.percent
        }
      }));
    } else if (msg.type === 'done' && msg.id === runId) {
      output.set({
        baseline: msg.baseline,
        variant: msg.variant,
        computing: false,
        progress: { baseline: 100, variant: 100 },
        elapsedMs: msg.elapsedMs
      });
    }
  });
  return worker;
}

function dispatch(state: DualConfig): void {
  const w = ensureWorker();
  if (!w) return;
  runId++;
  output.update((o) => ({
    ...o,
    computing: true,
    progress: { baseline: 0, variant: 0 }
  }));
  const req: SimulateRequest = {
    type: 'simulate',
    id: runId,
    baseline: state.baseline,
    variant: state.compareEnabled ? state.variant : null
  };
  w.postMessage(req);
}

export function installComputeLoop(): () => void {
  if (!browser) return () => {};
  const unsub = dualConfig.subscribe((state) => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => dispatch(state), 180);
  });
  // Run once immediately so first paint shows something
  dispatch(get(dualConfig));
  return () => {
    unsub();
    if (worker) {
      worker.terminate();
      worker = null;
    }
  };
}
