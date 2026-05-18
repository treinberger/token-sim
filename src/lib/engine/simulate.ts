import type { Config, RunTrace, TurnTrace } from './types.js';
import { truncatedNormal, truncatedNormalInt } from './distributions.js';
import { activateMcp, activateSkills } from './activation.js';
import { coherence } from './coherence.js';

type Rand = () => number;

const TTL_SEC: Record<Config['cache']['ttl'], number> = {
  '5m': 300,
  '1h': 3600
};

export function simulateOneTrajectory(rand: Rand, cfg: Config): RunTrace {
  const tn = (m: { mean: number; sd: number }, floor = 0) =>
    truncatedNormal(rand, m, floor);

  // 1. Session-level draws
  const turns = truncatedNormalInt(rand, cfg.workload.turnsPerSession, 3);

  const mcpAct = activateMcp(rand, cfg.mcpServers, turns, (m) =>
    truncatedNormal(rand, m, 1)
  );
  const skillAct = activateSkills(rand, cfg.skills, turns);

  // 2. Baseline overhead (lives in cacheable prefix at t=0).
  //    - MCP schemas: always loaded for all installed servers
  //    - Skill metadata: always loaded for all installed skills
  //    - prefix-placed skill full content (if placement=prefix): activated-count × avg
  const mcpSchemaTokens =
    cfg.mcpServers.installed * tn(cfg.mcpServers.avgTokensPerServer, 0);
  const skillMetaTokens =
    cfg.skills.installed * tn(cfg.skills.metadataTokensPerSkill, 0);
  const prefixSkillFull =
    cfg.skills.placement === 'prefix'
      ? skillAct.activatedCount * tn(cfg.skills.fullContentTokens, 0)
      : 0;

  const overhead =
    cfg.workload.systemPromptTokens +
    cfg.workload.baseContextTokens +
    mcpSchemaTokens +
    skillMetaTokens +
    prefixSkillFull;

  // 3. Per-turn simulation
  const turnTraces: TurnTrace[] = [];
  let contextTokens = overhead;
  let coherencePenalty = 0;
  let compactions = 0;
  let totalCost = 0;
  let totalFresh = 0;
  let totalCached = 0;
  let totalWindowUtil = 0;
  let peakWindowUtil = 0;
  let coherenceSum = 0;
  let lastCacheActive = false;

  const ttlSec = TTL_SEC[cfg.cache.ttl];
  const cacheGloballyOff = !cfg.cache.enabled || cfg.zdr;

  for (let t = 1; t <= turns; t++) {
    // 3a. Generate this turn's tokens
    const userIn = tn(cfg.workload.userInputTokens, 0);
    const assistantOut = tn(cfg.workload.assistantOutputTokens, 0);
    const thinking = tn(cfg.workload.thinkingTokens, 0);
    const toolResultsBase = tn(cfg.workload.toolResultTokens, 0);

    const mcpCallsThisTurn = mcpAct.schedule[t - 1] ?? 0;
    const mcpCallTokens =
      mcpCallsThisTurn * tn(cfg.mcpServers.tokensPerCall, 0);

    const skillsTrigThisTurn = skillAct.schedule[t - 1] ?? 0;
    const inlineSkillTokens =
      cfg.skills.placement === 'inline'
        ? skillsTrigThisTurn * tn(cfg.skills.fullContentTokens, 0)
        : 0;

    const newInputTokens =
      userIn + toolResultsBase + mcpCallTokens + inlineSkillTokens;
    const newOutputTokens = assistantOut + thinking;

    const ctxBefore = contextTokens;
    contextTokens = ctxBefore + newInputTokens + newOutputTokens;

    // 3b. Compaction — trigger fires when context reaches a fraction of the model's window.
    //     Claude Code reserves headroom (~33k buffer on 200k models) for the assistant
    //     response, so the typical trigger is around 92 % of the window.
    const compactionTriggerTokens = cfg.compaction.triggerPct * cfg.model.ctxWindow;
    let compactionTriggered = false;
    if (contextTokens > compactionTriggerTokens) {
      compactionTriggered = true;
      compactions++;
      const summaryOut = tn(cfg.compaction.summaryOutputTokens, 100);

      // After compaction: prefix overhead survives, messages shrink to retention factor
      const messagesBefore = Math.max(0, contextTokens - overhead);
      const messagesAfter = messagesBefore * cfg.compaction.retentionFactor;
      contextTokens = overhead + messagesAfter + summaryOut;

      coherencePenalty += cfg.compaction.qualityPenalty;
      totalCost += (summaryOut * cfg.model.priceOutputPerM) / 1e6;
    }

    // 3c. Cache gate
    const gapSec = tn(cfg.workload.interTurnDelaySec, 0);
    const minCacheableMet = overhead >= cfg.model.minCacheableTokens;
    const inlineSkillBroke =
      cfg.skills.placement === 'inline' && skillsTrigThisTurn > 0;

    const cacheActiveThisTurn: boolean =
      !cacheGloballyOff &&
      minCacheableMet &&
      gapSec <= ttlSec &&
      (t === 1 || lastCacheActive) &&
      !inlineSkillBroke;

    let freshInput: number;
    let cachedInput: number;
    let cacheWriteTokens: number;

    if (cacheActiveThisTurn) {
      if (t === 1) {
        // First turn: nothing was previously cached. The whole input is fresh,
        // and the entire turn's input + overhead gets written to cache for next turn.
        freshInput = contextTokens - newOutputTokens;
        cachedInput = 0;
        cacheWriteTokens = freshInput;
      } else if (compactionTriggered) {
        // Compaction reset: messages-cache invalidated, only system survives.
        // System portion is read; new summary + recent messages re-written.
        cachedInput = Math.min(overhead, ctxBefore);
        freshInput = Math.max(0, contextTokens - cachedInput - newOutputTokens);
        cacheWriteTokens = freshInput;
      } else {
        cachedInput = ctxBefore;
        freshInput = newInputTokens;
        cacheWriteTokens = freshInput;
      }
    } else {
      freshInput = contextTokens - newOutputTokens;
      cachedInput = 0;
      cacheWriteTokens = 0;
    }

    // 3d. Cost
    const cachePriceWrite =
      cfg.cache.ttl === '5m'
        ? cfg.model.priceCacheWrite5mPerM
        : cfg.model.priceCacheWrite1hPerM;

    const turnCost =
      (freshInput * cfg.model.priceInputPerM) / 1e6 +
      (cachedInput * cfg.model.priceCacheReadPerM) / 1e6 +
      (cacheWriteTokens * cachePriceWrite) / 1e6 +
      (newOutputTokens * cfg.model.priceOutputPerM) / 1e6;

    totalCost += turnCost;
    totalFresh += freshInput;
    totalCached += cachedInput;

    // 3e. Window util & coherence
    const winUtil = Math.min(1.2, contextTokens / cfg.model.ctxWindow);
    if (winUtil > peakWindowUtil) peakWindowUtil = winUtil;
    totalWindowUtil += winUtil;

    const coh = coherence(winUtil, cfg.quality, coherencePenalty);
    coherenceSum += coh;

    turnTraces.push({
      turnIdx: t,
      contextTokens,
      windowUtil: winUtil,
      freshInput,
      cachedInput,
      output: newOutputTokens,
      cost: turnCost,
      coherence: coh,
      compactionTriggered
    });

    lastCacheActive = cacheActiveThisTurn;
  }

  const meanCoherence = turns > 0 ? coherenceSum / turns : 0;
  const totalInput = totalFresh + totalCached;
  const cacheHitRatio = totalInput > 0 ? totalCached / totalInput : 0;

  return {
    turns: turnTraces,
    totalCost,
    meanCoherence,
    peakWindowUtil,
    cacheHitRatio,
    compactions,
    activatedMcp: mcpAct.activatedCount,
    activatedSkills: skillAct.activatedCount,
    baselineOverhead: overhead
  };
}
