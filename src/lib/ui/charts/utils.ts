import type { RunOutput, TurnAggregate, Stat } from '$lib/engine/types.js';

export function pickSeries(
  out: RunOutput | null,
  metric: keyof Omit<TurnAggregate, 'turnIdx' | 'compactionTriggered'>
): { turn: number; mean: number; p10: number; p90: number }[] {
  if (!out) return [];
  return out.perTurn.map((t) => {
    const s = t[metric] as Stat;
    return { turn: t.turnIdx, mean: s.mean, p10: s.p10, p90: s.p90 };
  });
}

export function cumulative(
  series: { turn: number; mean: number; p10: number; p90: number }[]
): { turn: number; mean: number; p10: number; p90: number }[] {
  let mean = 0, p10 = 0, p90 = 0;
  return series.map((s) => {
    mean += s.mean;
    p10 += s.p10;
    p90 += s.p90;
    return { turn: s.turn, mean, p10, p90 };
  });
}

export function fmtUsd(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}k`;
  if (v >= 10) return `$${v.toFixed(2)}`;
  if (v >= 1) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(4)}`;
}

export function fmtTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(0);
}

export function fmtPct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}
