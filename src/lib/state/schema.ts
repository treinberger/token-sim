import { z } from 'zod';

const meanSd = z.object({
  mean: z.number().finite().min(0),
  sd: z.number().finite().min(0)
});

const modelId = z.enum(['opus-4-7', 'sonnet-4-6', 'haiku-4-5']);
const usageDist = z.enum(['uniform', 'longtail']);
const placement = z.enum(['prefix', 'inline']);
const cacheTtl = z.enum(['5m', '1h']);

export const configSchema = z.object({
  workload: z.object({
    turnsPerSession: meanSd,
    userInputTokens: meanSd,
    assistantOutputTokens: meanSd,
    thinkingTokens: meanSd,
    toolResultTokens: meanSd,
    systemPromptTokens: z.number().nonnegative(),
    baseContextTokens: z.number().nonnegative(),
    interTurnDelaySec: meanSd
  }),
  mcpServers: z.object({
    installed: z.number().int().nonnegative(),
    avgTokensPerServer: meanSd,
    activationProbPerSession: z.number().min(0).max(1),
    usageDistribution: usageDist,
    longtailExponent: z.number().positive(),
    callsWhenActive: meanSd,
    tokensPerCall: meanSd
  }),
  skills: z.object({
    installed: z.number().int().nonnegative(),
    metadataTokensPerSkill: meanSd,
    activationProbPerSession: z.number().min(0).max(1),
    usageDistribution: usageDist,
    longtailExponent: z.number().positive(),
    fullContentTokens: meanSd,
    placement
  }),
  model: z.object({
    id: modelId,
    ctxWindow: z.number().positive(),
    priceInputPerM: z.number().nonnegative(),
    priceOutputPerM: z.number().nonnegative(),
    priceCacheWrite5mPerM: z.number().nonnegative(),
    priceCacheWrite1hPerM: z.number().nonnegative(),
    priceCacheReadPerM: z.number().nonnegative(),
    minCacheableTokens: z.number().nonnegative()
  }),
  cache: z.object({
    enabled: z.boolean(),
    ttl: cacheTtl,
    breakpoints: z.number().int().min(1).max(4)
  }),
  zdr: z.boolean(),
  team: z.object({
    users: z.number().int().positive(),
    sessionsPerUserPerDay: z.number().positive()
  }),
  quality: z.object({
    decayStartPct: z.number().min(0).max(1),
    steepness: z.number().positive(),
    floor: z.number().min(0).max(1)
  }),
  compaction: z.object({
    triggerPct: z.number().min(0).max(1),
    retentionFactor: z.number().min(0).max(1),
    summaryOutputTokens: meanSd,
    qualityPenalty: z.number().min(0).max(1)
  }),
  mc: z.object({
    samples: z.number().int().positive(),
    seed: z.number().int().nonnegative()
  })
});

export const dualConfigSchema = z.object({
  baseline: configSchema,
  variant: configSchema,
  compareEnabled: z.boolean(),
  active: z.enum(['baseline', 'variant']),
  zoom: z.enum(['turn', 'session', 'day', 'month'])
});

export type ConfigSchema = z.infer<typeof configSchema>;
export type DualConfig = z.infer<typeof dualConfigSchema>;
