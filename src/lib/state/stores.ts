import { writable, derived, get, type Writable } from 'svelte/store';
import type { DualConfig } from './schema.js';
import type { Config } from '$lib/engine/types.js';
import type { RunOutput } from '$lib/engine/types.js';
import { encodeState, initialDualConfig, loadInitial } from './url.js';
import { browser } from '$app/environment';

export const dualConfig: Writable<DualConfig> = writable(initialDualConfig());

export interface OutputState {
  baseline: RunOutput | null;
  variant: RunOutput | null;
  computing: boolean;
  progress: { baseline: number; variant: number };
  elapsedMs: number;
}

export const output: Writable<OutputState> = writable({
  baseline: null,
  variant: null,
  computing: false,
  progress: { baseline: 0, variant: 0 },
  elapsedMs: 0
});

export const activeConfig = derived(dualConfig, ($d) =>
  $d.active === 'baseline' ? $d.baseline : $d.variant
);

export function updateActive(mut: (c: Config) => Config): void {
  dualConfig.update(($d) => {
    if ($d.active === 'baseline') {
      return { ...$d, baseline: mut($d.baseline) };
    }
    return { ...$d, variant: mut($d.variant) };
  });
}

export function setActive(which: 'baseline' | 'variant'): void {
  dualConfig.update(($d) => ({ ...$d, active: which }));
}

export function setBoth(baseline: Config, variant: Config): void {
  dualConfig.update(($d) => ({ ...$d, baseline, variant }));
}

export function setActiveTo(cfg: Config): void {
  dualConfig.update(($d) => {
    if ($d.active === 'baseline') return { ...$d, baseline: cfg };
    return { ...$d, variant: cfg };
  });
}

export function copyActiveToOther(): void {
  dualConfig.update(($d) => {
    if ($d.active === 'baseline') return { ...$d, variant: structuredClone($d.baseline) };
    return { ...$d, baseline: structuredClone($d.variant) };
  });
}

export function toggleCompare(): void {
  dualConfig.update(($d) => ({ ...$d, compareEnabled: !$d.compareEnabled }));
}

export function setZoom(z: DualConfig['zoom']): void {
  dualConfig.update(($d) => ({ ...$d, zoom: z }));
}

let urlSyncInstalled = false;

export function installUrlSync(): () => void {
  if (!browser || urlSyncInstalled) return () => {};
  urlSyncInstalled = true;

  // Initial load from hash
  const initial = loadInitial(window.location.hash);
  dualConfig.set(initial);

  let writeTimer: number | undefined;
  const unsub = dualConfig.subscribe(($d) => {
    if (writeTimer) window.clearTimeout(writeTimer);
    writeTimer = window.setTimeout(() => {
      const encoded = encodeState($d);
      const target = `#${encoded}`;
      if (window.location.hash !== target) {
        history.replaceState(null, '', target);
      }
    }, 250);
  });

  const onHash = () => {
    const decoded = loadInitial(window.location.hash);
    if (JSON.stringify(decoded) !== JSON.stringify(get(dualConfig))) {
      dualConfig.set(decoded);
    }
  };
  window.addEventListener('hashchange', onHash);

  return () => {
    unsub();
    window.removeEventListener('hashchange', onHash);
    urlSyncInstalled = false;
  };
}

export function shareableUrl(): string {
  if (!browser) return '';
  const encoded = encodeState(get(dualConfig));
  return `${window.location.origin}${window.location.pathname}#${encoded}`;
}
