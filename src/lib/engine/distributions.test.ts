import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng.js';
import {
  truncatedNormal,
  truncatedNormalInt,
  binomial,
  zipfActivationCount
} from './distributions.js';

describe('truncatedNormal', () => {
  it('returns floor when sd = 0 and mean < floor', () => {
    const r = mulberry32(1);
    expect(truncatedNormal(r, { mean: -10, sd: 0 }, 0)).toBe(0);
  });

  it('returns mean when sd = 0', () => {
    const r = mulberry32(1);
    expect(truncatedNormal(r, { mean: 42, sd: 0 }, 0)).toBe(42);
  });

  it('respects the floor (≥ 0 by default)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = truncatedNormal(r, { mean: 10, sd: 50 });
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('has mean roughly equal to input mean for symmetric distributions', () => {
    const r = mulberry32(99);
    let sum = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      sum += truncatedNormal(r, { mean: 100, sd: 5 }, 0);
    }
    expect(sum / N).toBeCloseTo(100, 0);
  });
});

describe('truncatedNormalInt', () => {
  it('returns integer >= floor', () => {
    const r = mulberry32(3);
    for (let i = 0; i < 1000; i++) {
      const v = truncatedNormalInt(r, { mean: 30, sd: 10 }, 3);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('binomial', () => {
  it('returns 0 when p=0', () => {
    const r = mulberry32(1);
    expect(binomial(r, 100, 0)).toBe(0);
  });

  it('returns n when p=1', () => {
    const r = mulberry32(1);
    expect(binomial(r, 50, 1)).toBe(50);
  });

  it('returns 0 when n=0', () => {
    const r = mulberry32(1);
    expect(binomial(r, 0, 0.5)).toBe(0);
  });

  it('has expected mean ~ np over many trials', () => {
    const r = mulberry32(11);
    let sum = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      sum += binomial(r, 20, 0.3);
    }
    expect(sum / trials).toBeCloseTo(20 * 0.3, 1);
  });
});

describe('zipfActivationCount', () => {
  it('returns 0 for n=0', () => {
    const r = mulberry32(1);
    expect(zipfActivationCount(r, 0, 5, 1.3)).toBe(0);
  });

  it('returns n when expected >= n', () => {
    const r = mulberry32(1);
    expect(zipfActivationCount(r, 10, 100, 1.3)).toBe(10);
  });

  it('mean roughly tracks expected count', () => {
    const r = mulberry32(1);
    let sum = 0;
    const trials = 1500;
    for (let i = 0; i < trials; i++) {
      sum += zipfActivationCount(r, 30, 9, 1.3);
    }
    const mean = sum / trials;
    expect(mean).toBeGreaterThan(7);
    expect(mean).toBeLessThan(11);
  });
});
