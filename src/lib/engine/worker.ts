import type { Config, RunOutput } from './types.js';
import { runMonteCarlo } from './monteCarlo.js';

export interface SimulateRequest {
  type: 'simulate';
  id: number;
  baseline: Config;
  variant: Config | null;
}

export interface SimulateProgress {
  type: 'progress';
  id: number;
  which: 'baseline' | 'variant';
  percent: number;
}

export interface SimulateDone {
  type: 'done';
  id: number;
  baseline: RunOutput;
  variant: RunOutput | null;
  elapsedMs: number;
}

export type WorkerOutbound = SimulateProgress | SimulateDone;

self.addEventListener('message', (ev: MessageEvent<SimulateRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== 'simulate') return;

  const start = performance.now();
  const baseline = runMonteCarlo(msg.baseline, {
    onProgress: (p) => {
      const out: SimulateProgress = {
        type: 'progress',
        id: msg.id,
        which: 'baseline',
        percent: p.percent
      };
      (self as unknown as Worker).postMessage(out);
    }
  });

  let variant: RunOutput | null = null;
  if (msg.variant) {
    variant = runMonteCarlo(msg.variant, {
      onProgress: (p) => {
        const out: SimulateProgress = {
          type: 'progress',
          id: msg.id,
          which: 'variant',
          percent: p.percent
        };
        (self as unknown as Worker).postMessage(out);
      }
    });
  }

  const done: SimulateDone = {
    type: 'done',
    id: msg.id,
    baseline,
    variant,
    elapsedMs: performance.now() - start
  };
  (self as unknown as Worker).postMessage(done);
});
