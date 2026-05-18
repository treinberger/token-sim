<script lang="ts">
  import type { Config } from '$lib/engine/types.js';
  import { fmtTokens } from './utils.js';

  type Props = {
    cfg: Config;
    label: string;
  };
  let { cfg, label }: Props = $props();

  const parts = $derived.by(() => {
    const sys = cfg.workload.systemPromptTokens;
    const repo = cfg.workload.baseContextTokens;
    const mcp = cfg.mcpServers.installed * cfg.mcpServers.avgTokensPerServer.mean;
    const skillMeta = cfg.skills.installed * cfg.skills.metadataTokensPerSkill.mean;
    const skillPrefix =
      cfg.skills.placement === 'prefix'
        ? cfg.skills.installed *
          cfg.skills.activationProbPerSession *
          cfg.skills.fullContentTokens.mean
        : 0;
    const total = sys + repo + mcp + skillMeta + skillPrefix;
    const win = cfg.model.ctxWindow;
    return {
      sys,
      repo,
      mcp,
      skillMeta,
      skillPrefix,
      total,
      win
    };
  });

  const segs = $derived([
    { key: 'sys', label: 'system prompt', value: parts.sys, color: '#5a728f' },
    { key: 'repo', label: 'repo / CLAUDE.md', value: parts.repo, color: '#7c8cad' },
    { key: 'mcp', label: 'MCP schemas', value: parts.mcp, color: '#c97cb5' },
    { key: 'meta', label: 'skill metadata', value: parts.skillMeta, color: '#7ec9b5' },
    { key: 'pfx', label: 'prefix-skill content', value: parts.skillPrefix, color: '#c9b57e' }
  ].filter((s) => s.value > 0));

  const pctOfWindow = $derived(parts.total / parts.win);
</script>

<div class="overhead">
  <div class="head">
    <span class="lbl mono small">{label} baseline overhead</span>
    <span class="total mono small">
      {fmtTokens(parts.total)} / {fmtTokens(parts.win)} ({(pctOfWindow * 100).toFixed(1)}%)
    </span>
  </div>
  <div class="bar">
    {#each segs as s}
      <div
        class="seg"
        style="background: {s.color}; flex: {s.value}"
        title="{s.label}: {fmtTokens(s.value)}"
      ></div>
    {/each}
    <div class="rest" style="flex: {Math.max(0, parts.win - parts.total)}"></div>
  </div>
  <div class="legend">
    {#each segs as s}
      <span class="legend-item">
        <span class="dot" style="background: {s.color}"></span>
        {s.label} <span class="mono">{fmtTokens(s.value)}</span>
      </span>
    {/each}
  </div>
</div>

<style>
  .overhead {
    margin-bottom: 0.5rem;
  }
  .head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.3rem;
  }
  .lbl { color: var(--fg-muted); }
  .total { color: var(--fg); }
  .bar {
    display: flex;
    height: 10px;
    background: var(--bg-elev-2);
    border-radius: 2px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .seg {
    height: 100%;
  }
  .rest { background: transparent; }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 0.8rem;
    margin-top: 0.3rem;
    font-size: 11px;
    color: var(--fg-muted);
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 1px;
  }
  .mono { font-family: var(--mono); color: var(--fg); }
</style>
