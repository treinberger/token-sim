import type { Config, ModelId } from '$lib/engine/types.js';

// Approximate Anthropic pricing as of 2026-05.
// All values editable in UI. Min-cacheable from public docs.
export interface ModelDefaults {
  id: ModelId;
  label: string;
  ctxWindow: number;            // default
  ctxWindowMax: number;         // hard cap the slider respects
  priceInputPerM: number;
  priceOutputPerM: number;
  priceCacheWrite5mPerM: number;
  priceCacheWrite1hPerM: number;
  priceCacheReadPerM: number;
  minCacheableTokens: number;
}

export const MODEL_DEFAULTS: Record<ModelId, ModelDefaults> = {
  'opus-4-7': {
    id: 'opus-4-7',
    label: 'Opus 4.7',
    ctxWindow: 200_000,
    ctxWindowMax: 200_000,
    priceInputPerM: 15.0,
    priceOutputPerM: 75.0,
    priceCacheWrite5mPerM: 18.75,
    priceCacheWrite1hPerM: 30.0,
    priceCacheReadPerM: 1.5,
    minCacheableTokens: 4096
  },
  'sonnet-4-6': {
    id: 'sonnet-4-6',
    label: 'Sonnet 4.6',
    ctxWindow: 1_000_000,
    ctxWindowMax: 1_000_000,
    priceInputPerM: 3.0,
    priceOutputPerM: 15.0,
    priceCacheWrite5mPerM: 3.75,
    priceCacheWrite1hPerM: 6.0,
    priceCacheReadPerM: 0.3,
    minCacheableTokens: 1024
  },
  'haiku-4-5': {
    id: 'haiku-4-5',
    label: 'Haiku 4.5',
    ctxWindow: 200_000,
    ctxWindowMax: 200_000,
    priceInputPerM: 1.0,
    priceOutputPerM: 5.0,
    priceCacheWrite5mPerM: 1.25,
    priceCacheWrite1hPerM: 2.0,
    priceCacheReadPerM: 0.1,
    minCacheableTokens: 4096
  }
};

export function applyModelDefaults(cfg: Config, id: ModelId): Config {
  const m = MODEL_DEFAULTS[id];
  return {
    ...cfg,
    model: {
      id: m.id,
      ctxWindow: m.ctxWindow,
      priceInputPerM: m.priceInputPerM,
      priceOutputPerM: m.priceOutputPerM,
      priceCacheWrite5mPerM: m.priceCacheWrite5mPerM,
      priceCacheWrite1hPerM: m.priceCacheWrite1hPerM,
      priceCacheReadPerM: m.priceCacheReadPerM,
      minCacheableTokens: m.minCacheableTokens
    }
  };
}
