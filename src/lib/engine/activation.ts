import type { Config } from './types.js';
import { binomial, zipfActivationCount, randInt } from './distributions.js';

type Rand = () => number;

export interface ActivationOutcome {
  activatedCount: number;
  schedule: number[];   // per-turn call counts, length = turns
}

// Distribute K calls uniformly at random across `turns` turns.
function scheduleCalls(rand: Rand, totalCalls: number, turns: number): number[] {
  const slots = new Array<number>(turns).fill(0);
  if (turns === 0) return slots;
  for (let i = 0; i < totalCalls; i++) {
    slots[randInt(rand, turns)]++;
  }
  return slots;
}

export function activateMcp(
  rand: Rand,
  cfg: Config['mcpServers'],
  turns: number,
  truncNormSample: (m: { mean: number; sd: number }) => number
): ActivationOutcome {
  if (cfg.installed <= 0) {
    return { activatedCount: 0, schedule: new Array<number>(turns).fill(0) };
  }

  let activated = 0;
  if (cfg.usageDistribution === 'longtail') {
    const expectedCount = cfg.installed * cfg.activationProbPerSession;
    activated = zipfActivationCount(
      rand,
      cfg.installed,
      expectedCount,
      cfg.longtailExponent
    );
  } else {
    activated = binomial(rand, cfg.installed, cfg.activationProbPerSession);
  }

  let totalCalls = 0;
  for (let i = 0; i < activated; i++) {
    totalCalls += Math.max(1, Math.round(truncNormSample(cfg.callsWhenActive)));
  }
  const schedule = scheduleCalls(rand, totalCalls, turns);
  return { activatedCount: activated, schedule };
}

export function activateSkills(
  rand: Rand,
  cfg: Config['skills'],
  turns: number
): ActivationOutcome {
  if (cfg.installed <= 0) {
    return { activatedCount: 0, schedule: new Array<number>(turns).fill(0) };
  }

  let activated = 0;
  if (cfg.usageDistribution === 'longtail') {
    const expectedCount = cfg.installed * cfg.activationProbPerSession;
    activated = zipfActivationCount(
      rand,
      cfg.installed,
      expectedCount,
      cfg.longtailExponent
    );
  } else {
    activated = binomial(rand, cfg.installed, cfg.activationProbPerSession);
  }

  // Skills trigger at most once per session each (idempotent in this model).
  const schedule = scheduleCalls(rand, activated, turns);
  return { activatedCount: activated, schedule };
}
