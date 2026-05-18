import { describe, it, expect } from 'vitest';
import { coherence, clamp01 } from './coherence.js';

const Q = { decayStartPct: 0.5, steepness: 10, floor: 0.3 };

describe('coherence', () => {
  it('is near 1 well below decay start', () => {
    expect(coherence(0.05, Q, 0)).toBeGreaterThan(0.95);
  });

  it('is near floor when well past decay start', () => {
    expect(coherence(0.95, Q, 0)).toBeLessThan(Q.floor + 0.05);
  });

  it('passes the midpoint near decayStartPct', () => {
    const mid = coherence(Q.decayStartPct, Q, 0);
    expect(mid).toBeGreaterThan(0.6);
    expect(mid).toBeLessThan(0.7);
  });

  it('penalty subtracts from coherence and clamps', () => {
    const base = coherence(0.1, Q, 0);
    const penalized = coherence(0.1, Q, 0.5);
    expect(penalized).toBeLessThan(base);
    expect(penalized).toBeGreaterThanOrEqual(0);
  });
});

describe('clamp01', () => {
  it('clamps below 0 to 0', () => {
    expect(clamp01(-1)).toBe(0);
  });
  it('clamps above 1 to 1', () => {
    expect(clamp01(2)).toBe(1);
  });
  it('passes through values in range', () => {
    expect(clamp01(0.5)).toBe(0.5);
  });
  it('returns 0 for NaN', () => {
    expect(clamp01(NaN)).toBe(0);
  });
});
