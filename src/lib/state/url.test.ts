import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, initialDualConfig } from './url.js';

describe('url codec', () => {
  it('round-trips a dual config', () => {
    const initial = initialDualConfig();
    const encoded = encodeState(initial);
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = decodeState(`#${encoded}`);
    expect(decoded).not.toBeNull();
    expect(decoded?.baseline.model.id).toBe(initial.baseline.model.id);
    expect(decoded?.variant.mcpServers.installed).toBe(initial.variant.mcpServers.installed);
    expect(decoded?.compareEnabled).toBe(initial.compareEnabled);
  });

  it('returns null for malformed hash', () => {
    expect(decodeState('#cfg=not-valid')).toBeNull();
    expect(decodeState('#')).toBeNull();
    expect(decodeState('')).toBeNull();
  });

  it('rejects schema-invalid payload', () => {
    // Compressed JSON for an empty object — fails schema
    const broken = encodeState({} as any).replace('cfg=', 'cfg=');
    const decoded = decodeState(`#${broken}`);
    // Actually let's encode invalid manually:
    const bad = decodeState('#cfg=N4IgZg9gNgpgrgFwM4QFwgC4F8A');
    expect(bad).toBeNull();
  });
});
