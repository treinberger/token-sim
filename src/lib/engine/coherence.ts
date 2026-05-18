// Coherence Index — heuristic 0..1 score. NOT an Anthropic-measured metric.
// Models how context-window utilization may correlate with response coherence
// based on the Chroma "Context Rot" findings.
import type { Config } from './types.js';

export function coherence(
  windowUtil: number,
  q: Config['quality'],
  accumulatedPenalty: number
): number {
  const u = windowUtil;
  const d = q.decayStartPct;
  const s = q.steepness;
  const f = q.floor;

  // Sigmoid centered at decayStart, increasing in u.
  const sig = 1 / (1 + Math.exp(-(u - d) * s));

  // (1 - sig) crosses 0.5 at u = d, → floor as u → 1.
  const base = f + (1 - f) * (1 - sig);
  const adjusted = base - accumulatedPenalty;
  return clamp01(adjusted);
}

export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
