<script lang="ts">
  import { activeConfig, updateActive } from '$lib/state/stores.js';
  import { applyModelDefaults, MODEL_DEFAULTS } from '$lib/data/models.js';
  import type { ModelId } from '$lib/engine/types.js';
  import Section from './Section.svelte';
  import Slider from './Slider.svelte';
  import MeanSdInput from './MeanSdInput.svelte';
  import Help from '../Help.svelte';
  import { HELP } from '../help-texts.js';

  const cfg = $derived($activeConfig);

  function fmtTokens(v: number): string {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toFixed(0);
  }
  function fmtPercent(v: number): string {
    return `${(v * 100).toFixed(0)}%`;
  }
  function fmtUsd(v: number): string {
    return `$${v.toFixed(2)}`;
  }
  function fmtCtx(v: number): string {
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  }

  function setModel(id: ModelId): void {
    updateActive((c) => applyModelDefaults(c, id));
  }
</script>

<aside class="input-panel">
  <Section
    title="Workload"
    summary={`${cfg.workload.turnsPerSession.mean.toFixed(0)} turns`}
    help={HELP.workload.section}
  >
    <MeanSdInput
      label="Turns per session"
      help={HELP.workload.turnsPerSession}
      value={cfg.workload.turnsPerSession}
      minMean={1}
      maxMean={200}
      step={1}
      onchange={(v) => updateActive((c) => ({ ...c, workload: { ...c.workload, turnsPerSession: v } }))}
    />
    <MeanSdInput
      label="User input tokens / turn"
      help={HELP.workload.userInputTokens}
      value={cfg.workload.userInputTokens}
      minMean={0}
      maxMean={5000}
      step={10}
      onchange={(v) => updateActive((c) => ({ ...c, workload: { ...c.workload, userInputTokens: v } }))}
    />
    <MeanSdInput
      label="Assistant output tokens / turn"
      help={HELP.workload.assistantOutputTokens}
      value={cfg.workload.assistantOutputTokens}
      minMean={0}
      maxMean={10000}
      step={50}
      onchange={(v) => updateActive((c) => ({ ...c, workload: { ...c.workload, assistantOutputTokens: v } }))}
    />
    <MeanSdInput
      label="Thinking tokens / turn (output-billed)"
      help={HELP.workload.thinkingTokens}
      value={cfg.workload.thinkingTokens}
      minMean={0}
      maxMean={64000}
      step={100}
      onchange={(v) => updateActive((c) => ({ ...c, workload: { ...c.workload, thinkingTokens: v } }))}
    />
    <MeanSdInput
      label="Tool-result tokens / turn (bash, read, ...)"
      help={HELP.workload.toolResultTokens}
      value={cfg.workload.toolResultTokens}
      minMean={0}
      maxMean={20000}
      step={100}
      onchange={(v) => updateActive((c) => ({ ...c, workload: { ...c.workload, toolResultTokens: v } }))}
    />
    <Slider
      label="System prompt tokens"
      help={HELP.workload.systemPromptTokens}
      value={cfg.workload.systemPromptTokens}
      min={0}
      max={20000}
      step={100}
      fmt={fmtTokens}
      onchange={(v) => updateActive((c) => ({ ...c, workload: { ...c.workload, systemPromptTokens: v } }))}
    />
    <Slider
      label="Base context tokens (repo + CLAUDE.md)"
      help={HELP.workload.baseContextTokens}
      value={cfg.workload.baseContextTokens}
      min={0}
      max={50000}
      step={500}
      fmt={fmtTokens}
      onchange={(v) => updateActive((c) => ({ ...c, workload: { ...c.workload, baseContextTokens: v } }))}
    />
    <MeanSdInput
      label="Inter-turn delay (sec) — gates cache TTL"
      help={HELP.workload.interTurnDelaySec}
      value={cfg.workload.interTurnDelaySec}
      minMean={0}
      maxMean={3600}
      step={5}
      onchange={(v) => updateActive((c) => ({ ...c, workload: { ...c.workload, interTurnDelaySec: v } }))}
    />
  </Section>

  <Section
    title="MCP Servers"
    summary={`${cfg.mcpServers.installed} installed, ${(cfg.mcpServers.activationProbPerSession * 100).toFixed(0)}% p(use)`}
    help={HELP.mcp.section}
    helpTitle="MCP Servers"
  >
    <Slider
      label="Servers installed"
      help={HELP.mcp.installed}
      value={cfg.mcpServers.installed}
      min={0}
      max={50}
      onchange={(v) => updateActive((c) => ({ ...c, mcpServers: { ...c.mcpServers, installed: v } }))}
    />
    <MeanSdInput
      label="Tokens per server schema"
      help={HELP.mcp.avgTokensPerServer}
      value={cfg.mcpServers.avgTokensPerServer}
      minMean={100}
      maxMean={10000}
      step={50}
      onchange={(v) => updateActive((c) => ({ ...c, mcpServers: { ...c.mcpServers, avgTokensPerServer: v } }))}
    />
    <Slider
      label="P(activation) per server per session"
      help={HELP.mcp.activationProb}
      value={cfg.mcpServers.activationProbPerSession}
      min={0}
      max={1}
      step={0.01}
      fmt={fmtPercent}
      onchange={(v) => updateActive((c) => ({ ...c, mcpServers: { ...c.mcpServers, activationProbPerSession: v } }))}
    />
    <label class="row">
      <span class="label-text">Usage distribution <Help text={HELP.mcp.usageDistribution} title="Usage distribution" /></span>
      <select
        value={cfg.mcpServers.usageDistribution}
        onchange={(e) => updateActive((c) => ({ ...c, mcpServers: { ...c.mcpServers, usageDistribution: (e.currentTarget as HTMLSelectElement).value as 'uniform' | 'longtail' } }))}
      >
        <option value="uniform">Uniform</option>
        <option value="longtail">Long-tail (Zipf)</option>
      </select>
    </label>
    {#if cfg.mcpServers.usageDistribution === 'longtail'}
      <Slider
        label="Long-tail exponent s"
        help={HELP.mcp.longtailExponent}
        value={cfg.mcpServers.longtailExponent}
        min={0.5}
        max={2.5}
        step={0.05}
        onchange={(v) => updateActive((c) => ({ ...c, mcpServers: { ...c.mcpServers, longtailExponent: v } }))}
      />
    {/if}
    <MeanSdInput
      label="Calls when active"
      help={HELP.mcp.callsWhenActive}
      value={cfg.mcpServers.callsWhenActive}
      minMean={1}
      maxMean={30}
      step={1}
      onchange={(v) => updateActive((c) => ({ ...c, mcpServers: { ...c.mcpServers, callsWhenActive: v } }))}
    />
    <MeanSdInput
      label="Tokens per call (args + result)"
      help={HELP.mcp.tokensPerCall}
      value={cfg.mcpServers.tokensPerCall}
      minMean={0}
      maxMean={20000}
      step={50}
      onchange={(v) => updateActive((c) => ({ ...c, mcpServers: { ...c.mcpServers, tokensPerCall: v } }))}
    />
  </Section>

  <Section
    title="Skills"
    summary={`${cfg.skills.installed} installed, ${(cfg.skills.activationProbPerSession * 100).toFixed(0)}% p(trigger)`}
    help={HELP.skills.section}
  >
    <Slider
      label="Skills installed"
      help={HELP.skills.installed}
      value={cfg.skills.installed}
      min={0}
      max={100}
      onchange={(v) => updateActive((c) => ({ ...c, skills: { ...c.skills, installed: v } }))}
    />
    <MeanSdInput
      label="Metadata tokens per skill (always loaded)"
      help={HELP.skills.metadataTokens}
      value={cfg.skills.metadataTokensPerSkill}
      minMean={50}
      maxMean={2000}
      step={10}
      onchange={(v) => updateActive((c) => ({ ...c, skills: { ...c.skills, metadataTokensPerSkill: v } }))}
    />
    <Slider
      label="P(trigger) per skill per session"
      help={HELP.skills.activationProb}
      value={cfg.skills.activationProbPerSession}
      min={0}
      max={1}
      step={0.01}
      fmt={fmtPercent}
      onchange={(v) => updateActive((c) => ({ ...c, skills: { ...c.skills, activationProbPerSession: v } }))}
    />
    <label class="row">
      <span class="label-text">Usage distribution <Help text={HELP.mcp.usageDistribution} title="Usage distribution" /></span>
      <select
        value={cfg.skills.usageDistribution}
        onchange={(e) => updateActive((c) => ({ ...c, skills: { ...c.skills, usageDistribution: (e.currentTarget as HTMLSelectElement).value as 'uniform' | 'longtail' } }))}
      >
        <option value="uniform">Uniform</option>
        <option value="longtail">Long-tail (Zipf)</option>
      </select>
    </label>
    {#if cfg.skills.usageDistribution === 'longtail'}
      <Slider
        label="Long-tail exponent s"
        help={HELP.mcp.longtailExponent}
        value={cfg.skills.longtailExponent}
        min={0.5}
        max={2.5}
        step={0.05}
        onchange={(v) => updateActive((c) => ({ ...c, skills: { ...c.skills, longtailExponent: v } }))}
      />
    {/if}
    <MeanSdInput
      label="Full content tokens when triggered"
      help={HELP.skills.fullContentTokens}
      value={cfg.skills.fullContentTokens}
      minMean={100}
      maxMean={15000}
      step={100}
      onchange={(v) => updateActive((c) => ({ ...c, skills: { ...c.skills, fullContentTokens: v } }))}
    />
    <label class="row">
      <span class="label-text">Placement (cache effect) <Help text={HELP.skills.placement} title="Skill placement" /></span>
      <select
        value={cfg.skills.placement}
        onchange={(e) => updateActive((c) => ({ ...c, skills: { ...c.skills, placement: (e.currentTarget as HTMLSelectElement).value as 'prefix' | 'inline' } }))}
      >
        <option value="prefix">Prefix (cacheable)</option>
        <option value="inline">Inline (breaks cache)</option>
      </select>
    </label>
  </Section>

  <Section
    title="Model & Pricing"
    summary={`${MODEL_DEFAULTS[cfg.model.id].label}, ctx ${fmtCtx(cfg.model.ctxWindow)}`}
    help={HELP.model.section}
  >
    <div class="btn-row">
      {#each Object.values(MODEL_DEFAULTS) as m}
        <button
          class="toggle"
          class:on={cfg.model.id === m.id}
          onclick={() => setModel(m.id)}
        >{m.label}</button>
      {/each}
    </div>
    <Slider
      label="Context window (max for this model: {fmtCtx(MODEL_DEFAULTS[cfg.model.id].ctxWindowMax)})"
      help={HELP.model.ctxWindow}
      value={cfg.model.ctxWindow}
      min={50_000}
      max={MODEL_DEFAULTS[cfg.model.id].ctxWindowMax}
      step={10_000}
      fmt={fmtCtx}
      onchange={(v) => updateActive((c) => ({ ...c, model: { ...c.model, ctxWindow: v } }))}
    />
    <Slider
      label="Price input $/M"
      help={HELP.model.priceInputPerM}
      value={cfg.model.priceInputPerM}
      min={0}
      max={50}
      step={0.05}
      fmt={fmtUsd}
      onchange={(v) => updateActive((c) => ({ ...c, model: { ...c.model, priceInputPerM: v } }))}
    />
    <Slider
      label="Price output $/M"
      help={HELP.model.priceOutputPerM}
      value={cfg.model.priceOutputPerM}
      min={0}
      max={200}
      step={0.25}
      fmt={fmtUsd}
      onchange={(v) => updateActive((c) => ({ ...c, model: { ...c.model, priceOutputPerM: v } }))}
    />
    <Slider
      label="Cache write 5m $/M"
      help={HELP.model.priceCacheWrite5m}
      value={cfg.model.priceCacheWrite5mPerM}
      min={0}
      max={50}
      step={0.05}
      fmt={fmtUsd}
      onchange={(v) => updateActive((c) => ({ ...c, model: { ...c.model, priceCacheWrite5mPerM: v } }))}
    />
    <Slider
      label="Cache write 1h $/M"
      help={HELP.model.priceCacheWrite1h}
      value={cfg.model.priceCacheWrite1hPerM}
      min={0}
      max={100}
      step={0.1}
      fmt={fmtUsd}
      onchange={(v) => updateActive((c) => ({ ...c, model: { ...c.model, priceCacheWrite1hPerM: v } }))}
    />
    <Slider
      label="Cache read $/M"
      help={HELP.model.priceCacheRead}
      value={cfg.model.priceCacheReadPerM}
      min={0}
      max={20}
      step={0.05}
      fmt={fmtUsd}
      onchange={(v) => updateActive((c) => ({ ...c, model: { ...c.model, priceCacheReadPerM: v } }))}
    />
    <Slider
      label="Min cacheable tokens"
      help={HELP.model.minCacheable}
      value={cfg.model.minCacheableTokens}
      min={0}
      max={10_000}
      step={128}
      fmt={fmtTokens}
      onchange={(v) => updateActive((c) => ({ ...c, model: { ...c.model, minCacheableTokens: v } }))}
    />
  </Section>

  <Section
    title="Cache & ZDR"
    summary={cfg.zdr ? 'ZDR — cache off' : cfg.cache.enabled ? `on, ${cfg.cache.ttl}` : 'off'}
    help={HELP.cache.section}
  >
    <div class="row">
      <label>
        <input
          type="checkbox"
          checked={cfg.cache.enabled}
          onchange={(e) => updateActive((c) => ({ ...c, cache: { ...c.cache, enabled: (e.currentTarget as HTMLInputElement).checked } }))}
        /> Prompt cache enabled
      </label>
      <Help text={HELP.cache.enabled} title="Prompt cache" />
    </div>
    <label class="row">
      <span class="label-text">TTL <Help text={HELP.cache.ttl} title="Cache TTL" /></span>
      <select
        value={cfg.cache.ttl}
        disabled={!cfg.cache.enabled}
        onchange={(e) => updateActive((c) => ({ ...c, cache: { ...c.cache, ttl: (e.currentTarget as HTMLSelectElement).value as '5m' | '1h' } }))}
      >
        <option value="5m">5 minutes</option>
        <option value="1h">1 hour</option>
      </select>
    </label>
    <Slider
      label="Cache breakpoints"
      help={HELP.cache.breakpoints}
      value={cfg.cache.breakpoints}
      min={1}
      max={4}
      step={1}
      onchange={(v) => updateActive((c) => ({ ...c, cache: { ...c.cache, breakpoints: v } }))}
    />
    <div class="row">
      <label>
        <input
          type="checkbox"
          checked={cfg.zdr}
          onchange={(e) => updateActive((c) => ({ ...c, zdr: (e.currentTarget as HTMLInputElement).checked }))}
        /> Zero-Data-Retention (disables cache)
      </label>
      <Help text={HELP.zdr} title="ZDR" />
    </div>
  </Section>

  <Section
    title="Team"
    summary={`${cfg.team.users} × ${cfg.team.sessionsPerUserPerDay}/day`}
    help={HELP.team.section}
  >
    <Slider
      label="Users"
      help={HELP.team.users}
      value={cfg.team.users}
      min={1}
      max={1000}
      step={1}
      onchange={(v) => updateActive((c) => ({ ...c, team: { ...c.team, users: v } }))}
    />
    <Slider
      label="Sessions / user / day"
      help={HELP.team.sessions}
      value={cfg.team.sessionsPerUserPerDay}
      min={0.1}
      max={20}
      step={0.5}
      onchange={(v) => updateActive((c) => ({ ...c, team: { ...c.team, sessionsPerUserPerDay: v } }))}
    />
  </Section>

  <Section
    title="Coherence Index (heuristic)"
    summary={`decay@${(cfg.quality.decayStartPct * 100).toFixed(0)}%`}
    help={HELP.quality.section}
    helpTitle="Coherence Index"
  >
    <p class="small muted">
      Not an Anthropic metric — parametric sigmoid based on window-utilization.
      Models the well-documented effect that long contexts degrade response quality (see
      <a href="methodology">methodology</a>).
    </p>
    <Slider
      label="Decay starts at window %"
      help={HELP.quality.decayStart}
      value={cfg.quality.decayStartPct}
      min={0}
      max={1}
      step={0.01}
      fmt={fmtPercent}
      onchange={(v) => updateActive((c) => ({ ...c, quality: { ...c.quality, decayStartPct: v } }))}
    />
    <Slider
      label="Steepness"
      help={HELP.quality.steepness}
      value={cfg.quality.steepness}
      min={1}
      max={30}
      step={0.5}
      onchange={(v) => updateActive((c) => ({ ...c, quality: { ...c.quality, steepness: v } }))}
    />
    <Slider
      label="Floor (minimum quality)"
      help={HELP.quality.floor}
      value={cfg.quality.floor}
      min={0}
      max={1}
      step={0.01}
      fmt={fmtPercent}
      onchange={(v) => updateActive((c) => ({ ...c, quality: { ...c.quality, floor: v } }))}
    />
  </Section>

  <Section
    title="Compaction"
    summary={`trigger ${(cfg.compaction.triggerPct * 100).toFixed(0)}% (${fmtCtx(cfg.compaction.triggerPct * cfg.model.ctxWindow)} on ${MODEL_DEFAULTS[cfg.model.id].label}), keep ${(cfg.compaction.retentionFactor * 100).toFixed(0)}%`}
    help={HELP.compaction.section}
    helpTitle="Auto-compaction"
  >
    <p class="small muted">
      Compaction fires when context tokens reach this fraction of the model\'s window.
      Claude Code typically leaves ~33 k tokens of headroom for the response, so the default is ~92 %.
      The trigger is <b>relative to the model\'s window</b> — switch model and the absolute token
      count moves with it.
    </p>
    <Slider
      label="Trigger at % of window (= {fmtCtx(cfg.compaction.triggerPct * cfg.model.ctxWindow)} on {MODEL_DEFAULTS[cfg.model.id].label})"
      help={HELP.compaction.trigger}
      value={cfg.compaction.triggerPct}
      min={0.3}
      max={0.99}
      step={0.01}
      fmt={fmtPercent}
      onchange={(v) => updateActive((c) => ({ ...c, compaction: { ...c.compaction, triggerPct: v } }))}
    />
    <Slider
      label="Retention factor (% messages kept)"
      help={HELP.compaction.retention}
      value={cfg.compaction.retentionFactor}
      min={0.05}
      max={0.6}
      step={0.01}
      fmt={fmtPercent}
      onchange={(v) => updateActive((c) => ({ ...c, compaction: { ...c.compaction, retentionFactor: v } }))}
    />
    <MeanSdInput
      label="Summary output tokens"
      help={HELP.compaction.summaryOutput}
      value={cfg.compaction.summaryOutputTokens}
      minMean={500}
      maxMean={20_000}
      step={100}
      onchange={(v) => updateActive((c) => ({ ...c, compaction: { ...c.compaction, summaryOutputTokens: v } }))}
    />
    <Slider
      label="Coherence penalty per compaction"
      help={HELP.compaction.qualityPenalty}
      value={cfg.compaction.qualityPenalty}
      min={0}
      max={0.3}
      step={0.01}
      fmt={fmtPercent}
      onchange={(v) => updateActive((c) => ({ ...c, compaction: { ...c.compaction, qualityPenalty: v } }))}
    />
  </Section>

  <Section
    title="Monte Carlo"
    summary={`${cfg.mc.samples} samples, seed ${cfg.mc.seed}`}
    open={false}
    help={HELP.mc.section}
  >
    <Slider
      label="Sample size"
      help={HELP.mc.samples}
      value={cfg.mc.samples}
      min={50}
      max={2000}
      step={50}
      onchange={(v) => updateActive((c) => ({ ...c, mc: { ...c.mc, samples: v } }))}
    />
    <Slider
      label="Seed (reproducibility)"
      help={HELP.mc.seed}
      value={cfg.mc.seed}
      min={0}
      max={9999}
      step={1}
      onchange={(v) => updateActive((c) => ({ ...c, mc: { ...c.mc, seed: v } }))}
    />
  </Section>
</aside>

<style>
  .input-panel {
    border-right: 1px solid var(--border);
    background: var(--bg);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 12px;
    color: var(--fg-muted);
  }
  .row label, .label-text {
    flex: 1;
  }
  .btn-row {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.6rem;
    flex-wrap: wrap;
  }
  p {
    margin: 0 0 0.5rem 0;
  }
</style>
