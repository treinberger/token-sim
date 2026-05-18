export type MeanSd = { mean: number; sd: number };

export type ModelId = 'opus-4-7' | 'sonnet-4-6' | 'haiku-4-5';
export type UsageDistribution = 'uniform' | 'longtail';
export type SkillPlacement = 'prefix' | 'inline';
export type CacheTtl = '5m' | '1h';

export interface Config {
  workload: {
    turnsPerSession: MeanSd;
    userInputTokens: MeanSd;
    assistantOutputTokens: MeanSd;
    thinkingTokens: MeanSd;
    toolResultTokens: MeanSd;
    systemPromptTokens: number;
    baseContextTokens: number;
    interTurnDelaySec: MeanSd;
  };
  mcpServers: {
    installed: number;
    avgTokensPerServer: MeanSd;
    activationProbPerSession: number;
    usageDistribution: UsageDistribution;
    longtailExponent: number;
    callsWhenActive: MeanSd;
    tokensPerCall: MeanSd;
  };
  skills: {
    installed: number;
    metadataTokensPerSkill: MeanSd;
    activationProbPerSession: number;
    usageDistribution: UsageDistribution;
    longtailExponent: number;
    fullContentTokens: MeanSd;
    placement: SkillPlacement;
  };
  model: {
    id: ModelId;
    ctxWindow: number;
    priceInputPerM: number;
    priceOutputPerM: number;
    priceCacheWrite5mPerM: number;
    priceCacheWrite1hPerM: number;
    priceCacheReadPerM: number;
    minCacheableTokens: number;
  };
  cache: {
    enabled: boolean;
    ttl: CacheTtl;
    breakpoints: number;
  };
  zdr: boolean;
  team: {
    users: number;
    sessionsPerUserPerDay: number;
  };
  quality: {
    decayStartPct: number;
    steepness: number;
    floor: number;
  };
  compaction: {
    triggerPct: number;            // 0..1 — fraction of ctxWindow that triggers compaction
    retentionFactor: number;
    summaryOutputTokens: MeanSd;
    qualityPenalty: number;
  };
  mc: {
    samples: number;
    seed: number;
  };
}

export interface Stat {
  mean: number;
  p10: number;
  p90: number;
}

export interface TurnAggregate {
  turnIdx: number;
  contextTokens: Stat;
  windowUtil: Stat;
  freshInputTokens: Stat;
  cachedInputTokens: Stat;
  outputTokens: Stat;
  cost: Stat;
  coherence: Stat;
  compactionTriggered: number;
}

export interface RunSummary {
  totalCost: Stat;
  meanCoherence: Stat;
  peakWindowUtil: Stat;
  cacheHitRatio: Stat;
  compactionsPerSession: Stat;
}

export interface RunOutput {
  perTurn: TurnAggregate[];
  summary: RunSummary;
  zoom: {
    perSession: RunSummary;
    perDay: { cost: Stat; sessions: number };
    perMonth: { cost: Stat; sessions: number };
  };
  meta: {
    samples: number;
    avgTurnsPerSession: number;
    avgActivatedMcp: number;
    avgActivatedSkills: number;
    avgBaselineOverhead: number;
    avgCompactionsPerSession: number;
  };
}

export interface TurnTrace {
  turnIdx: number;
  contextTokens: number;
  windowUtil: number;
  freshInput: number;
  cachedInput: number;
  output: number;
  cost: number;
  coherence: number;
  compactionTriggered: boolean;
}

export interface RunTrace {
  turns: TurnTrace[];
  totalCost: number;
  meanCoherence: number;
  peakWindowUtil: number;
  cacheHitRatio: number;
  compactions: number;
  activatedMcp: number;
  activatedSkills: number;
  baselineOverhead: number;
}
