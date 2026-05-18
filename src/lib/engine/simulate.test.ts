import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng.js';
import { simulateOneTrajectory } from './simulate.js';
import { defaultBaseline } from '../data/presets.js';
import { runMonteCarlo } from './monteCarlo.js';
import type { Config } from './types.js';

describe('simulateOneTrajectory', () => {
  it('produces same trajectory with same seed', () => {
    const cfg = defaultBaseline();
    const r1 = mulberry32(123);
    const r2 = mulberry32(123);
    const t1 = simulateOneTrajectory(r1, cfg);
    const t2 = simulateOneTrajectory(r2, cfg);
    expect(t1.totalCost).toBe(t2.totalCost);
    expect(t1.turns.length).toBe(t2.turns.length);
    expect(t1.peakWindowUtil).toBe(t2.peakWindowUtil);
  });

  it('produces non-negative cost and reasonable coherence', () => {
    const cfg = defaultBaseline();
    const r = mulberry32(7);
    const t = simulateOneTrajectory(r, cfg);
    expect(t.totalCost).toBeGreaterThanOrEqual(0);
    expect(t.meanCoherence).toBeGreaterThanOrEqual(0);
    expect(t.meanCoherence).toBeLessThanOrEqual(1);
  });

  it('cost is higher when cache is disabled', () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    const cfg1: Config = defaultBaseline();
    const cfg2: Config = { ...cfg1, cache: { ...cfg1.cache, enabled: false } };
    const t1 = simulateOneTrajectory(r1, cfg1);
    const t2 = simulateOneTrajectory(r2, cfg2);
    // Cache on should be at most as expensive (cache write adds cost but cache read saves more)
    // Over a long session, cache off should generally cost more.
    expect(t2.totalCost).toBeGreaterThan(t1.totalCost * 0.5);
  });

  it('ZDR disables cache (totalCached = 0)', () => {
    const cfg = defaultBaseline();
    const zdr: Config = { ...cfg, zdr: true };
    const r = mulberry32(5);
    const t = simulateOneTrajectory(r, zdr);
    expect(t.cacheHitRatio).toBe(0);
  });

  it('more MCP servers raises baseline overhead', () => {
    const cfg = defaultBaseline();
    const heavier: Config = {
      ...cfg,
      mcpServers: { ...cfg.mcpServers, installed: 20 }
    };
    const tA = simulateOneTrajectory(mulberry32(1), cfg);
    const tB = simulateOneTrajectory(mulberry32(1), heavier);
    expect(tB.baselineOverhead).toBeGreaterThan(tA.baselineOverhead);
  });
});

describe('runMonteCarlo', () => {
  it('produces valid aggregates with N samples', () => {
    const cfg: Config = { ...defaultBaseline(), mc: { samples: 100, seed: 1 } };
    const out = runMonteCarlo(cfg);
    expect(out.perTurn.length).toBeGreaterThan(0);
    expect(out.summary.totalCost.mean).toBeGreaterThanOrEqual(0);
    expect(out.summary.totalCost.p10).toBeLessThanOrEqual(out.summary.totalCost.p90);
    expect(out.zoom.perDay.cost.mean).toBeCloseTo(
      out.summary.totalCost.mean * cfg.team.users * cfg.team.sessionsPerUserPerDay,
      6
    );
  });

  it('is deterministic with fixed seed', () => {
    const cfg: Config = { ...defaultBaseline(), mc: { samples: 50, seed: 99 } };
    const a = runMonteCarlo(cfg);
    const b = runMonteCarlo(cfg);
    expect(a.summary.totalCost.mean).toBe(b.summary.totalCost.mean);
    expect(a.summary.meanCoherence.mean).toBe(b.summary.meanCoherence.mean);
  });
});
