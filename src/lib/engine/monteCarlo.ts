import type {
  Config,
  RunOutput,
  RunTrace,
  Stat,
  TurnAggregate,
  RunSummary
} from './types.js';
import { mulberry32 } from './rng.js';
import { simulateOneTrajectory } from './simulate.js';

function aggregateStat(values: number[]): Stat {
  if (values.length === 0) return { mean: 0, p10: 0, p90: 0 };
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const p10 = sorted[Math.max(0, Math.floor(0.1 * sorted.length))];
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(0.9 * sorted.length))];
  return { mean, p10, p90 };
}

export interface MonteCarloProgress {
  percent: number;
  done: number;
  total: number;
}

export interface MonteCarloOptions {
  onProgress?: (p: MonteCarloProgress) => void;
  progressEveryN?: number;
}

export function runMonteCarlo(
  cfg: Config,
  opts: MonteCarloOptions = {}
): RunOutput {
  const samples = Math.max(1, Math.floor(cfg.mc.samples));
  const rand = mulberry32(cfg.mc.seed);
  const traces: RunTrace[] = [];
  const progressEveryN = opts.progressEveryN ?? Math.max(1, Math.floor(samples / 20));

  let maxTurnsObserved = 0;
  for (let i = 0; i < samples; i++) {
    const t = simulateOneTrajectory(rand, cfg);
    traces.push(t);
    if (t.turns.length > maxTurnsObserved) maxTurnsObserved = t.turns.length;
    if (opts.onProgress && i % progressEveryN === 0) {
      opts.onProgress({ percent: (i / samples) * 100, done: i, total: samples });
    }
  }

  // Per-turn aggregation. Some runs may be shorter — count NaN-safe.
  const perTurn: TurnAggregate[] = [];
  for (let t = 0; t < maxTurnsObserved; t++) {
    const ctxs: number[] = [];
    const winUtils: number[] = [];
    const fresh: number[] = [];
    const cached: number[] = [];
    const out: number[] = [];
    const cost: number[] = [];
    const coh: number[] = [];
    let compactedCount = 0;
    let observedCount = 0;
    for (const trace of traces) {
      const tt = trace.turns[t];
      if (!tt) continue;
      observedCount++;
      ctxs.push(tt.contextTokens);
      winUtils.push(tt.windowUtil);
      fresh.push(tt.freshInput);
      cached.push(tt.cachedInput);
      out.push(tt.output);
      cost.push(tt.cost);
      coh.push(tt.coherence);
      if (tt.compactionTriggered) compactedCount++;
    }
    if (observedCount === 0) continue;
    perTurn.push({
      turnIdx: t + 1,
      contextTokens: aggregateStat(ctxs),
      windowUtil: aggregateStat(winUtils),
      freshInputTokens: aggregateStat(fresh),
      cachedInputTokens: aggregateStat(cached),
      outputTokens: aggregateStat(out),
      cost: aggregateStat(cost),
      coherence: aggregateStat(coh),
      compactionTriggered: compactedCount / observedCount
    });
  }

  // Summary across MC runs (per session)
  const totalCosts = traces.map((tr) => tr.totalCost);
  const meanCohs = traces.map((tr) => tr.meanCoherence);
  const peakWins = traces.map((tr) => tr.peakWindowUtil);
  const hitRatios = traces.map((tr) => tr.cacheHitRatio);
  const compactionsArr = traces.map((tr) => tr.compactions);

  const summary: RunSummary = {
    totalCost: aggregateStat(totalCosts),
    meanCoherence: aggregateStat(meanCohs),
    peakWindowUtil: aggregateStat(peakWins),
    cacheHitRatio: aggregateStat(hitRatios),
    compactionsPerSession: aggregateStat(compactionsArr)
  };

  // Zoom: aggregate to team-day / team-month
  const sessionsPerDay = cfg.team.users * cfg.team.sessionsPerUserPerDay;
  const dayCosts = totalCosts.map((c) => c * sessionsPerDay);
  const monthCosts = totalCosts.map((c) => c * sessionsPerDay * 20);

  const meta = {
    samples,
    avgTurnsPerSession:
      traces.reduce((a, b) => a + b.turns.length, 0) / samples,
    avgActivatedMcp:
      traces.reduce((a, b) => a + b.activatedMcp, 0) / samples,
    avgActivatedSkills:
      traces.reduce((a, b) => a + b.activatedSkills, 0) / samples,
    avgBaselineOverhead:
      traces.reduce((a, b) => a + b.baselineOverhead, 0) / samples,
    avgCompactionsPerSession:
      traces.reduce((a, b) => a + b.compactions, 0) / samples
  };

  if (opts.onProgress) {
    opts.onProgress({ percent: 100, done: samples, total: samples });
  }

  return {
    perTurn,
    summary,
    zoom: {
      perSession: summary,
      perDay: { cost: aggregateStat(dayCosts), sessions: sessionsPerDay },
      perMonth: {
        cost: aggregateStat(monthCosts),
        sessions: sessionsPerDay * 20
      }
    },
    meta
  };
}
