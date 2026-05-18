<script lang="ts">
  import { output, dualConfig } from '$lib/state/stores.js';
  import { fmtTokens } from '$lib/ui/charts/utils.js';
</script>

<div class="meta">
  {#if $output.baseline}
    {@const b = $output.baseline.meta}
    <div class="row">
      <span class="chip baseline">Baseline</span>
      <span class="small">{b.samples} runs · {b.avgTurnsPerSession.toFixed(1)} turns · {fmtTokens(b.avgBaselineOverhead)} overhead · {b.avgActivatedMcp.toFixed(1)} MCP active · {b.avgActivatedSkills.toFixed(1)} skills active · {b.avgCompactionsPerSession.toFixed(2)} compactions/session</span>
    </div>
  {/if}
  {#if $output.variant && $dualConfig.compareEnabled}
    {@const v = $output.variant.meta}
    <div class="row">
      <span class="chip variant">Variant</span>
      <span class="small">{v.samples} runs · {v.avgTurnsPerSession.toFixed(1)} turns · {fmtTokens(v.avgBaselineOverhead)} overhead · {v.avgActivatedMcp.toFixed(1)} MCP active · {v.avgActivatedSkills.toFixed(1)} skills active · {v.avgCompactionsPerSession.toFixed(2)} compactions/session</span>
    </div>
  {/if}
  {#if $output.elapsedMs > 0}
    <span class="small dim mono">computed in {$output.elapsedMs.toFixed(0)}ms</span>
  {/if}
</div>

<style>
  .meta {
    padding: 0.4rem 0.8rem;
    border-top: 1px solid var(--border);
    background: var(--bg-elev);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .small { color: var(--fg-muted); }
</style>
