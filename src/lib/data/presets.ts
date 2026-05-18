import type { Config } from '$lib/engine/types.js';
import { MODEL_DEFAULTS } from './models.js';

const sonnet = MODEL_DEFAULTS['sonnet-4-6'];
const opus = MODEL_DEFAULTS['opus-4-7'];

function baseConfig(): Config {
  return {
    workload: {
      turnsPerSession: { mean: 25, sd: 10 },
      userInputTokens: { mean: 500, sd: 200 },
      assistantOutputTokens: { mean: 800, sd: 300 },
      thinkingTokens: { mean: 0, sd: 0 },
      toolResultTokens: { mean: 1500, sd: 1500 },
      systemPromptTokens: 3500,
      baseContextTokens: 8000,
      interTurnDelaySec: { mean: 30, sd: 20 }
    },
    mcpServers: {
      installed: 0,
      avgTokensPerServer: { mean: 1200, sd: 400 },
      activationProbPerSession: 0.3,
      usageDistribution: 'longtail',
      longtailExponent: 1.3,
      callsWhenActive: { mean: 3, sd: 2 },
      tokensPerCall: { mean: 600, sd: 400 }
    },
    skills: {
      installed: 0,
      metadataTokensPerSkill: { mean: 200, sd: 80 },
      activationProbPerSession: 0.2,
      usageDistribution: 'longtail',
      longtailExponent: 1.3,
      fullContentTokens: { mean: 1800, sd: 700 },
      placement: 'inline'
    },
    model: { ...sonnet },
    cache: { enabled: true, ttl: '5m', breakpoints: 3 },
    zdr: false,
    team: { users: 1, sessionsPerUserPerDay: 4 },
    quality: { decayStartPct: 0.5, steepness: 10, floor: 0.3 },
    compaction: {
      triggerPct: 0.92,                                       // ~92 % of window — leaves room for one response
      retentionFactor: 0.2,
      summaryOutputTokens: { mean: 3500, sd: 1000 },
      qualityPenalty: 0.05
    },
    mc: { samples: 400, seed: 42 }
  };
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  config: () => Config;
}

export const PRESETS: Preset[] = [
  {
    id: 'lean',
    label: 'Lean',
    description: 'No MCP, no Skills — stock Claude Code.',
    config: () => baseConfig()
  },
  {
    id: 'solo-dev',
    label: 'Solo Dev',
    description: '2 MCP + 8 Skills, mostly inactive. Cache on.',
    config: () => {
      const c = baseConfig();
      c.mcpServers.installed = 2;
      c.mcpServers.activationProbPerSession = 0.4;
      c.skills.installed = 8;
      c.skills.activationProbPerSession = 0.25;
      return c;
    }
  },
  {
    id: 'enterprise',
    label: 'Enterprise Team',
    description: '15 MCP + 30 Skills installed for whole org, 10 devs.',
    config: () => {
      const c = baseConfig();
      c.model = { ...opus };
      c.mcpServers.installed = 15;
      c.mcpServers.activationProbPerSession = 0.25;
      c.skills.installed = 30;
      c.skills.activationProbPerSession = 0.15;
      c.team.users = 10;
      c.team.sessionsPerUserPerDay = 6;
      return c;
    }
  },
  {
    id: 'no-cache',
    label: 'No-Cache',
    description: 'Cache disabled — see the cost shape without prefix caching.',
    config: () => {
      const c = baseConfig();
      c.mcpServers.installed = 5;
      c.skills.installed = 10;
      c.cache.enabled = false;
      return c;
    }
  },
  {
    id: 'zdr-heavy',
    label: 'ZDR + Heavy Tooling',
    description: 'Zero-Data-Retention disables cache. Heavy MCP/Skills load.',
    config: () => {
      const c = baseConfig();
      c.mcpServers.installed = 15;
      c.skills.installed = 30;
      c.zdr = true;
      return c;
    }
  },
  {
    id: 'long-session',
    label: 'Long Session',
    description: 'Big session pushing compaction. Watch coherence dip.',
    config: () => {
      const c = baseConfig();
      c.workload.turnsPerSession = { mean: 80, sd: 25 };
      c.workload.toolResultTokens = { mean: 3000, sd: 2000 };
      c.mcpServers.installed = 5;
      c.skills.installed = 12;
      return c;
    }
  }
];

export function defaultBaseline(): Config {
  return PRESETS[1].config();   // Solo Dev
}

export function defaultVariant(): Config {
  return PRESETS[2].config();   // Enterprise
}
