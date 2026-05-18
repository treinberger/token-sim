import LZString from 'lz-string';
import { configSchema, dualConfigSchema, type DualConfig } from './schema.js';
import { defaultBaseline, defaultVariant } from '$lib/data/presets.js';

const HASH_KEY = 'cfg';

export function encodeState(state: DualConfig): string {
  const json = JSON.stringify(state);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `${HASH_KEY}=${compressed}`;
}

export function decodeState(hash: string): DualConfig | null {
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);
  const compressed = params.get(HASH_KEY);
  if (!compressed) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json);
    const result = dualConfigSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

export function initialDualConfig(): DualConfig {
  return {
    baseline: defaultBaseline(),
    variant: defaultVariant(),
    compareEnabled: true,
    active: 'baseline',
    zoom: 'session'
  };
}

export function loadInitial(hash: string): DualConfig {
  const decoded = decodeState(hash);
  if (decoded) return decoded;
  return initialDualConfig();
}

export { configSchema };
