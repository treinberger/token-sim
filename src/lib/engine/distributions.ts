import type { MeanSd } from './types.js';

type Rand = () => number;

// Box-Muller — two uniform draws → one N(0,1) sample.
export function normal01(rand: Rand): number {
  // Re-draw if u1 == 0 to avoid log(0).
  let u1 = rand();
  while (u1 === 0) u1 = rand();
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Truncated normal ≥ floor. Rejection sampling with cap.
export function truncatedNormal(
  rand: Rand,
  m: MeanSd,
  floor = 0,
  maxTries = 16
): number {
  if (m.sd === 0) return Math.max(floor, m.mean);
  for (let i = 0; i < maxTries; i++) {
    const v = m.mean + m.sd * normal01(rand);
    if (v >= floor) return v;
  }
  return Math.max(floor, m.mean);
}

// Integer truncated normal ≥ floor (rounded). Useful for turn counts.
export function truncatedNormalInt(
  rand: Rand,
  m: MeanSd,
  floor = 1
): number {
  return Math.max(floor, Math.round(truncatedNormal(rand, m, floor)));
}

// Binomial(n, p) via summing n Bernoullis. Fine for small n (< 1000).
export function binomial(rand: Rand, n: number, p: number): number {
  if (n <= 0) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return n;
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (rand() < p) k++;
  }
  return k;
}

// Compute per-item activation probabilities for a Zipf-skewed selection
// where the top-ranked items saturate at p=1 and the residual expectation
// is iteratively redistributed across unsaturated items.
//
// Returns an array of probabilities p_i with Σ p_i ≈ expectedCount (clamped to n).
export function zipfActivationProbs(
  n: number,
  expectedCount: number,
  s: number
): number[] {
  if (n <= 0) return [];
  const probs = new Array<number>(n).fill(0);
  if (expectedCount <= 0) return probs;
  if (expectedCount >= n) return probs.fill(1);

  const weights = Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, s));

  let remaining = expectedCount;
  const unsat: number[] = weights.map((_, i) => i);

  for (let pass = 0; pass < 16; pass++) {
    if (unsat.length === 0) break;
    let wSum = 0;
    for (const i of unsat) wSum += weights[i];
    if (wSum <= 0) break;
    const scale = remaining / wSum;
    const newUnsat: number[] = [];
    let clipped = false;
    for (const i of unsat) {
      const p = weights[i] * scale;
      if (p >= 1) {
        probs[i] = 1;
        remaining -= 1;
        clipped = true;
      } else {
        probs[i] = p;
        newUnsat.push(i);
      }
    }
    unsat.length = 0;
    unsat.push(...newUnsat);
    if (!clipped) break;
  }
  return probs;
}

// Zipf-weighted activation count: each item activates independently with its
// per-item probability (Bernoulli draw), giving a long-tail bias toward early items.
export function zipfActivationCount(
  rand: Rand,
  n: number,
  expectedCount: number,
  s: number
): number {
  if (n <= 0) return 0;
  if (expectedCount <= 0) return 0;
  if (expectedCount >= n) return n;

  const probs = zipfActivationProbs(n, expectedCount, s);
  let activated = 0;
  for (let i = 0; i < n; i++) {
    if (rand() < probs[i]) activated++;
  }
  return activated;
}

// Uniform integer in [0, n)
export function randInt(rand: Rand, n: number): number {
  return Math.floor(rand() * n);
}
