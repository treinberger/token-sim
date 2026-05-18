import { describe, it, expect } from 'vitest';
import { mulberry32, hashStringToSeed } from './rng.js';

describe('mulberry32', () => {
  it('is deterministic given the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBeCloseTo(b(), 10);
    }
  });

  it('produces values in [0, 1)', () => {
    const r = mulberry32(123);
    for (let i = 0; i < 5000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs across seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe('hashStringToSeed', () => {
  it('is deterministic', () => {
    expect(hashStringToSeed('hello')).toBe(hashStringToSeed('hello'));
  });
  it('returns unsigned 32-bit ints', () => {
    const v = hashStringToSeed('anything');
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(2 ** 32);
    expect(Number.isInteger(v)).toBe(true);
  });
});
